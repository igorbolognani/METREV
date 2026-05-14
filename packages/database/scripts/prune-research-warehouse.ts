import { randomUUID } from 'node:crypto';

import {
  buildDecisionIngestionPreview,
  buildResearchEvidencePack,
  DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
  getDefaultResearchColumns,
  runDeterministicResearchExtraction,
} from '@metrev/research-intelligence';

import { assertLocalEvaluationResetAllowed } from '../src/evaluation-reset';
import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';
import { PrismaResearchRepository } from '../src/research-repository';

import { loadWorkspaceEnv } from './load-workspace-env.mjs';
import {
  evaluateTechnicalCompleteness,
  hasTechnicalResearchTechnologyClass,
  type TechnicalCompletenessCandidate,
} from './table-ready-completeness';

loadWorkspaceEnv(import.meta.url);

const BATCH_SIZE = 500;
const DEFAULT_REVIEW_LIMIT = 100;

type SourceCandidate = {
  id: string;
  publishedAt: Date | null;
  publisher: string | null;
  sourceKey: string;
  title: string;
  updatedAt: Date;
};

type EligibilityPlan = {
  fixtureLikeRecordsToDelete: number;
  keepIds: Set<string>;
  keepSources: SourceCandidate[];
  linkedRecordsSeen: number;
  sourceRecordsBefore: number;
  tableReadySourceRecords: number;
};

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function optionNumber(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw.slice(prefix.length));
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function isFixtureLikeSource(source: SourceCandidate): boolean {
  const haystack = [source.sourceKey, source.title, source.publisher ?? '']
    .join(' ')
    .toLowerCase();

  return (
    haystack.includes('playwright') ||
    haystack.includes('fixture') ||
    haystack.includes('metrev local evidence lab')
  );
}

export function shouldKeepResearchSourceForPrune(input: {
  eligibilityStatus: 'eligible' | 'excluded';
  sourceDocumentId: string;
  tableReadyOnly: boolean;
  tableReadySourceIds: ReadonlySet<string>;
  technologyClasses: string[];
}): boolean {
  if (input.tableReadyOnly) {
    return input.tableReadySourceIds.has(input.sourceDocumentId);
  }

  if (input.eligibilityStatus !== 'eligible') {
    return false;
  }

  if (!hasTechnicalResearchTechnologyClass(input.technologyClasses)) {
    return false;
  }

  return true;
}

function sortReviewSources(sources: SourceCandidate[]): SourceCandidate[] {
  return [...sources].sort((left, right) => {
    const rightPublished = right.publishedAt?.getTime() ?? 0;
    const leftPublished = left.publishedAt?.getTime() ?? 0;
    return (
      rightPublished - leftPublished ||
      right.updatedAt.getTime() - left.updatedAt.getTime() ||
      left.title.localeCompare(right.title)
    );
  });
}

function linkedSourceWhere() {
  return {
    OR: [
      { sourceUrl: { not: null } },
      { pdfUrl: { not: null } },
      { xmlUrl: { not: null } },
      { sourceArtifacts: { some: {} } },
      { sourceTextChunks: { some: {} } },
    ],
  };
}

async function loadLinkedSourcePage(lastId: string | null) {
  const prisma = getPrismaClient();

  return prisma.externalSourceRecord.findMany({
    where: {
      AND: [
        linkedSourceWhere(),
        lastId
          ? {
              id: {
                gt: lastId,
              },
            }
          : {},
      ],
    },
    select: {
      id: true,
      publishedAt: true,
      publisher: true,
      sourceKey: true,
      title: true,
      updatedAt: true,
    },
    orderBy: [{ id: 'asc' }],
    take: BATCH_SIZE,
  });
}

