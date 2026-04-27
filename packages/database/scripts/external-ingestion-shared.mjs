import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLAIM_EXTRACTOR_VERSION = 'heuristic-v1';
const MANIFEST_EXTRACTOR_VERSION = 'manifest-v1';
const CLAIM_SENTENCE_LIMIT = 6;
const METRIC_VALUE_PATTERN =
  /\b(\d+(?:\.\d+)?)\s?(mW\/m2|W\/m2|A\/m2|mA\/cm2|mA\/g|V|mV|%|mg\/L|g\/L|mg\/g|g\/m2|kWh\/m3|kWh|ohm|ohms|days?|hours?|USD\/kg|USD|EUR)\b/i;
const CONDITION_KEYWORDS = [
  'pH',
  'temperature',
  'voltage',
  'current density',
  'retention time',
  'flow rate',
  'hydraulic retention time',
  'loading rate',
  'resistance',
];
const MATERIAL_KEYWORDS = [
  'graphite',
  'carbon felt',
  'carbon cloth',
  'activated carbon',
  'membrane',
  'catalyst',
  'electrode',
  'biofilm',
  'stainless steel',
  'nafion',
  'ion exchange',
];
const ARCHITECTURE_KEYWORDS = [
  'anode',
  'cathode',
  'reactor',
  'stack',
  'single-chamber',
  'two-chamber',
  'module',
  'configuration',
  'microbial fuel cell',
  'microbial electrolysis cell',
  'bioelectrochemical system',
  'desalination cell',
];
const LIMITATION_KEYWORDS = [
  'limitation',
  'challenge',
  'however',
  'fouling',
  'toxicity',
  'inhibition',
  'decreased',
  'decline',
  'constraint',
  'bottleneck',
];
const APPLICABILITY_KEYWORDS = [
  'wastewater',
  'industrial effluent',
  'municipal',
  'leachate',
  'sludge',
  'urine',
  'pilot',
  'scale-up',
  'nutrient recovery',
  'waste stream',
];
const ECONOMIC_KEYWORDS = [
  'cost',
  'economic',
  'opex',
  'capex',
  'price',
  'commercial',
  'market',
  'payback',
  'procurement',
];

function normalizeWhitespace(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function truncateText(value, maxLength = 480) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function normalizeIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeDateParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const [year, month = 1, day = 1] = parts;
  if (!year) {
    return null;
  }

  return normalizeIsoTimestamp(
    new Date(Date.UTC(year, Math.max(month - 1, 0), day)).toISOString(),
  );
}

