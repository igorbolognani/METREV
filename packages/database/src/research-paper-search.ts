import {
  searchResearchPapersResponseSchema,
  type ResearchPaperMetadata,
  type ResearchPaperSearchResult,
  type ResearchSearchProvider,
  type SearchResearchPapersRequest,
  type SearchResearchPapersResponse,
  type StageResearchPapersRequest,
} from '@metrev/domain-contracts';

import type { Prisma, PrismaClient } from '../generated/prisma/client';

const defaultSearchProviders: ResearchSearchProvider[] = [
  'openalex',
  'crossref',
  'europe_pmc',
];

function normalizeWhitespace(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function stripMarkup(value: string | null | undefined): string | null {
  const normalized = normalizeWhitespace(value);
  return normalized
    ? normalized
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : null;
}

function toAccessStatus(
  value: string | null | undefined,
): ResearchPaperSearchResult['access_status'] {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'gold':
      return 'gold';
    case 'green':
      return 'green';
    case 'hybrid':
      return 'hybrid';
    case 'bronze':
      return 'bronze';
    case 'closed':
      return 'closed';
    default:
      return 'unknown';
  }
}

function normalizeDoi(value: string | null | undefined): string | null {
  const normalized = normalizeWhitespace(value);
  return normalized ? normalized.replace(/^https?:\/\/doi\.org\//i, '') : null;
}

function normalizeSourceUrl(value: string | null | undefined): string | null {
  const normalized = normalizeWhitespace(value);
  return normalized ? normalized.replace(/\/+$/, '') : null;
}

function normalizeResearchTitle(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeWhitespace(value);
  return normalized
    ? normalized
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
    : null;
}

function toYear(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const match = value.match(/\b(19|20)\d{2}\b/);
    if (match) {
      return Number.parseInt(match[0], 10);
    }
  }

  return null;
}

function toCitationCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;
}

function authorListFromString(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/;|,/)
    .map((entry) => normalizeWhitespace(entry))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 20)
    .map((name) => ({ name }));
}

function toPaperMetadata(input: {
  sourceDocumentId: string;
  result: ResearchPaperSearchResult;
}): ResearchPaperMetadata {
  return {
    paper_id: `staged:${input.sourceDocumentId}`,
    source_document_id: input.sourceDocumentId,
    title: input.result.title,
    authors: input.result.authors,
    year: input.result.year,
    doi: input.result.doi,
    journal: input.result.journal,
    publisher: input.result.publisher,
    source_type: input.result.source_type,
    source_url: input.result.source_url,
    pdf_url: input.result.pdf_url,
    xml_url: input.result.xml_url,
    abstract_text: input.result.abstract_text,
    citation_count: input.result.citation_count,
    metadata: input.result.metadata,
  };
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mapProviderToDatabaseSourceType(
  provider: ResearchSearchProvider,
): 'OPENALEX' | 'CROSSREF' | 'EUROPE_PMC' {
  switch (provider) {
    case 'crossref':
      return 'CROSSREF';
    case 'europe_pmc':
      return 'EUROPE_PMC';
    default:
      return 'OPENALEX';
  }
}

function mapAccessStatusToDatabase(
  accessStatus: ResearchPaperSearchResult['access_status'],
): 'GOLD' | 'GREEN' | 'HYBRID' | 'BRONZE' | 'CLOSED' | 'UNKNOWN' {
  switch (accessStatus) {
    case 'gold':
      return 'GOLD';
    case 'green':
      return 'GREEN';
    case 'hybrid':
      return 'HYBRID';
    case 'bronze':
      return 'BRONZE';
    case 'closed':
      return 'CLOSED';
    default:
      return 'UNKNOWN';
  }
}

function buildResearchIdentityAliases(
  item: Pick<
    ResearchPaperSearchResult,
    'doi' | 'source_key' | 'source_type' | 'source_url' | 'title' | 'year'
  >,
): string[] {
  const aliases = [] as string[];
  const normalizedDoi = normalizeDoi(item.doi);
  const normalizedSourceUrl = normalizeSourceUrl(item.source_url);
  const normalizedTitle = normalizeResearchTitle(item.title);

  if (normalizedDoi) {
    aliases.push(`doi:${normalizedDoi.toLowerCase()}`);
  }

  if (normalizedSourceUrl) {
    aliases.push(`url:${normalizedSourceUrl.toLowerCase()}`);
  }

  aliases.push(`provider:${item.source_type}:${item.source_key}`);

  if (normalizedTitle && item.year) {
    aliases.push(`title-year:${normalizedTitle}:${item.year}`);
  } else if (normalizedTitle) {
    aliases.push(`title:${normalizedTitle}`);
  }

  return aliases;
}

export function dedupeResearchPaperItems(
  items: ResearchPaperSearchResult[],
): ResearchPaperSearchResult[] {
  const aliases = new Map<string, ResearchPaperSearchResult>();
  const unique: ResearchPaperSearchResult[] = [];

  for (const item of items) {
    const identityAliases = buildResearchIdentityAliases(item);

    if (identityAliases.some((alias) => aliases.has(alias))) {
      continue;
    }

    unique.push(item);

    for (const alias of identityAliases) {
      aliases.set(alias, item);
    }
  }

  return unique;
}

function dedupeAndSortResults(
  items: ResearchPaperSearchResult[],
  limit: number,
): ResearchPaperSearchResult[] {
  return dedupeResearchPaperItems(items)
    .sort(
      (left, right) =>
        (right.citation_count ?? -1) - (left.citation_count ?? -1) ||
        (right.year ?? -1) - (left.year ?? -1) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, limit);
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Request failed with status ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    );
  }

  return response.json();
}