async function loadTableReadySourceIds(): Promise<Set<string>> {
  const records = await getPrismaClient().externalEvidenceCatalogItem.findMany({
    where: {
      reviewStatus: 'ACCEPTED',
    },
    select: {
      id: true,
      title: true,
      summary: true,
      sourceRecordId: true,
      claimCount: true,
      extractionStatus: true,
      evidenceQuality: true,
      tags: true,
      sourceRecord: {
        select: {
          abstractText: true,
          doi: true,
          pdfUrl: true,
          sourceCategory: true,
          sourceType: true,
          sourceUrl: true,
          xmlUrl: true,
          _count: {
            select: {
              sourceArtifacts: true,
              sourceTextChunks: true,
            },
          },
        },
      },
      scientificFacts: {
        where: {
          factLayer: 'canonical_scientific_fact_v1',
        },
        select: {
          canonicalKey: true,
          componentType: true,
          decisionReady: true,
          factType: true,
          fieldKey: true,
          material: true,
          metricType: true,
          normalizedUnit: true,
          normalizedValue: true,
          reactorType: true,
          systemType: true,
        },
      },
      benchmarkRecords: {
        select: {
          application: true,
          componentType: true,
          decisionReady: true,
          material: true,
          metricType: true,
          normalizedUnit: true,
          normalizedValue: true,
          systemType: true,
        },
      },
    },
  });

  return new Set(
    records
      .filter(
        (record) =>
          evaluateTechnicalCompleteness({
            abstractAvailable: Boolean(
              record.sourceRecord.abstractText?.trim(),
            ),
            benchmarkRecords: record.benchmarkRecords,
            canonicalFacts: record.scientificFacts,
            catalogItemId: record.id,
            claimCount: record.claimCount,
            doiAvailable: Boolean(record.sourceRecord.doi),
            evidenceQuality: record.evidenceQuality,
            extractionStatus: record.extractionStatus,
            fullTextAvailable: Boolean(
              record.sourceRecord._count.sourceArtifacts > 0 ||
              record.sourceRecord.pdfUrl ||
              record.sourceRecord.xmlUrl,
            ),
            sourceArtifactCount: record.sourceRecord._count.sourceArtifacts,
            sourceCategory: record.sourceRecord.sourceCategory,
            sourceRecordId: record.sourceRecordId,
            sourceTextChunkCount: record.sourceRecord._count.sourceTextChunks,
            sourceType: record.sourceRecord.sourceType.toLowerCase(),
            sourceUrlAvailable: Boolean(record.sourceRecord.sourceUrl),
            summary: record.summary,
            tags: record.tags,
            title: record.title,
          } satisfies TechnicalCompletenessCandidate).strictTableReady,
      )
      .map((record) => record.sourceRecordId),
  );
}

async function collectEligibilityPlan(input: {
  tableReadyOnly: boolean;
}): Promise<EligibilityPlan> {
  const repository = new PrismaResearchRepository(getPrismaClient());
  const sourceRecordsBefore =
    await getPrismaClient().externalSourceRecord.count();
  const tableReadySourceIds = input.tableReadyOnly
    ? await loadTableReadySourceIds()
    : new Set<string>();
  const keepIds = new Set<string>();
  const keepSources: SourceCandidate[] = [];
  let fixtureLikeRecordsToDelete = 0;
  let linkedRecordsSeen = 0;
  let lastId: string | null = null;

  for (;;) {
    const batch = await loadLinkedSourcePage(lastId);

    if (batch.length === 0) {
      break;
    }

    linkedRecordsSeen += batch.length;
    const sourceById = new Map(batch.map((source) => [source.id, source]));
    const eligibility = await repository.listResearchWarehouseEligibility({
      dry_run: true,
      include_items: true,
      limit: BATCH_SIZE,
      source_document_ids: batch.map((source) => source.id),
    });

    for (const item of eligibility.items) {
      const source = sourceById.get(item.source_document_id);
      if (!source) {
        continue;
      }

      if (isFixtureLikeSource(source)) {
        fixtureLikeRecordsToDelete += 1;
        continue;
      }

      if (
        shouldKeepResearchSourceForPrune({
          eligibilityStatus: item.status,
          sourceDocumentId: item.source_document_id,
          tableReadyOnly: input.tableReadyOnly,
          tableReadySourceIds,
          technologyClasses: item.technology_classes,
        })
      ) {
        keepIds.add(item.source_document_id);
        keepSources.push(source);
      }
    }

    lastId = batch.at(-1)?.id ?? null;
  }

  return {
    keepIds,
    keepSources: sortReviewSources(keepSources),
    fixtureLikeRecordsToDelete,
    linkedRecordsSeen,
    sourceRecordsBefore,
    tableReadySourceRecords: tableReadySourceIds.size,
  };
}

async function loadSourceIdPage(lastId: string | null) {
  const prisma = getPrismaClient();

  return prisma.externalSourceRecord.findMany({
    where: lastId
      ? {
          id: {
            gt: lastId,
          },
        }
      : {},
    select: { id: true },
    orderBy: [{ id: 'asc' }],
    take: BATCH_SIZE,
  });
}