function stripMarkup(value) {
  if (typeof value !== 'string') {
    return null;
  }

  return (
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}
function nonEmptyString(value) {
  const normalized = normalizeWhitespace(value);
  return normalized ? normalized : null;
}

function normalizeEnumValue(value, fallback) {
  const normalized = nonEmptyString(value)
    ?.replace(/[-\s]+/g, '_')
    .toUpperCase();
  return normalized ?? fallback;
}

function normalizeAccessStatus(value, fallback = 'UNKNOWN') {
  const normalized = normalizeEnumValue(value, fallback);
  if (
    normalized === 'GOLD' ||
    normalized === 'GREEN' ||
    normalized === 'HYBRID' ||
    normalized === 'BRONZE' ||
    normalized === 'CLOSED' ||
    normalized === 'UNKNOWN'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeReviewStatus(value, fallback = 'PENDING') {
  const normalized = normalizeEnumValue(value, fallback);
  if (
    normalized === 'PENDING' ||
    normalized === 'ACCEPTED' ||
    normalized === 'REJECTED'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeExtractionMethod(value, fallback = 'REGEX') {
  const normalized = normalizeEnumValue(value, fallback);
  if (
    normalized === 'MANUAL' ||
    normalized === 'LLM' ||
    normalized === 'REGEX' ||
    normalized === 'ML' ||
    normalized === 'IMPORT_RULE'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeClaimType(value, fallback = 'OTHER') {
  const normalized = normalizeEnumValue(value, fallback);
  if (
    normalized === 'METRIC' ||
    normalized === 'MATERIAL' ||
    normalized === 'ARCHITECTURE' ||
    normalized === 'CONDITION' ||
    normalized === 'LIMITATION' ||
    normalized === 'APPLICABILITY' ||
    normalized === 'ECONOMIC' ||
    normalized === 'SUPPLIER_CLAIM' ||
    normalized === 'MARKET_SIGNAL' ||
    normalized === 'OTHER'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeSourceType(value, fallback = 'CURATED_MANIFEST') {
  const normalized = normalizeEnumValue(value, fallback);
  if (
    normalized === 'OPENALEX' ||
    normalized === 'CROSSREF' ||
    normalized === 'EUROPE_PMC' ||
    normalized === 'SUPPLIER_PROFILE' ||
    normalized === 'MARKET_SNAPSHOT' ||
    normalized === 'CURATED_MANIFEST' ||
    normalized === 'MANUAL'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeSupplierDocumentType(value, fallback = 'OTHER') {
  const normalized = normalizeEnumValue(value, fallback);
  if (
    normalized === 'PROFILE' ||
    normalized === 'DATASHEET' ||
    normalized === 'SPECIFICATION' ||
    normalized === 'CERTIFICATE' ||
    normalized === 'MARKET_BRIEF' ||
    normalized === 'CASE_STUDY' ||
    normalized === 'PATENT_FILING' ||
    normalized === 'REPORT' ||
    normalized === 'OTHER'
  ) {
    return normalized;
  }

  return fallback;
}

function deduplicateStrings(values) {
  return Array.from(
    new Set(values.map((value) => nonEmptyString(value)).filter(Boolean)),
  );
}

function defaultEvidenceTypeForSource(sourceType) {
  switch (sourceType) {
    case 'SUPPLIER_PROFILE':
      return 'supplier_claim';
    case 'MARKET_SNAPSHOT':
      return 'derived_heuristic';
    default:
      return 'literature_evidence';
  }
}

function normalizeEvidenceType(value, sourceType) {
  const normalized = nonEmptyString(value)?.toLowerCase();

  switch (normalized) {
    case 'literature_evidence':
    case 'internal_benchmark':
    case 'supplier_claim':
    case 'engineering_assumption':
    case 'derived_heuristic':
      return normalized;
    case 'curated_evidence':
      return 'literature_evidence';
    case 'market_signal':
      return sourceType === 'SUPPLIER_PROFILE'
        ? 'supplier_claim'
        : 'derived_heuristic';
    default:
      return defaultEvidenceTypeForSource(sourceType);
  }
}
function normalizeAuthorList(authors) {
  if (!Array.isArray(authors)) {
    return null;
  }

  const normalizedAuthors = authors
    .map((author) => {
      if (typeof author === 'string') {
        const name = nonEmptyString(author);
        return name ? { name } : null;
      }

      if (!author || typeof author !== 'object') {
        return null;
      }

      const name =
        nonEmptyString(author.name) ??
        nonEmptyString(author.display_name) ??
        nonEmptyString(
          [author.given, author.family].filter(Boolean).join(' '),
        ) ??
        nonEmptyString(author.fullName);

      if (!name) {
        return null;
      }

      const normalized = { name };
      const orcid = nonEmptyString(author.orcid ?? author.ORCID);
      if (orcid) {
        normalized.orcid = orcid.replace(/^https?:\/\/orcid\.org\//i, '');
      }

      return normalized;
    })
    .filter(Boolean);

  return normalizedAuthors.length > 0 ? normalizedAuthors : null;
}

function splitIntoSentences(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => truncateText(sentence, 560))
    .filter((sentence) => sentence.length >= 24);
}

function containsKeyword(text, keywords) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function extractMetricDetails(text) {
  const match = text.match(METRIC_VALUE_PATTERN);
  if (!match) {
    return {
      extractedValue: null,
      unit: null,
    };
  }

  return {
    extractedValue: match[1],
    unit: match[2],
  };
}

function inferClaimType(text, sourceType) {
  const normalized = text.toLowerCase();

  if (
    sourceType === 'SUPPLIER_PROFILE' ||
    sourceType === 'CURATED_MANIFEST' ||
    sourceType === 'MANUAL'
  ) {
    if (
      containsKeyword(normalized, [
        'supplier',
        'vendor',
        'commercial',
        'portfolio',
      ])
    ) {
      return 'SUPPLIER_CLAIM';
    }
  }

  if (sourceType === 'MARKET_SNAPSHOT') {
    return 'MARKET_SIGNAL';
  }

  if (containsKeyword(normalized, ECONOMIC_KEYWORDS)) {
    return 'ECONOMIC';
  }

  if (containsKeyword(normalized, LIMITATION_KEYWORDS)) {
    return 'LIMITATION';
  }

  if (containsKeyword(normalized, APPLICABILITY_KEYWORDS)) {
    return 'APPLICABILITY';
  }

  if (METRIC_VALUE_PATTERN.test(text)) {
    return 'METRIC';
  }

  if (containsKeyword(normalized, CONDITION_KEYWORDS)) {
    return 'CONDITION';
  }

  if (containsKeyword(normalized, ARCHITECTURE_KEYWORDS)) {
    return 'ARCHITECTURE';
  }

  if (containsKeyword(normalized, MATERIAL_KEYWORDS)) {
    return 'MATERIAL';
  }

  return 'OTHER';
}

function inferClaimConfidence(text, claimType, sourceType) {
  let confidence = 0.55;

  if (claimType === 'METRIC' || claimType === 'CONDITION') {
    confidence += 0.1;
  }

  if (claimType === 'SUPPLIER_CLAIM' || claimType === 'MARKET_SIGNAL') {
    confidence += 0.05;
  }

  if (sourceType === 'CURATED_MANIFEST' || sourceType === 'SUPPLIER_PROFILE') {
    confidence += 0.05;
  }

  if (text.length > 120) {
    confidence += 0.05;
  }

  return Math.min(0.95, Number(confidence.toFixed(2)));
}

function inferOntologyMappings(text, claimType) {
  const normalized = text.toLowerCase();
  const mappings = [];

  if (normalized.includes('wastewater')) {
    mappings.push('/application/wastewater-treatment');
  }
  if (normalized.includes('microbial fuel cell')) {
    mappings.push('/architecture/microbial-fuel-cell');
  }
  if (normalized.includes('microbial electrolysis cell')) {
    mappings.push('/architecture/microbial-electrolysis-cell');
  }
  if (normalized.includes('bioelectrochemical system')) {
    mappings.push('/architecture/bioelectrochemical-system');
  }
  if (normalized.includes('carbon felt')) {
    mappings.push('/materials/carbon-felt');
  }
  if (normalized.includes('membrane')) {
    mappings.push('/materials/membrane');
  }
  if (claimType === 'ECONOMIC' || normalized.includes('market')) {
    mappings.push('/economics/commercial-readiness');
  }
  if (claimType === 'LIMITATION') {
    mappings.push('/risk/operational-limitation');
  }

  return deduplicateStrings(mappings).map((ontologyPath) => ({
    ontologyPath,
    mappingConfidence: 0.6,
    mappedBy: 'IMPORT_RULE',
  }));
}

function normalizeExplicitClaim(claim, sourceType, fallbackLocator) {
  if (!claim || typeof claim !== 'object') {
    return null;
  }

  const content = nonEmptyString(claim.content ?? claim.text);
  if (!content) {
    return null;
  }

  const claimType = normalizeClaimType(
    claim.claimType,
    inferClaimType(content, sourceType),
  );
  const metric = extractMetricDetails(content);
  const extractorVersion = nonEmptyString(claim.extractorVersion)
    ? claim.extractorVersion
    : sourceType === 'CURATED_MANIFEST' || sourceType === 'SUPPLIER_PROFILE'
      ? MANIFEST_EXTRACTOR_VERSION
      : CLAIM_EXTRACTOR_VERSION;

  return {
    claimType,
    content,
    extractedValue:
      nonEmptyString(claim.extractedValue) ?? metric.extractedValue,
    unit: nonEmptyString(claim.unit) ?? metric.unit,
    confidence:
      typeof claim.confidence === 'number'
        ? Number(claim.confidence.toFixed(2))
        : inferClaimConfidence(content, claimType, sourceType),
    extractionMethod: normalizeExtractionMethod(
      claim.extractionMethod,
      sourceType === 'CURATED_MANIFEST' || sourceType === 'SUPPLIER_PROFILE'
        ? 'IMPORT_RULE'
        : 'REGEX',
    ),
    extractorVersion,
    sourceSnippet: truncateText(claim.sourceSnippet ?? content, 560),
    sourceLocator:
      nonEmptyString(claim.sourceLocator) ??
      (fallbackLocator ? `${fallbackLocator}` : null),
    pageNumber:
      typeof claim.pageNumber === 'number' && Number.isFinite(claim.pageNumber)
        ? claim.pageNumber
        : null,
    metadata: claim.metadata ?? {},
    ontologyMappings: Array.isArray(claim.ontologyMappings)
      ? claim.ontologyMappings
          .map((mapping) => {
            if (!mapping || typeof mapping !== 'object') {
              return null;
            }

            const ontologyPath = nonEmptyString(mapping.ontologyPath);
            if (!ontologyPath) {
              return null;
            }

            return {
              ontologyPath,
              mappingConfidence:
                typeof mapping.mappingConfidence === 'number'
                  ? Number(mapping.mappingConfidence.toFixed(2))
                  : 0.6,
              mappedBy: normalizeEnumValue(mapping.mappedBy, 'IMPORT_RULE'),
              note: nonEmptyString(mapping.note),
            };
          })
          .filter(Boolean)
      : inferOntologyMappings(content, claimType),
    review:
      claim.reviewStatus || claim.analystNote
        ? {
            status: normalizeReviewStatus(claim.reviewStatus, 'PENDING'),
            analystId: nonEmptyString(claim.analystId),
            analystRole: nonEmptyString(claim.analystRole),
            analystNote: nonEmptyString(claim.analystNote),
          }
        : null,
  };
}

export function extractClaimCandidates({
  title,
  abstractText,
  sourceType,
  importQuery,
  explicitClaims,
}) {
  if (Array.isArray(explicitClaims) && explicitClaims.length > 0) {
    return explicitClaims
      .map((claim, index) =>
        normalizeExplicitClaim(claim, sourceType, `claim:${index + 1}`),
      )
      .filter(Boolean);
  }

  const baseText = nonEmptyString(abstractText) ?? nonEmptyString(title);
  if (!baseText) {
    return [];
  }

  const claims = [];
  const sentences = splitIntoSentences(baseText).slice(0, CLAIM_SENTENCE_LIMIT);

  for (const [index, sentence] of sentences.entries()) {
    const claimType = inferClaimType(sentence, sourceType);
    const metric = extractMetricDetails(sentence);
    claims.push({
      claimType,
      content: sentence,
      extractedValue: metric.extractedValue,
      unit: metric.unit,
      confidence: inferClaimConfidence(sentence, claimType, sourceType),
      extractionMethod: 'REGEX',
      extractorVersion: CLAIM_EXTRACTOR_VERSION,
      sourceSnippet: truncateText(sentence, 560),
      sourceLocator: `abstract:${index + 1}`,
      pageNumber: null,
      metadata: importQuery ? { import_query: importQuery } : {},
      ontologyMappings: inferOntologyMappings(sentence, claimType),
      review: null,
    });
  }

  return claims;
}

function createHashDedup(parts) {
  const normalized = parts
    .map((part) => nonEmptyString(part))
    .filter(Boolean)
    .join('|');
  if (!normalized) {
    return null;
  }

  return createHash('sha256').update(normalized).digest('hex');
}

export function expandOpenAlexAbstract(abstractInvertedIndex) {
  if (
    !abstractInvertedIndex ||
    typeof abstractInvertedIndex !== 'object' ||
    Array.isArray(abstractInvertedIndex)
  ) {
    return null;
  }

  const positionedWords = [];

  for (const [word, positions] of Object.entries(abstractInvertedIndex)) {
    if (!Array.isArray(positions)) {
      continue;
    }

    for (const position of positions) {
      if (typeof position === 'number') {
        positionedWords.push([position, word]);
      }
    }
  }

  if (positionedWords.length === 0) {
    return null;
  }

  return positionedWords
    .sort((left, right) => left[0] - right[0])
    .map(([, word]) => word)
    .join(' ');
}

function buildCatalogEntry({
  sourceType,
  sourceKey,
  sourceUrl,
  title,
  sourceCategory,
  doi,
  publisher,
  journal,
  authors,
  language,
  license,
  accessStatus,
  publishedAt,
  asOf,
  pdfUrl,
  xmlUrl,
  abstractText,
  rawPayload,
  importQuery,
  summary,
  evidenceType = 'literature_evidence',
  strengthLevel = 'moderate',
  provenanceNote,
  reviewStatus = 'PENDING',
  sourceState = 'PARSED',
  applicabilityScope,
  tags,
  payload,
  explicitClaims,
  supplierDocuments = [],
}) {
  if (!sourceKey || !title) {
    return null;
  }

  const normalizedSourceType = normalizeSourceType(
    sourceType,
    'CURATED_MANIFEST',
  );
  const normalizedTags = deduplicateStrings([
    'external-ingestion',
    evidenceType,
    normalizedSourceType.toLowerCase(),
    ...(Array.isArray(tags) ? tags : []),
  ]);
  const normalizedSummary = truncateText(
    summary ??
      abstractText ??
      `${title} imported for review from ${normalizedSourceType} metadata.`,
    560,
  );
  const claims = extractClaimCandidates({
    title,
    abstractText,
    sourceType: normalizedSourceType,
    importQuery,
    explicitClaims,
  });

  return {
    sourceRecord: {
      sourceType: normalizedSourceType,
      sourceKey,
      sourceUrl,
      title,
      sourceCategory,
      doi,
      publisher,
      journal,
      authors: normalizeAuthorList(authors),
      language: nonEmptyString(language),
      license: nonEmptyString(license),
      accessStatus: normalizeAccessStatus(accessStatus),
      publishedAt,
      asOf,
      pdfUrl: nonEmptyString(pdfUrl),
      xmlUrl: nonEmptyString(xmlUrl),
      hashDedup: createHashDedup([
        doi,
        sourceUrl,
        title,
        publishedAt,
        normalizedSourceType,
      ]),
      abstractText,
      rawPayload,
    },
    catalogItem: {
      evidenceType,
      title,
      summary: normalizedSummary,
      strengthLevel,
      provenanceNote:
        provenanceNote ??
        `Imported from ${normalizedSourceType} metadata for query "${importQuery}". Review before use in decision flows.`,
      reviewStatus: normalizeReviewStatus(reviewStatus, 'PENDING'),
      sourceState: normalizeEnumValue(sourceState, 'PARSED'),
      applicabilityScope: {
        import_query: importQuery,
        ...(applicabilityScope && typeof applicabilityScope === 'object'
          ? applicabilityScope
          : {}),
      },
      extractedClaims: claims.map((claim) => claim.content),
      tags: normalizedTags,
      payload: {
        source_url: sourceUrl,
        doi,
        publisher,
        journal,
        import_query: importQuery,
        imported_at: asOf,
        ...(payload && typeof payload === 'object' ? payload : {}),
      },
    },
    claims,
    supplierDocuments,
  };
}

function normalizeFullTextUrlList(fullTextUrlList) {
  const urls = Array.isArray(fullTextUrlList?.fullTextUrl)
    ? fullTextUrlList.fullTextUrl
    : [];

  let pdfUrl = null;
  let xmlUrl = null;

  for (const entry of urls) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const url = nonEmptyString(entry.url);
    if (!url) {
      continue;
    }

    const style = normalizeWhitespace(entry.documentStyle).toLowerCase();
    if (!pdfUrl && style.includes('pdf')) {
      pdfUrl = url;
    }
    if (!xmlUrl && style.includes('xml')) {
      xmlUrl = url;
    }
  }

  return {
    pdfUrl,
    xmlUrl,
  };
}

export function normalizeOpenAlexWork(work, importQuery, ingestedAt) {
  const sourceKey = typeof work?.id === 'string' ? work.id : null;
  const title =
    typeof work?.display_name === 'string' ? work.display_name.trim() : null;
  const sourceUrl =
    work?.primary_location?.landing_page_url ??
    (typeof work?.id === 'string' ? work.id : null);
  const doi =
    typeof work?.doi === 'string'
      ? work.doi.replace(/^https?:\/\/doi\.org\//i, '')
      : null;
  const publisher =
    work?.primary_location?.source?.host_organization_name ??
    work?.primary_location?.source?.display_name ??
    null;
  const journal =
    work?.primary_location?.source?.display_name ??
    work?.locations?.[0]?.source?.display_name ??
    null;
  const publishedAt = normalizeIsoTimestamp(work?.publication_date);
  const abstractText = expandOpenAlexAbstract(work?.abstract_inverted_index);
  const authors = Array.isArray(work?.authorships)
    ? work.authorships.map((authorship) => ({
        name:
          authorship?.author?.display_name ??
          authorship?.raw_author_name ??
          null,
        orcid: authorship?.author?.orcid ?? null,
      }))
    : null;
  const accessStatus = normalizeAccessStatus(
    work?.open_access?.oa_status,
    work?.open_access?.is_oa ? 'GREEN' : 'UNKNOWN',
  );

  return buildCatalogEntry({
    sourceType: 'OPENALEX',
    sourceKey,
    sourceUrl,
    title,
    sourceCategory: work?.type ?? 'scholarly_work',
    doi,
    publisher,
    journal,
    authors,
    language: work?.language,
    license: work?.primary_location?.license,
    accessStatus,
    publishedAt,
    asOf: ingestedAt,
    pdfUrl: work?.primary_location?.pdf_url,
    abstractText,
    rawPayload: work,
    importQuery,
    payload: {
      openalex_id: work?.id ?? null,
      cited_by_count:
        typeof work?.cited_by_count === 'number' ? work.cited_by_count : null,
      primary_topic: work?.primary_topic?.display_name ?? null,
    },
    tags: Array.isArray(work?.keywords)
      ? work.keywords.slice(0, 5).map((keyword) => keyword?.display_name)
      : [],
  });
}

export function normalizeCrossrefWork(work, importQuery, ingestedAt) {
  const sourceKey =
    typeof work?.DOI === 'string'
      ? work.DOI
      : typeof work?.URL === 'string'
        ? work.URL
        : Array.isArray(work?.title)
          ? work.title[0]
          : null;
  const title =
    Array.isArray(work?.title) && typeof work.title[0] === 'string'
      ? work.title[0].trim()
      : null;
  const publishedAt = normalizeDateParts(
    work?.issued?.['date-parts']?.[0] ?? work?.published?.['date-parts']?.[0],
  );
  const authors = Array.isArray(work?.author)
    ? work.author.map((author) => ({
        given: author?.given,
        family: author?.family,
        ORCID: author?.ORCID,
      }))
    : null;
  const licenses = Array.isArray(work?.license)
    ? work.license.map((license) => license?.URL).filter(Boolean)
    : [];

  return buildCatalogEntry({
    sourceType: 'CROSSREF',
    sourceKey,
    sourceUrl: typeof work?.URL === 'string' ? work.URL : null,
    title,
    sourceCategory:
      typeof work?.type === 'string' ? work.type : 'scholarly_work',
    doi: typeof work?.DOI === 'string' ? work.DOI : null,
    publisher: typeof work?.publisher === 'string' ? work.publisher : null,
    journal:
      Array.isArray(work?.['container-title']) &&
      typeof work['container-title'][0] === 'string'
        ? work['container-title'][0]
        : null,
    authors,
    language: work?.language,
    license: licenses[0] ?? null,
    accessStatus: licenses.length > 0 ? 'HYBRID' : 'UNKNOWN',
    publishedAt,
    asOf: ingestedAt,
    abstractText: stripMarkup(work?.abstract),
    rawPayload: work,
    importQuery,
    payload: {
      crossref_type: work?.type ?? null,
      references_count:
        typeof work?.referencesCount === 'number'
          ? work.referencesCount
          : typeof work?.['is-referenced-by-count'] === 'number'
            ? work['is-referenced-by-count']
            : null,
    },
    tags: Array.isArray(work?.subject) ? work.subject.slice(0, 5) : [],
  });
}

export function normalizeEuropePmcWork(work, importQuery, ingestedAt) {
  const source = nonEmptyString(work?.source) ?? 'EPMC';
  const identifier = nonEmptyString(work?.id ?? work?.pmid ?? work?.pmcid);
  const sourceKey = identifier ? `${source}:${identifier}` : null;
  const publicationId = nonEmptyString(work?.pmcid) ?? identifier;
  const articleUrl = publicationId
    ? `https://europepmc.org/article/${source}/${publicationId}`
    : null;
  const fullTextUrls = normalizeFullTextUrlList(work?.fullTextUrlList);
  const authors = nonEmptyString(work?.authorString)
    ? work.authorString.split(',').map((name) => name.trim())
    : Array.isArray(work?.authorList?.author)
      ? work.authorList.author.map(
          (author) => author?.fullName ?? author?.collectiveName,
        )
      : null;

  return buildCatalogEntry({
    sourceType: 'EUROPE_PMC',
    sourceKey,
    sourceUrl: articleUrl,
    title: nonEmptyString(work?.title),
    sourceCategory: nonEmptyString(work?.pubType) ?? 'scholarly_work',
    doi: nonEmptyString(work?.doi),
    publisher: nonEmptyString(work?.bookOrReportDetails?.publisher),
    journal: nonEmptyString(work?.journalTitle),
    authors,
    language: nonEmptyString(work?.language),
    accessStatus:
      nonEmptyString(work?.isOpenAccess) === 'Y' ||
      nonEmptyString(work?.openAccess) === 'Y'
        ? 'GREEN'
        : 'CLOSED',
    publishedAt: normalizeIsoTimestamp(
      work?.firstPublicationDate ?? work?.firstIndexDate,
    ),
    asOf: ingestedAt,
    pdfUrl: fullTextUrls.pdfUrl,
    xmlUrl: fullTextUrls.xmlUrl,
    abstractText: nonEmptyString(work?.abstractText),
    rawPayload: work,
    importQuery,
    payload: {
      europe_pmc_source: source,
      cited_by_count:
        typeof work?.citedByCount === 'number' ? work.citedByCount : null,
      in_pmc: nonEmptyString(work?.inPMC) ?? null,
      has_pdf: nonEmptyString(work?.hasPDF) ?? null,
    },
    tags: [work?.journalTitle, work?.pubType].filter(Boolean),
  });
}

function normalizeManifestSupplierDocument(document, record) {
  if (!document || typeof document !== 'object') {
    return null;
  }

  const supplierName =
    nonEmptyString(document.supplierName) ??
    nonEmptyString(record.supplierName);
  if (!supplierName) {
    return null;
  }

  const normalizedName = supplierName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return {
    supplierName,
    normalizedName,
    category:
      nonEmptyString(document.supplierCategory) ??
      nonEmptyString(record.supplierCategory),
    region:
      nonEmptyString(document.supplierRegion) ??
      nonEmptyString(record.supplierRegion),
    metadata: {
      source_manifest: true,
      ...(document.supplierMetadata &&
      typeof document.supplierMetadata === 'object'
        ? document.supplierMetadata
        : {}),
    },
    productKey:
      nonEmptyString(document.productKey) ??
      normalizedName + '-default-product',
    productDisplayName:
      nonEmptyString(document.productDisplayName) ??
      nonEmptyString(record.productDisplayName) ??
      'General offering',
    productCategory:
      nonEmptyString(document.productCategory) ??
      nonEmptyString(record.productCategory),
    trl:
      typeof document.trl === 'number'
        ? document.trl
        : typeof record.trl === 'number'
          ? record.trl
          : null,
    productMetadata: {
      ...(document.productMetadata &&
      typeof document.productMetadata === 'object'
        ? document.productMetadata
        : {}),
    },
    documentType: normalizeSupplierDocumentType(
      document.documentType ?? record.documentType,
      'OTHER',
    ),
    note: nonEmptyString(document.note) ?? nonEmptyString(record.documentNote),
  };
}

export function normalizeCuratedManifestRecord(
  record,
  ingestedAt,
  manifestPath,
) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const supplierDocuments = [];
  if (record.supplierDocument) {
    const normalized = normalizeManifestSupplierDocument(
      record.supplierDocument,
      record,
    );
    if (normalized) {
      supplierDocuments.push(normalized);
    }
  }

  if (Array.isArray(record.supplierDocuments)) {
    for (const document of record.supplierDocuments) {
      const normalized = normalizeManifestSupplierDocument(document, record);
      if (normalized) {
        supplierDocuments.push(normalized);
      }
    }
  }

  const sourceType = normalizeSourceType(record.sourceType, 'CURATED_MANIFEST');
  return buildCatalogEntry({
    sourceType,
    sourceKey: nonEmptyString(record.sourceKey),
    sourceUrl: nonEmptyString(record.sourceUrl),
    title: nonEmptyString(record.title),
    sourceCategory: nonEmptyString(record.sourceCategory),
    doi: nonEmptyString(record.doi),
    publisher:
      nonEmptyString(record.publisher) ?? 'METREV curated evidence bootstrap',
    journal: nonEmptyString(record.journal),
    authors: Array.isArray(record.authors) ? record.authors : null,
    language: nonEmptyString(record.language) ?? 'en',
    license: nonEmptyString(record.license),
    accessStatus: normalizeAccessStatus(record.accessStatus, 'UNKNOWN'),
    publishedAt: normalizeIsoTimestamp(record.publishedAt),
    asOf: ingestedAt,
    pdfUrl: nonEmptyString(record.pdfUrl),
    xmlUrl: nonEmptyString(record.xmlUrl),
    abstractText:
      nonEmptyString(record.abstractText) ?? nonEmptyString(record.summary),
    rawPayload: {
      manifest_path: manifestPath,
      ...record,
    },
    importQuery: nonEmptyString(record.importQuery) ?? manifestPath,
    summary: nonEmptyString(record.summary),
    evidenceType: normalizeEvidenceType(record.evidenceType, sourceType),
    strengthLevel: nonEmptyString(record.strengthLevel) ?? 'moderate',
    provenanceNote:
      nonEmptyString(record.provenanceNote) ??
      `Imported from curated manifest ${manifestPath}. Analyst review remains required before use in decision flows.`,
    reviewStatus: normalizeReviewStatus(record.reviewStatus, 'PENDING'),
    sourceState: normalizeEnumValue(record.sourceState, 'PARSED'),
    applicabilityScope:
      record.applicabilityScope && typeof record.applicabilityScope === 'object'
        ? record.applicabilityScope
        : {},
    tags: Array.isArray(record.tags) ? record.tags : [],
    payload:
      record.payload && typeof record.payload === 'object'
        ? record.payload
        : {},
    explicitClaims: Array.isArray(record.claims) ? record.claims : [],
    supplierDocuments,
  });
}

export function parseScriptOptions(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const normalizedToken = token.slice(2);
    const separatorIndex = normalizedToken.indexOf('=');

    if (separatorIndex >= 0) {
      const key = normalizedToken.slice(0, separatorIndex);
      const value = normalizedToken.slice(separatorIndex + 1);
      options[key] = value;
      continue;
    }

    const key = normalizedToken;
    const nextToken = argv[index + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      options[key] = nextToken;
      index += 1;
      continue;
    }

    options[key] = true;
  }

  return options;
}

function resolveOptionKeys(keyOrKeys) {
  return Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
}

export function optionValue(options, keyOrKeys, fallback = null) {
  for (const key of resolveOptionKeys(keyOrKeys)) {
    if (Object.prototype.hasOwnProperty.call(options, key)) {
      return options[key];
    }
  }

  return fallback;
}

export function optionFlag(options, keyOrKeys, fallback = false) {
  const value = optionValue(options, keyOrKeys, undefined);
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === '' ||
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes' ||
      normalized === 'y'
    ) {
      return true;
    }

    if (
      normalized === 'false' ||
      normalized === '0' ||
      normalized === 'no' ||
      normalized === 'n'
    ) {
      return false;
    }
  }

  return Boolean(value);
}

export function optionNumber(
  options,
  keyOrKeys,
  fallback,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
) {
  const rawValue = optionValue(options, keyOrKeys, fallback);
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, numericValue));
}

export function optionList(options, keyOrKeys, fallback = []) {
  const rawValue = optionValue(options, keyOrKeys, null);
  if (rawValue == null) {
    return fallback;
  }

  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => normalizeWhitespace(value)).filter(Boolean);
  }

  return normalizeWhitespace(String(rawValue))
    .split(/[\n,|]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function readJsonFile(filePath, importMetaUrl) {
  const absolutePath = isAbsolute(filePath)
    ? filePath
    : resolve(dirname(fileURLToPath(importMetaUrl)), filePath);

  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

export function deduplicateEntries(entries) {
  const map = new Map();

  for (const entry of entries.filter(Boolean)) {
    const doi = nonEmptyString(entry.sourceRecord.doi)?.toLowerCase();
    const normalizedDoi = doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    const normalizedTitle = nonEmptyString(entry.sourceRecord.title)
      ?.toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    const key =
      normalizedDoi ||
      nonEmptyString(entry.sourceRecord.hashDedup) ||
      normalizedTitle ||
      `${entry.sourceRecord.sourceType}:${entry.sourceRecord.sourceKey}`;

    if (!map.has(key)) {
      map.set(key, entry);
    }
  }

  return Array.from(map.values());
}

export function summarizeNormalizedEntries(entries) {
  const sourceTypes = {};
  let claimCount = 0;
  let supplierDocumentCount = 0;

  for (const entry of entries) {
    sourceTypes[entry.sourceRecord.sourceType] =
      (sourceTypes[entry.sourceRecord.sourceType] ?? 0) + 1;
    claimCount += entry.claims.length;
    supplierDocumentCount += entry.supplierDocuments.length;
  }

  return {
    entries: entries.length,
    claimCount,
    supplierDocumentCount,
    sourceTypes,
  };
}

async function syncOntologyMappings(prisma, claimId, mappings) {
  const normalizedMappings = Array.isArray(mappings)
    ? mappings
        .map((mapping) => {
          if (!mapping || typeof mapping !== 'object') {
            return null;
          }

          const ontologyPath = nonEmptyString(mapping.ontologyPath);
          if (!ontologyPath) {
            return null;
          }

          return {
            ontologyPath,
            mappingConfidence:
              typeof mapping.mappingConfidence === 'number'
                ? Number(mapping.mappingConfidence.toFixed(2))
                : 0.6,
            mappedBy: normalizeEnumValue(mapping.mappedBy, 'IMPORT_RULE'),
            note: nonEmptyString(mapping.note),
          };
        })
        .filter(Boolean)
    : [];

  const existingMappings = await prisma.evidenceOntologyMapping.findMany({
    where: { claimId },
    select: { id: true, ontologyPath: true },
  });
  const existingByPath = new Map(
    existingMappings.map((mapping) => [mapping.ontologyPath, mapping]),
  );
  const seenPaths = new Set();

  for (const mapping of normalizedMappings) {
    seenPaths.add(mapping.ontologyPath);
    const existing = existingByPath.get(mapping.ontologyPath);

    if (existing) {
      await prisma.evidenceOntologyMapping.update({
        where: { id: existing.id },
        data: {
          mappingConfidence: mapping.mappingConfidence,
          mappedBy: mapping.mappedBy,
          note: mapping.note,
        },
      });
      continue;
    }

    await prisma.evidenceOntologyMapping.create({
      data: {
        claimId,
        ontologyPath: mapping.ontologyPath,
        mappingConfidence: mapping.mappingConfidence,
        mappedBy: mapping.mappedBy,
        note: mapping.note,
      },
    });
  }

  const staleIds = existingMappings
    .filter((mapping) => !seenPaths.has(mapping.ontologyPath))
    .map((mapping) => mapping.id);

  if (staleIds.length > 0) {
    await prisma.evidenceOntologyMapping.deleteMany({
      where: { id: { in: staleIds } },
    });
  }
}

async function syncClaimReview(prisma, claimId, review) {
  if (!review) {
    return;
  }

  const existingReview = await prisma.evidenceClaimReview.findFirst({
    where: { claimId },
    orderBy: { createdAt: 'desc' },
  });

  const data = {
    status: normalizeReviewStatus(review.status, 'PENDING'),
    analystId: nonEmptyString(review.analystId),
    analystRole: nonEmptyString(review.analystRole),
    analystNote: nonEmptyString(review.analystNote),
    reviewedAt:
      review.status && review.status !== 'PENDING' ? new Date() : null,
  };

  if (existingReview) {
    await prisma.evidenceClaimReview.update({
      where: { id: existingReview.id },
      data,
    });
    return;
  }

  await prisma.evidenceClaimReview.create({
    data: {
      claimId,
      ...data,
    },
  });
}

function toClaimMetadata(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...value }
    : {};
}

function buildActiveClaimMetadata(existingMetadata, incomingMetadata) {
  return {
    ...toClaimMetadata(existingMetadata),
    ...toClaimMetadata(incomingMetadata),
    detached_catalog_item_id: null,
    detached_reason: null,
    ingestion_status: 'active',
    superseded_at: null,
    superseded_by_run_id: null,
  };
}

async function syncClaims(
  prisma,
  sourceRecordId,
  catalogItemId,
  claims,
  runId,
) {
  const existingClaims = await prisma.evidenceClaim.findMany({
    where: {
      sourceRecordId,
      OR: [{ catalogItemId }, { catalogItemId: null }],
    },
    select: {
      id: true,
      catalogItemId: true,
      content: true,
      metadata: true,
      sourceLocator: true,
      reviews: {
        select: {
          reviewedAt: true,
          status: true,
        },
      },
    },
  });
  const existingByKey = new Map(
    existingClaims.map((claim) => [
      `${claim.sourceLocator ?? ''}::${claim.content}`,
      claim,
    ]),
  );
  const seenKeys = new Set();

  for (const claim of claims) {
    const claimKey = `${claim.sourceLocator ?? ''}::${claim.content}`;
    seenKeys.add(claimKey);
    const existing = existingByKey.get(claimKey);
    const data = {
      catalogItemId,
      sourceRecordId,
      claimType: normalizeClaimType(claim.claimType, 'OTHER'),
      content: claim.content,
      extractedValue: nonEmptyString(claim.extractedValue),
      unit: nonEmptyString(claim.unit),
      confidence:
        typeof claim.confidence === 'number'
          ? Number(claim.confidence.toFixed(2))
          : 0.55,
      extractionMethod: normalizeExtractionMethod(
        claim.extractionMethod,
        'REGEX',
      ),
      extractorVersion:
        nonEmptyString(claim.extractorVersion) ?? CLAIM_EXTRACTOR_VERSION,
      sourceSnippet: truncateText(claim.sourceSnippet, 560),
      sourceLocator: nonEmptyString(claim.sourceLocator),
      pageNumber:
        typeof claim.pageNumber === 'number' &&
        Number.isFinite(claim.pageNumber)
          ? claim.pageNumber
          : null,
      metadata: buildActiveClaimMetadata(existing?.metadata, claim.metadata),
    };

    const persistedClaim = existing
      ? await prisma.evidenceClaim.update({
          where: { id: existing.id },
          data,
          select: { id: true },
        })
      : await prisma.evidenceClaim.create({
          data,
          select: { id: true },
        });

    await syncOntologyMappings(
      prisma,
      persistedClaim.id,
      claim.ontologyMappings,
    );
    await syncClaimReview(prisma, persistedClaim.id, claim.review);
  }

  const staleIds = existingClaims.filter(
    (claim) => !seenKeys.has(`${claim.sourceLocator ?? ''}::${claim.content}`),
  );

  const detachableClaims = staleIds.filter((claim) =>
    claim.reviews.some(
      (review) => review.status !== 'PENDING' || review.reviewedAt !== null,
    ),
  );
  const deletableIds = staleIds
    .filter((claim) => !detachableClaims.includes(claim))
    .map((claim) => claim.id);

  for (const claim of detachableClaims) {
    await prisma.evidenceClaim.update({
      where: { id: claim.id },
      data: {
        catalogItemId: null,
        metadata: {
          ...toClaimMetadata(claim.metadata),
          detached_catalog_item_id: claim.catalogItemId ?? catalogItemId,
          detached_reason: 'claim_not_present_in_latest_ingestion',
          ingestion_status: 'superseded',
          superseded_at: new Date().toISOString(),
          superseded_by_run_id: runId ?? null,
        },
      },
    });
  }

  if (deletableIds.length > 0) {
    await prisma.evidenceClaim.deleteMany({
      where: {
        id: { in: deletableIds },
      },
    });
  }

  return claims.length;
}

async function syncSupplierDocuments(
  prisma,
  sourceRecordId,
  supplierDocuments,
) {
  let storedDocuments = 0;

  for (const document of supplierDocuments) {
    const supplier = await prisma.supplier.upsert({
      where: { normalizedName: document.normalizedName },
      update: {
        displayName: document.supplierName,
        category: document.category,
        region: document.region,
        metadata: document.metadata,
      },
      create: {
        normalizedName: document.normalizedName,
        displayName: document.supplierName,
        category: document.category,
        region: document.region,
        metadata: document.metadata,
      },
      select: { id: true },
    });

    const product = await prisma.supplierProduct.upsert({
      where: {
        supplierId_productKey: {
          supplierId: supplier.id,
          productKey: document.productKey,
        },
      },
      update: {
        displayName: document.productDisplayName,
        category: document.productCategory,
        trl: document.trl,
        metadata: document.productMetadata,
      },
      create: {
        supplierId: supplier.id,
        productKey: document.productKey,
        displayName: document.productDisplayName,
        category: document.productCategory,
        trl: document.trl,
        metadata: document.productMetadata,
      },
      select: { id: true },
    });

    await prisma.supplierDocument.upsert({
      where: {
        supplierId_sourceRecordId: {
          supplierId: supplier.id,
          sourceRecordId,
        },
      },
      update: {
        productId: product.id,
        documentType: document.documentType,
        note: document.note,
      },
      create: {
        supplierId: supplier.id,
        sourceRecordId,
        productId: product.id,
        documentType: document.documentType,
        note: document.note,
      },
    });

    storedDocuments += 1;
  }

  return storedDocuments;
}

function resolveCatalogReviewStatus(existingStatus, incomingStatus) {
  if (existingStatus && existingStatus !== 'PENDING') {
    return existingStatus;
  }

  return incomingStatus;
}

function resolveCatalogSourceState(existingState, incomingState) {
  const rank = {
    RAW: 0,
    PARSED: 1,
    NORMALIZED: 2,
    REVIEWED: 3,
  };

  if (!existingState) {
    return incomingState;
  }

  return (rank[existingState] ?? 0) >= (rank[incomingState] ?? 0)
    ? existingState
    : incomingState;
}

export async function persistNormalizedEntries(
  prisma,
  entries,
  { runId = null } = {},
) {
  let recordsStored = 0;
  let claimsStored = 0;
  let supplierDocumentsStored = 0;

  for (const entry of entries) {
    await prisma.$transaction(
      async (transaction) => {
        const sourceRecord = await transaction.externalSourceRecord.upsert({
          where: {
            sourceType_sourceKey: {
              sourceType: entry.sourceRecord.sourceType,
              sourceKey: entry.sourceRecord.sourceKey,
            },
          },
          update: {
            sourceUrl: entry.sourceRecord.sourceUrl,
            title: entry.sourceRecord.title,
            sourceCategory: entry.sourceRecord.sourceCategory,
            doi: entry.sourceRecord.doi,
            publisher: entry.sourceRecord.publisher,
            journal: entry.sourceRecord.journal,
            authors: entry.sourceRecord.authors,
            language: entry.sourceRecord.language,
            license: entry.sourceRecord.license,
            accessStatus: entry.sourceRecord.accessStatus,
            publishedAt: entry.sourceRecord.publishedAt
              ? new Date(entry.sourceRecord.publishedAt)
              : null,
            asOf: entry.sourceRecord.asOf
              ? new Date(entry.sourceRecord.asOf)
              : null,
            pdfUrl: entry.sourceRecord.pdfUrl,
            xmlUrl: entry.sourceRecord.xmlUrl,
            hashDedup: entry.sourceRecord.hashDedup,
            ingestionRunId: runId,
            abstractText: entry.sourceRecord.abstractText,
            rawPayload: entry.sourceRecord.rawPayload,
          },
          create: {
            sourceType: entry.sourceRecord.sourceType,
            sourceKey: entry.sourceRecord.sourceKey,
            sourceUrl: entry.sourceRecord.sourceUrl,
            title: entry.sourceRecord.title,
            sourceCategory: entry.sourceRecord.sourceCategory,
            doi: entry.sourceRecord.doi,
            publisher: entry.sourceRecord.publisher,
            journal: entry.sourceRecord.journal,
            authors: entry.sourceRecord.authors,
            language: entry.sourceRecord.language,
            license: entry.sourceRecord.license,
            accessStatus: entry.sourceRecord.accessStatus,
            publishedAt: entry.sourceRecord.publishedAt
              ? new Date(entry.sourceRecord.publishedAt)
              : null,
            asOf: entry.sourceRecord.asOf
              ? new Date(entry.sourceRecord.asOf)
              : null,
            pdfUrl: entry.sourceRecord.pdfUrl,
            xmlUrl: entry.sourceRecord.xmlUrl,
            hashDedup: entry.sourceRecord.hashDedup,
            ingestionRunId: runId,
            abstractText: entry.sourceRecord.abstractText,
            rawPayload: entry.sourceRecord.rawPayload,
          },
          select: { id: true },
        });

        const catalogItemKey = {
          sourceRecordId_evidenceType_title: {
            sourceRecordId: sourceRecord.id,
            evidenceType: entry.catalogItem.evidenceType,
            title: entry.catalogItem.title,
          },
        };
        const existingCatalogItem =
          await transaction.externalEvidenceCatalogItem.findUnique({
            where: catalogItemKey,
            select: { id: true, reviewStatus: true, sourceState: true },
          });
        const nextReviewStatus = resolveCatalogReviewStatus(
          existingCatalogItem?.reviewStatus,
          entry.catalogItem.reviewStatus,
        );
        const nextSourceState = resolveCatalogSourceState(
          existingCatalogItem?.sourceState,
          entry.catalogItem.sourceState,
        );

        const catalogItem =
          await transaction.externalEvidenceCatalogItem.upsert({
            where: catalogItemKey,
            update: {
              summary: entry.catalogItem.summary,
              strengthLevel: entry.catalogItem.strengthLevel,
              provenanceNote: entry.catalogItem.provenanceNote,
              reviewStatus: nextReviewStatus,
              sourceState: nextSourceState,
              applicabilityScope: entry.catalogItem.applicabilityScope,
              extractedClaims: entry.catalogItem.extractedClaims,
              tags: entry.catalogItem.tags,
              payload: entry.catalogItem.payload,
            },
            create: {
              sourceRecordId: sourceRecord.id,
              evidenceType: entry.catalogItem.evidenceType,
              title: entry.catalogItem.title,
              summary: entry.catalogItem.summary,
              strengthLevel: entry.catalogItem.strengthLevel,
              provenanceNote: entry.catalogItem.provenanceNote,
              reviewStatus: entry.catalogItem.reviewStatus,
              sourceState: entry.catalogItem.sourceState,
              applicabilityScope: entry.catalogItem.applicabilityScope,
              extractedClaims: entry.catalogItem.extractedClaims,
              tags: entry.catalogItem.tags,
              payload: entry.catalogItem.payload,
            },
            select: { id: true, reviewStatus: true, sourceState: true },
          });

        const claimCount = await syncClaims(
          transaction,
          sourceRecord.id,
          catalogItem.id,
          entry.claims,
          runId,
        );
        const supplierDocumentCount = await syncSupplierDocuments(
          transaction,
          sourceRecord.id,
          entry.supplierDocuments,
        );

        await transaction.externalEvidenceCatalogItem.update({
          where: { id: catalogItem.id },
          data: { claimCount },
        });

        recordsStored += 1;
        claimsStored += claimCount;
        supplierDocumentsStored += supplierDocumentCount;
      },
      {
        maxWait: 10_000,
        timeout: 60_000,
      },
    );
  }

  return {
    recordsStored,
    claimsStored,
    supplierDocumentsStored,
  };
}

export async function collectIngestionInventory(prisma) {
  const [
    sourceRecords,
    catalogItems,
    claims,
    supplierDocuments,
    suppliers,
    products,
    runs,
  ] = await prisma.$transaction([
    prisma.externalSourceRecord.count(),
    prisma.externalEvidenceCatalogItem.count(),
    prisma.evidenceClaim.count(),
    prisma.supplierDocument.count(),
    prisma.supplier.count(),
    prisma.supplierProduct.count(),
    prisma.ingestionRun.count(),
  ]);

  return {
    sourceRecords,
    catalogItems,
    claims,
    supplierDocuments,
    suppliers,
    products,
    runs,
  };
}