async function searchOpenAlex(
  query: string,
  limit: number,
  page: number,
): Promise<ResearchPaperSearchResult[]> {
  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('search', query);
  url.searchParams.set('per-page', String(limit));
  url.searchParams.set('page', String(page));

  const mailto = process.env.OPENALEX_MAILTO?.trim();
  if (mailto) {
    url.searchParams.set('mailto', mailto);
  }

  const payload = (await fetchJson(url)) as {
    results?: Array<Record<string, unknown>>;
  };

  return (payload.results ?? [])
    .map((work) => {
      const id = normalizeWhitespace(work.id as string | null | undefined);
      const title = normalizeWhitespace(
        work.display_name as string | null | undefined,
      );

      if (!id || !title) {
        return null;
      }

      const authors = Array.isArray(work.authorships)
        ? work.authorships
            .map((entry) => {
              const author = (entry as { author?: { display_name?: string } })
                .author;
              const name = normalizeWhitespace(author?.display_name);
              return name ? { name } : null;
            })
            .filter((entry): entry is { name: string } => Boolean(entry))
        : [];

      const normalized: ResearchPaperSearchResult = {
        source_type: 'openalex' as const,
        source_key: id,
        title,
        authors,
        year: toYear(work.publication_year as number | null | undefined),
        doi: normalizeDoi(work.doi as string | null | undefined),
        journal: normalizeWhitespace(
          (
            work.primary_location as {
              source?: { display_name?: string };
            } | null
          )?.source?.display_name,
        ),
        publisher: normalizeWhitespace(
          (
            work.primary_location as {
              source?: { host_organization_name?: string };
            } | null
          )?.source?.host_organization_name,
        ),
        source_url:
          normalizeWhitespace(
            (work.primary_location as { landing_page_url?: string } | null)
              ?.landing_page_url,
          ) ?? id,
        pdf_url: normalizeWhitespace(
          (work.primary_location as { pdf_url?: string } | null)?.pdf_url,
        ),
        xml_url: null,
        abstract_text: normalizeWhitespace(
          Object.keys(
            (work.abstract_inverted_index as Record<string, number[]> | null) ??
              {},
          ).length > 0
            ? Object.entries(
                work.abstract_inverted_index as Record<string, number[]>,
              )
                .flatMap(([token, positions]) =>
                  positions.map((position) => ({ position, token })),
                )
                .sort((left, right) => left.position - right.position)
                .map((entry) => entry.token)
                .join(' ')
            : null,
        ),
        citation_count: toCitationCount(work.cited_by_count),
        access_status: toAccessStatus(
          (work.open_access as { oa_status?: string } | null)?.oa_status,
        ),
        metadata: {
          openalex_id: id,
          primary_topic: normalizeWhitespace(
            (work.primary_topic as { display_name?: string } | null)
              ?.display_name,
          ),
        },
      };

      return normalized;
    })
    .filter(isPresent);
}