async function deleteSourcesNotIn(keepIds: Set<string>) {
  const prisma = getPrismaClient();
  let deleted = 0;
  let lastId: string | null = null;

  for (;;) {
    const batch = await loadSourceIdPage(lastId);

    if (batch.length === 0) {
      break;
    }

    const deleteIds = batch
      .map((source) => source.id)
      .filter((sourceId) => !keepIds.has(sourceId));

    lastId = batch.at(-1)?.id ?? null;

    if (deleteIds.length === 0) {
      continue;
    }

    const result = await prisma.externalSourceRecord.deleteMany({
      where: {
        id: {
          in: deleteIds,
        },
      },
    });
    deleted += result.count;
  }

  return deleted;
}

async function sourceChunks(sourceDocumentId: string) {
  const prisma = getPrismaClient();
  return prisma.sourceTextChunkRecord.findMany({
    where: { sourceRecordId: sourceDocumentId },
    orderBy: [{ pageNumber: 'asc' }, { chunkIndex: 'asc' }],
    take: 12,
  });
}

function chunkTrace(
  chunks: Awaited<ReturnType<typeof sourceChunks>>,
  sourceDocumentId: string,
) {
  return chunks.map((chunk) => ({
    source: 'full_text' as const,
    source_document_id: sourceDocumentId,
    text_span: chunk.text.slice(0, 900),
    source_locator: chunk.sourceLocator,
    page_number: chunk.pageNumber,
    section_label:
      chunk.metadata &&
      typeof chunk.metadata === 'object' &&
      !Array.isArray(chunk.metadata) &&
      typeof (chunk.metadata as Record<string, unknown>).section_label ===
        'string'
        ? ((chunk.metadata as Record<string, unknown>).section_label as string)
        : null,
    table_label:
      chunk.metadata &&
      typeof chunk.metadata === 'object' &&
      !Array.isArray(chunk.metadata) &&
      typeof (chunk.metadata as Record<string, unknown>).table_label ===
        'string'
        ? ((chunk.metadata as Record<string, unknown>).table_label as string)
        : null,
    cell_locator:
      chunk.metadata &&
      typeof chunk.metadata === 'object' &&
      !Array.isArray(chunk.metadata) &&
      typeof (chunk.metadata as Record<string, unknown>).cell_locator ===
        'string'
        ? ((chunk.metadata as Record<string, unknown>).cell_locator as string)
        : null,
    caption:
      chunk.metadata &&
      typeof chunk.metadata === 'object' &&
      !Array.isArray(chunk.metadata) &&
      typeof (chunk.metadata as Record<string, unknown>).caption === 'string'
        ? ((chunk.metadata as Record<string, unknown>).caption as string)
        : null,
  }));
}