async function searchCrossref(
  query: string,
  limit: number,
  page: number,
): Promise<ResearchPaperSearchResult[]> {
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query.bibliographic', query);
  url.searchParams.set('rows', String(limit));
  url.searchParams.set('offset', String((page - 1) * limit));

  const mailto = process.env.CROSSREF_MAILTO?.trim();
  if (mailto) {
    url.searchParams.set('mailto', mailto);
  }

  const payload = (await fetchJson(url)) as {
    message?: { items?: Array<Record<string, unknown>> };
  };

  return (payload.message?.items ?? [])
    .map((work) => {
      const title = Array.isArray(work.title)
        ? normalizeWhitespace(work.title[0] as string | null | undefined)
        : null;
      const sourceKey =
        normalizeWhitespace(work.DOI as string | null | undefined) ??
        normalizeWhitespace(work.URL as string | null | undefined);

      if (!title || !sourceKey) {
        return null;
      }

      const authors = Array.isArray(work.author)
        ? work.author
            .map((author) => {
              const name = normalizeWhitespace(
                `${(author as { given?: string }).given ?? ''} ${(author as { family?: string }).family ?? ''}`,
              );
              return name ? { name } : null;
            })
            .filter((entry): entry is { name: string } => Boolean(entry))
        : [];

      const normalized: ResearchPaperSearchResult = {
        source_type: 'crossref' as const,
        source_key: sourceKey,
        title,
        authors,
        year: toYear(
          Array.isArray(
            (work.issued as { 'date-parts'?: unknown[] } | null)?.[
              'date-parts'
            ],
          )
            ? ((
                work.issued as { 'date-parts'?: Array<Array<number>> } | null
              )?.['date-parts']?.[0]?.[0] ?? null)
            : null,
        ),
        doi: normalizeDoi(work.DOI as string | null | undefined),
        journal: Array.isArray(work['container-title'])
          ? normalizeWhitespace(
              work['container-title'][0] as string | null | undefined,
            )
          : null,
        publisher: normalizeWhitespace(
          work.publisher as string | null | undefined,
        ),
        source_url: normalizeWhitespace(work.URL as string | null | undefined),
        pdf_url: null,
        xml_url: null,
        abstract_text: stripMarkup(work.abstract as string | null | undefined),
        citation_count:
          toCitationCount(work['is-referenced-by-count']) ??
          toCitationCount(work.referencesCount),
        access_status:
          Array.isArray(work.license) && work.license.length > 0
            ? 'hybrid'
            : 'unknown',
        metadata: {
          crossref_type: normalizeWhitespace(
            work.type as string | null | undefined,
          ),
        },
      };

      return normalized;
    })
    .filter(isPresent);
}

async function searchEuropePmc(
  query: string,
  limit: number,
  page: number,
): Promise<ResearchPaperSearchResult[]> {
  const url = new URL(
    'https://www.ebi.ac.uk/europepmc/webservices/rest/search',
  );
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', String(limit));
  url.searchParams.set('page', String(page));
  url.searchParams.set('format', 'json');
  url.searchParams.set('resultType', 'core');

  const payload = (await fetchJson(url)) as {
    resultList?: { result?: Array<Record<string, unknown>> };
  };

  return (payload.resultList?.result ?? [])
    .map((work) => {
      const title = normalizeWhitespace(
        work.title as string | null | undefined,
      );
      const source = normalizeWhitespace(
        work.source as string | null | undefined,
      );
      const id = normalizeWhitespace(work.id as string | null | undefined);
      const sourceKey = source && id ? `${source}:${id}` : id;

      if (!title || !sourceKey) {
        return null;
      }

      const normalized: ResearchPaperSearchResult = {
        source_type: 'europe_pmc' as const,
        source_key: sourceKey,
        title,
        authors: authorListFromString(
          work.authorString as string | null | undefined,
        ),
        year: toYear(work.pubYear as string | number | null | undefined),
        doi: normalizeDoi(work.doi as string | null | undefined),
        journal: normalizeWhitespace(
          work.journalTitle as string | null | undefined,
        ),
        publisher: source,
        source_url:
          normalizeWhitespace(work.fullTextUrl as string | null | undefined) ??
          normalizeWhitespace(work.authority as string | null | undefined),
        pdf_url: normalizeWhitespace(work.pdfUrl as string | null | undefined),
        xml_url: normalizeWhitespace(
          work.fullTextXmlUrl as string | null | undefined,
        ),
        abstract_text: normalizeWhitespace(
          work.abstractText as string | null | undefined,
        ),
        citation_count: toCitationCount(work.citedByCount),
        access_status:
          String(work.isOpenAccess ?? '').toLowerCase() === 'y'
            ? 'green'
            : 'unknown',
        metadata: {
          europe_pmc_source: source,
          pmid: normalizeWhitespace(work.pmid as string | null | undefined),
          pmcid: normalizeWhitespace(work.pmcid as string | null | undefined),
        },
      };

      return normalized;
    })
    .filter(isPresent);
}

const providerSearchers: Record<
  ResearchSearchProvider,
  (
    query: string,
    limit: number,
    page: number,
  ) => Promise<ResearchPaperSearchResult[]>
> = {
  openalex: searchOpenAlex,
  crossref: searchCrossref,
  europe_pmc: searchEuropePmc,
};

export async function searchResearchPapers(
  input: SearchResearchPapersRequest,
): Promise<SearchResearchPapersResponse> {
  const providers = input.providers?.length
    ? input.providers
    : defaultSearchProviders;

  const settled = await Promise.all(
    providers.map(async (provider) => {
      try {
        return {
          provider,
          items: await providerSearchers[provider](
            input.query,
            input.limit,
            input.page,
          ),
          failure: null,
        } as const;
      } catch (error) {
        return {
          provider,
          items: [],
          failure:
            error instanceof Error ? error.message : 'Unknown provider failure',
        } as const;
      }
    }),
  );

  return searchResearchPapersResponseSchema.parse({
    query: input.query,
    providers,
    items: dedupeAndSortResults(
      settled.flatMap((entry) => entry.items),
      input.limit,
    ),
    failed_providers: settled.flatMap((entry) =>
      entry.failure
        ? [
            {
              provider: entry.provider,
              message: entry.failure,
            },
          ]
        : [],
    ),
  });
}

function buildCatalogSummary(item: ResearchPaperSearchResult): string {
  return (
    item.abstract_text ??
    `Imported from ${item.source_type.replace(/_/g, ' ')} live research search.`
  );
}

function buildCatalogTags(item: ResearchPaperSearchResult): string[] {
  const metadataTags = Array.isArray(item.metadata.tags)
    ? item.metadata.tags.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];

  return [...new Set(['research-search', item.source_type, ...metadataTags])];
}

function resolveCatalogReviewStatus(
  existingStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null,
): 'PENDING' | 'ACCEPTED' | 'REJECTED' {
  if (existingStatus && existingStatus !== 'PENDING') {
    return existingStatus;
  }

  return 'PENDING';
}

function resolveCatalogSourceState(
  existingState: 'RAW' | 'PARSED' | 'NORMALIZED' | 'REVIEWED' | null,
): 'NORMALIZED' | 'REVIEWED' {
  return existingState === 'REVIEWED' ? 'REVIEWED' : 'NORMALIZED';
}

function toSourcePayload(
  item: ResearchPaperSearchResult,
  existingPayload: unknown,
) {
  const basePayload: Record<string, unknown> & { identity_aliases?: unknown } =
    isRecord(existingPayload) ? { ...existingPayload } : {};
  const existingAliases = Array.isArray(basePayload.identity_aliases)
    ? basePayload.identity_aliases.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];

  return {
    ...basePayload,
    ...item.metadata,
    identity_aliases: [
      ...new Set([...existingAliases, ...buildResearchIdentityAliases(item)]),
    ],
  };
}