async function runReviewExtraction(reviewId: string) {
  const repository = new PrismaResearchRepository(getPrismaClient());
  const supplementalCache = new Map<
    string,
    Promise<Awaited<ReturnType<typeof sourceChunks>>>
  >();
  let attempted = 0;
  let completed = 0;
  let failed = 0;

  for (;;) {
    const workItems = await repository.claimQueuedResearchExtractionJobs({
      reviewId,
      limit: 100,
    });

    if (workItems.length === 0) {
      break;
    }

    for (const workItem of workItems) {
      attempted += 1;
      let cached = supplementalCache.get(workItem.paper.source_document_id);
      if (!cached) {
        cached = sourceChunks(workItem.paper.source_document_id);
        supplementalCache.set(workItem.paper.source_document_id, cached);
      }
      const chunks = await cached;
      const result = runDeterministicResearchExtraction({
        reviewId,
        paper: workItem.paper,
        column: workItem.column,
        claims: workItem.claims,
        supplementalText: chunks.map((chunk) => chunk.text),
        supplementalTrace: chunkTrace(
          chunks,
          workItem.paper.source_document_id,
        ),
      });
      const saved = await repository.saveResearchExtractionResult({
        jobId: workItem.job.job_id,
        result,
      });

      if (saved.status === 'valid') {
        completed += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { attempted, completed, failed };
}

async function createCleanReview(input: {
  reviewLimit: number;
  sourceIds: string[];
}) {
  const repository = new PrismaResearchRepository(getPrismaClient());
  const columns = getDefaultResearchColumns();
  const review = await repository.createResearchReview({
    title: 'Eligible MFC/MEC/MET research corpus',
    query:
      'strict eligible MFC MEC microbial electrochemical technologies local corpus',
    limit: input.reviewLimit,
    source_document_ids: input.sourceIds.slice(0, input.reviewLimit),
    columns,
    extractorVersion: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
  });
  const extraction = await runReviewExtraction(review.review_id);
  const refreshed = await repository.getResearchReview(review.review_id);

  if (refreshed && refreshed.extraction_results.length > 0) {
    const pack = buildResearchEvidencePack({
      packId: `eligible-research-corpus-${randomUUID()}`,
      review: refreshed,
      status: 'reviewed',
      now: new Date().toISOString(),
    });
    const decisionInput = buildDecisionIngestionPreview(pack);
    await repository.createResearchEvidencePack({ pack, decisionInput });
  }

  return {
    extraction,
    reviewId: review.review_id,
    requestedPapers: input.sourceIds.slice(0, input.reviewLimit).length,
  };
}

async function countAfter() {
  const prisma = getPrismaClient();
  const [sourceCount, reviewCount, paperCount, jobCount, resultCount] =
    await Promise.all([
      prisma.externalSourceRecord.count(),
      prisma.researchReview.count(),
      prisma.researchReviewPaper.count(),
      prisma.researchExtractionJob.count(),
      prisma.researchExtractionResult.count(),
    ]);

  return { sourceCount, reviewCount, paperCount, jobCount, resultCount };
}

async function main(): Promise<void> {
  if (hasFlag('--help')) {
    printUsage();
    return;
  }

  const execute = hasFlag('--execute');
  const dryRun = hasFlag('--dryRun') || !execute;
  const tableReadyOnly =
    hasFlag('--table-ready-only') || hasFlag('--tableReadyOnly');
  const reviewLimit = optionNumber('reviewLimit', DEFAULT_REVIEW_LIMIT);
  assertLocalEvaluationResetAllowed({ databaseUrl: process.env.DATABASE_URL });

  const prisma = getPrismaClient();

  try {
    const plan = await collectEligibilityPlan({ tableReadyOnly });

    console.log(
      JSON.stringify(
        {
          mode: dryRun ? 'dry_run' : 'execute',
          eligibility_mode: tableReadyOnly
            ? 'table_ready_only'
            : 'warehouse_eligible',
          source_records_before: plan.sourceRecordsBefore,
          linked_records_seen: plan.linkedRecordsSeen,
          table_ready_source_records: plan.tableReadySourceRecords,
          eligible_records_to_keep: plan.keepIds.size,
          fixture_like_records_to_delete: plan.fixtureLikeRecordsToDelete,
          records_to_delete: plan.sourceRecordsBefore - plan.keepIds.size,
          review_limit: reviewLimit,
          kept_source_sample: plan.keepSources.slice(0, 5).map((source) => ({
            id: source.id,
            title: source.title,
            published_at: source.publishedAt?.toISOString() ?? null,
          })),
        },
        null,
        2,
      ),
    );

    if (dryRun) {
      console.log(
        'Dry run only. Re-run with --execute to hard-delete records.',
      );
      return;
    }

    await prisma.researchReview.deleteMany();
    const deletedSourceRecords = await deleteSourcesNotIn(plan.keepIds);

    const repository = new PrismaResearchRepository(prisma);
    for (let index = 0; index < plan.keepSources.length; index += BATCH_SIZE) {
      await repository.listResearchWarehouseEligibility({
        dry_run: false,
        include_items: false,
        limit: BATCH_SIZE,
        source_document_ids: plan.keepSources
          .slice(index, index + BATCH_SIZE)
          .map((source) => source.id),
      });
    }

    const review =
      plan.keepSources.length > 0
        ? await createCleanReview({
            reviewLimit,
            sourceIds: plan.keepSources.map((source) => source.id),
          })
        : null;
    const after = await countAfter();

    console.log(
      JSON.stringify(
        {
          executed: true,
          deleted_source_records: deletedSourceRecords,
          retained_source_records: plan.keepIds.size,
          clean_review: review,
          counts_after: after,
        },
        null,
        2,
      ),
    );
  } finally {
    await disconnectPrismaClient();
  }
}

if (process.argv[1]?.endsWith('prune-research-warehouse.ts')) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'research_hard_prune_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