async function findExistingSourceRecord(
  prisma: Prisma.TransactionClient,
  item: ResearchPaperSearchResult,
) {
  const normalizedDoi = normalizeDoi(item.doi);
  if (normalizedDoi) {
    const byDoi = await prisma.externalSourceRecord.findFirst({
      where: {
        doi: {
          equals: normalizedDoi,
          mode: 'insensitive',
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        rawPayload: true,
        sourceKey: true,
        sourceType: true,
      },
    });

    if (byDoi) {
      return byDoi;
    }
  }

  const normalizedUrl = normalizeSourceUrl(item.source_url);
  if (normalizedUrl) {
    const byUrl = await prisma.externalSourceRecord.findFirst({
      where: {
        sourceUrl: {
          equals: normalizedUrl,
          mode: 'insensitive',
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        rawPayload: true,
        sourceKey: true,
        sourceType: true,
      },
    });

    if (byUrl) {
      return byUrl;
    }
  }

  return prisma.externalSourceRecord.findUnique({
    where: {
      sourceType_sourceKey: {
        sourceType: mapProviderToDatabaseSourceType(item.source_type),
        sourceKey: item.source_key,
      },
    },
    select: {
      id: true,
      rawPayload: true,
      sourceKey: true,
      sourceType: true,
    },
  });
}

export async function stageResearchPapers(
  prisma: PrismaClient,
  input: StageResearchPapersRequest,
): Promise<{ papers: ResearchPaperMetadata[]; sourceDocumentIds: string[] }> {
  const papers: ResearchPaperMetadata[] = [];
  const sourceDocumentIds: string[] = [];
  const uniqueItems = dedupeResearchPaperItems(input.items);

  for (const item of uniqueItems) {
    const sourceRecord = await prisma.$transaction(async (transaction) => {
      const existing = await findExistingSourceRecord(transaction, item);
      const data = {
        sourceUrl: normalizeSourceUrl(item.source_url),
        title: item.title,
        sourceCategory: 'scholarly_work' as const,
        doi: normalizeDoi(item.doi),
        publisher: item.publisher,
        journal: item.journal,
        authors: item.authors,
        accessStatus: mapAccessStatusToDatabase(item.access_status),
        pdfUrl: item.pdf_url,
        xmlUrl: item.xml_url,
        abstractText: item.abstract_text,
        rawPayload: toSourcePayload(item, existing?.rawPayload),
        publishedAt: item.year ? new Date(Date.UTC(item.year, 0, 1)) : null,
        asOf: new Date(),
      };

      const record = existing
        ? await transaction.externalSourceRecord.update({
            where: { id: existing.id },
            data,
          })
        : await transaction.externalSourceRecord.create({
            data: {
              ...data,
              sourceType: mapProviderToDatabaseSourceType(item.source_type),
              sourceKey: item.source_key,
            },
          });

      const catalogKey = {
        sourceRecordId_evidenceType_title: {
          sourceRecordId: record.id,
          evidenceType: 'literature_evidence',
          title: item.title,
        },
      };

      const existingCatalogItem =
        await transaction.externalEvidenceCatalogItem.findUnique({
          where: catalogKey,
          select: { reviewStatus: true, sourceState: true },
        });

      await transaction.externalEvidenceCatalogItem.upsert({
        where: catalogKey,
        update: {
          title: item.title,
          summary: buildCatalogSummary(item),
          strengthLevel: 'moderate',
          provenanceNote: input.query
            ? `Imported from ${item.source_type} live research search for query "${input.query}".`
            : `Imported from ${item.source_type} live research search.`,
          reviewStatus: resolveCatalogReviewStatus(
            existingCatalogItem?.reviewStatus ?? null,
          ),
          sourceState: resolveCatalogSourceState(
            existingCatalogItem?.sourceState ?? null,
          ),
          applicabilityScope: {},
          extractedClaims: [],
          tags: buildCatalogTags(item),
          payload: {
            imported_via: 'research_live_search',
            citation_count: item.citation_count,
            query: input.query ?? null,
            source_type: item.source_type,
            metadata: item.metadata,
          },
        },
        create: {
          sourceRecordId: record.id,
          evidenceType: 'literature_evidence',
          title: item.title,
          summary: buildCatalogSummary(item),
          strengthLevel: 'moderate',
          provenanceNote: input.query
            ? `Imported from ${item.source_type} live research search for query "${input.query}".`
            : `Imported from ${item.source_type} live research search.`,
          reviewStatus: 'PENDING',
          sourceState: 'NORMALIZED',
          claimCount: 0,
          applicabilityScope: {},
          extractedClaims: [],
          tags: buildCatalogTags(item),
          payload: {
            imported_via: 'research_live_search',
            citation_count: item.citation_count,
            query: input.query ?? null,
            source_type: item.source_type,
            metadata: item.metadata,
          },
        },
      });

      return record;
    });

    sourceDocumentIds.push(sourceRecord.id);
    papers.push(
      toPaperMetadata({
        sourceDocumentId: sourceRecord.id,
        result: item,
      }),
    );
  }

  return {
    papers,
    sourceDocumentIds,
  };
}
