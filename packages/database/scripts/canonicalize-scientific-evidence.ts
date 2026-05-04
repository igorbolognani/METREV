import { randomUUID } from 'node:crypto';

import { Prisma } from '../generated/prisma/client';
import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import {
  CANONICAL_FACT_LAYER,
  CANONICALIZATION_STATUSES,
  canonicalizeScientificEvidenceRecord,
} from './canonical-scientific-evidence.mjs';
import {
  optionFlag,
  optionNumber,
  optionValue,
  parseScriptOptions,
} from './external-ingestion-shared.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

const CANONICALIZATION_TRIGGER_MODE = 'bulk_canonicalization';
const DEFAULT_BATCH_SIZE = 1000;

type PrismaClientLike = ReturnType<typeof getPrismaClient>;

interface CanonicalizationCliConfig {
  batchSize: number;
  limit: number | null;
  resume: boolean;
  replacePlaceholders: boolean;
  fullTextMode: 'existing' | 'none';
  llmMode: 'disabled' | 'schema_validated';
  dryRun: boolean;
}

interface CanonicalizationCounters {
  processed: number;
  canonicalExtracted: number;
  insufficientSource: number;
  needsFullText: number;
  needsReview: number;
  failed: number;
  skipped: number;
  canonicalFacts: number;
  benchmarkRecords: number;
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      entry === undefined ? null : toPrismaJsonValue(entry),
    ) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object' && value !== undefined) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
        entry === undefined ? [] : [[key, toPrismaJsonValue(entry)]],
      ),
    ) as Prisma.InputJsonObject;
  }

  return String(value);
}

function toPrismaJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return toPrismaJsonValue(value) as Prisma.InputJsonObject;
}

function parseCanonicalizationCliConfig(argv = process.argv.slice(2)): CanonicalizationCliConfig {
  const options = parseScriptOptions(argv);
  const fullText = String(optionValue(options, 'full-text', 'existing')).trim();
  const llmMode = String(optionValue(options, 'llm-mode', 'disabled')).trim();
  const rawLimit = optionValue(options, 'limit', null);

  return {
    batchSize: optionNumber(
      options,
      'batch-size',
      Number(process.env.EVIDENCE_BATCH_SIZE ?? DEFAULT_BATCH_SIZE),
    ),
    limit:
      rawLimit === null || rawLimit === undefined
        ? null
        : optionNumber(options, 'limit', 1),
    resume: optionFlag(options, 'resume', true),
    replacePlaceholders: optionFlag(options, 'replace-placeholders', true),
    fullTextMode: fullText === 'none' ? 'none' : 'existing',
    llmMode: llmMode === 'schema_validated' ? 'schema_validated' : 'disabled',
    dryRun: optionFlag(options, 'dry-run', false),
  };
}

function emptyCounters(): CanonicalizationCounters {
  return {
    processed: 0,
    canonicalExtracted: 0,
    insufficientSource: 0,
    needsFullText: 0,
    needsReview: 0,
    failed: 0,
    skipped: 0,
    canonicalFacts: 0,
    benchmarkRecords: 0,
  };
}

function addCounterForStatus(counters: CanonicalizationCounters, status: string) {
  switch (status) {
    case CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED:
      counters.canonicalExtracted += 1;
      break;
    case CANONICALIZATION_STATUSES.INSUFFICIENT_SOURCE:
      counters.insufficientSource += 1;
      break;
    case CANONICALIZATION_STATUSES.NEEDS_FULL_TEXT:
      counters.needsFullText += 1;
      break;
    case CANONICALIZATION_STATUSES.NEEDS_REVIEW:
      counters.needsReview += 1;
      break;
    case CANONICALIZATION_STATUSES.EXTRACTION_FAILED:
      counters.failed += 1;
      break;
    default:
      counters.skipped += 1;
      break;
  }
}

function serializeRunSummary(config: CanonicalizationCliConfig) {
  return toPrismaJsonObject({
    trigger_mode: CANONICALIZATION_TRIGGER_MODE,
    extractor_mode: 'deterministic_first',
    extractor_version: 'canonical-deterministic-v1',
    llm_mode: config.llmMode,
    full_text_mode: config.fullTextMode,
    replace_placeholders: config.replacePlaceholders,
    no_fabrication: true,
  });
}

function readCheckpointLastCatalogItemId(run: { checkpoint: unknown } | null) {
  if (!run?.checkpoint || typeof run.checkpoint !== 'object') {
    return null;
  }

  const checkpoint = run.checkpoint as Record<string, unknown>;
  return typeof checkpoint.last_catalog_item_id === 'string'
    ? checkpoint.last_catalog_item_id
    : null;
}

async function findOrCreateCanonicalizationRun(
  prisma: PrismaClientLike,
  config: CanonicalizationCliConfig,
) {
  if (config.dryRun) {
    return null;
  }

  if (config.resume) {
    const activeRun = await prisma.evidenceCanonicalizationRun.findFirst({
      where: {
        triggerMode: CANONICALIZATION_TRIGGER_MODE,
        status: 'STARTED',
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (activeRun) {
      return activeRun;
    }
  }

  const acceptedTotal = await prisma.externalEvidenceCatalogItem.count({
    where: { reviewStatus: 'ACCEPTED' },
  });
  const now = new Date();

  return prisma.evidenceCanonicalizationRun.create({
    data: {
      triggerMode: CANONICALIZATION_TRIGGER_MODE,
      status: 'STARTED',
      targetTotal: config.limit ?? acceptedTotal,
      batchSize: config.batchSize,
      startedAt: now,
      snapshotCutoff: now,
      checkpoint: toPrismaJsonObject({
        last_catalog_item_id: null,
        snapshot_cutoff: now.toISOString(),
      }),
      summary: serializeRunSummary(config),
    },
  });
}

function buildCatalogWhere(input: {
  lastCatalogItemId: string | null;
  snapshotCutoff: Date;
}): Prisma.ExternalEvidenceCatalogItemWhereInput {
  return {
    reviewStatus: 'ACCEPTED',
    updatedAt: { lte: input.snapshotCutoff },
    id: input.lastCatalogItemId ? { gt: input.lastCatalogItemId } : undefined,
  };
}

function inferApplication(record: any, fact: any) {
  const text = [
    record.title,
    record.summary,
    record.sourceRecord?.sourceCategory,
    ...(Array.isArray(record.tags) ? record.tags : []),
    fact.payload?.snippet,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/hydrogen|biohydrogen/.test(text)) {
    return 'hydrogen_recovery';
  }
  if (/nitrogen|ammonium|ammonia/.test(text)) {
    return 'nitrogen_recovery';
  }
  if (/sensor|sensing/.test(text)) {
    return 'sensing';
  }
  if (/biogas|methane/.test(text)) {
    return 'biogas_synergy';
  }
  if (/wastewater|cod|removal|treatment|effluent/.test(text)) {
    return 'wastewater_treatment';
  }
  if (/power|electricity|bioelectricity/.test(text)) {
    return 'low_power_generation';
  }
  return 'other';
}

function buildBenchmarkRecord(input: {
  record: any;
  fact: any;
  runId: string | null;
}) {
  const { record, fact, runId } = input;

  if (
    !fact.decisionReady ||
    (!fact.metricType && !fact.material && !fact.componentType)
  ) {
    return null;
  }

  const normalizedValue =
    typeof fact.normalizedValue === 'number' ? fact.normalizedValue : null;
  const scale =
    fact.fieldKey === 'scale' && fact.normalizedText
      ? fact.normalizedText
      : null;
  const trl =
    fact.metricType === 'trl' && typeof normalizedValue === 'number'
      ? Math.trunc(normalizedValue)
      : null;

  return {
    id: randomUUID(),
    sourceRecordId: fact.sourceRecordId,
    catalogItemId: fact.catalogItemId,
    factId: fact.id,
    extractionRunId: runId,
    canonicalKey: fact.canonicalKey,
    normalizationRuleId: fact.normalizationRuleId,
    decisionReady: true,
    confidence: fact.confidence,
    sourceTextHash: fact.sourceTextHash,
    systemType: fact.systemType,
    application: inferApplication(record, fact),
    componentType: fact.componentType,
    material: fact.material,
    membraneSeparator:
      fact.componentType === 'membrane_separator' ? fact.material : null,
    operatingConditionKey: fact.operatingConditionKey,
    metricType: fact.metricType ?? fact.fieldKey,
    normalizedValue,
    normalizedUnit: fact.normalizedUnit,
    publicationYear: record.sourceRecord?.publicationYear ?? null,
    evidenceQuality: fact.evidenceQuality,
    scale,
    trl,
    costIndicator:
      fact.metricType === 'cost_indicator'
        ? fact.normalizedText ?? fact.originalValue
        : null,
    riskIndicator:
      fact.factType === 'limitation' ? fact.normalizedText ?? 'reported' : null,
    payload: toPrismaJsonObject({
      source: CANONICAL_FACT_LAYER,
      extractor_version: 'canonical-deterministic-v1',
      canonical_key: fact.canonicalKey,
      snippet: fact.payload?.snippet,
      locator: fact.payload?.locator,
      no_fabrication: true,
    }),
  };
}

function toFactCreateInput(fact: any, runId: string | null) {
  return {
    id: fact.id,
    sourceRecordId: fact.sourceRecordId,
    catalogItemId: fact.catalogItemId,
    claimId: fact.claimId,
    extractionRunId: runId,
    factLayer: fact.factLayer,
    factType: fact.factType,
    fieldKey: fact.fieldKey,
    canonicalKey: fact.canonicalKey,
    normalizationRuleId: fact.normalizationRuleId,
    decisionReady: fact.decisionReady,
    extractionSource: fact.extractionSource,
    missingFields: toPrismaJsonValue(fact.missingFields),
    qualityFlags: fact.qualityFlags,
    sourceTextHash: fact.sourceTextHash,
    originalValue: fact.originalValue,
    originalUnit: fact.originalUnit,
    normalizedValue: fact.normalizedValue,
    normalizedText: fact.normalizedText,
    normalizedUnit: fact.normalizedUnit,
    uncertainty: fact.uncertainty,
    confidence: fact.confidence,
    extractionStatus: fact.extractionStatus,
    normalizationStatus: fact.normalizationStatus,
    systemType: fact.systemType,
    reactorType: fact.reactorType,
    componentType: fact.componentType,
    material: fact.material,
    metricType: fact.metricType,
    operatingConditionKey: fact.operatingConditionKey,
    evidenceQuality: fact.evidenceQuality,
    payload: toPrismaJsonValue(fact.payload),
  };
}

async function persistCanonicalizationBatch(input: {
  prisma: PrismaClientLike;
  runId: string | null;
  records: any[];
  results: Array<{
    record: any;
    status: string;
    facts: any[];
    missingFields: string[];
    qualityFlags: string[];
    usedSegments: number;
    sourceTextHashes: string[];
    error?: string;
  }>;
  counters: CanonicalizationCounters;
  config: CanonicalizationCliConfig;
}) {
  const { prisma, runId, records, results, counters, config } = input;
  const catalogItemIds = records.map((record) => record.id);
  const facts = results.flatMap((result) => result.facts);
  const factRows = facts.map((fact) => toFactCreateInput(fact, runId));
  const benchmarkRows = results
    .flatMap((result) =>
      result.facts.map((fact) =>
        buildBenchmarkRecord({
          record: result.record,
          fact,
          runId,
        }),
      ),
    )
    .filter(Boolean);
  const auditRows = results.map((result) => ({
    sourceRecordId: result.record.sourceRecordId,
    catalogItemId: result.record.id,
    eventType: `evidence_canonicalization_${result.status}`,
    decision: result.status,
    actor: 'system',
    reason:
      result.status === CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED
        ? 'Deterministic canonical extractor produced auditable facts.'
        : 'Canonicalization classified the source without inventing missing scientific facts.',
    payload: toPrismaJsonObject({
      extraction_run_id: runId,
      fact_count: result.facts.length,
      decision_ready_count: result.facts.filter((fact) => fact.decisionReady)
        .length,
      benchmark_record_count: result.facts.filter(
        (fact) =>
          fact.decisionReady &&
          (fact.metricType || fact.material || fact.componentType),
      ).length,
      missing_fields: result.missingFields,
      quality_flags: result.qualityFlags,
      source_text_hashes: result.sourceTextHashes,
      used_segments: result.usedSegments,
      error: result.error,
      no_fabrication: true,
    }),
  }));

  counters.processed += records.length;
  counters.canonicalFacts += factRows.length;
  counters.benchmarkRecords += benchmarkRows.length;
  for (const result of results) {
    addCounterForStatus(counters, result.status);
  }

  if (config.dryRun) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.evidenceBenchmarkRecord.deleteMany({
        where: {
          catalogItemId: { in: catalogItemIds },
          OR: [
            { extractionRunId: { not: null } },
            { canonicalKey: { not: null } },
            { sourceTextHash: { not: null } },
          ],
        },
      });
      await tx.scientificEvidenceFact.deleteMany({
        where: {
          catalogItemId: { in: catalogItemIds },
          factLayer: CANONICAL_FACT_LAYER,
        },
      });

      if (config.replacePlaceholders) {
        await tx.scientificEvidenceFact.updateMany({
          where: {
            catalogItemId: { in: catalogItemIds },
            factLayer: 'ingestion_claim_placeholder',
          },
          data: {
            decisionReady: false,
            extractionSource: 'ingestion_claim_placeholder',
          },
        });
      }

      if (factRows.length > 0) {
        await tx.scientificEvidenceFact.createMany({ data: factRows });
      }
      if (benchmarkRows.length > 0) {
        await tx.evidenceBenchmarkRecord.createMany({
          data: benchmarkRows as Prisma.EvidenceBenchmarkRecordCreateManyInput[],
        });
      }

      await tx.evidenceIngestionAudit.createMany({ data: auditRows });

      const statuses = new Map<string, string[]>();
      for (const result of results) {
        const ids = statuses.get(result.status) ?? [];
        ids.push(result.record.id);
        statuses.set(result.status, ids);
      }

      for (const [status, ids] of statuses.entries()) {
        await tx.externalEvidenceCatalogItem.updateMany({
          where: { id: { in: ids } },
          data: {
            extractionStatus: status,
            normalizationStatus:
              status === CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED
                ? 'canonical_normalized'
                : 'canonical_pending',
            reviewRequired:
              status === CANONICALIZATION_STATUSES.NEEDS_REVIEW ||
              status === CANONICALIZATION_STATUSES.EXTRACTION_FAILED,
            reviewStatus:
              status === CANONICALIZATION_STATUSES.NEEDS_REVIEW ||
              status === CANONICALIZATION_STATUSES.EXTRACTION_FAILED
                ? 'PENDING'
                : undefined,
          },
        });
      }
    },
    { maxWait: 20_000, timeout: 120_000 },
  );
}

async function fetchAcceptedCatalogBatch(input: {
  prisma: PrismaClientLike;
  batchSize: number;
  lastCatalogItemId: string | null;
  snapshotCutoff: Date;
}) {
  return input.prisma.externalEvidenceCatalogItem.findMany({
    where: buildCatalogWhere({
      lastCatalogItemId: input.lastCatalogItemId,
      snapshotCutoff: input.snapshotCutoff,
    }),
    include: {
      sourceRecord: {
        include: {
          sourceTextChunks: {
            orderBy: [{ chunkIndex: 'asc' }],
            take: 8,
          },
        },
      },
      claims: {
        orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
        take: 16,
      },
    },
    orderBy: [{ id: 'asc' }],
    take: input.batchSize,
  });
}

async function updateRunProgress(input: {
  prisma: PrismaClientLike;
  runId: string | null;
  counters: CanonicalizationCounters;
  lastCatalogItemId: string | null;
  snapshotCutoff: Date;
  completed?: boolean;
}) {
  if (!input.runId) {
    return;
  }

  await input.prisma.evidenceCanonicalizationRun.update({
    where: { id: input.runId },
    data: {
      status: input.completed ? 'COMPLETED' : 'STARTED',
      recordsProcessed: { increment: input.counters.processed },
      recordsCanonicalExtracted: {
        increment: input.counters.canonicalExtracted,
      },
      recordsInsufficientSource: {
        increment: input.counters.insufficientSource,
      },
      recordsNeedsFullText: { increment: input.counters.needsFullText },
      recordsNeedsReview: { increment: input.counters.needsReview },
      recordsFailed: { increment: input.counters.failed },
      recordsSkipped: { increment: input.counters.skipped },
      canonicalFactsStored: { increment: input.counters.canonicalFacts },
      benchmarkRecordsStored: { increment: input.counters.benchmarkRecords },
      completedAt: input.completed ? new Date() : undefined,
      checkpoint: toPrismaJsonObject({
        last_catalog_item_id: input.lastCatalogItemId,
        snapshot_cutoff: input.snapshotCutoff.toISOString(),
      }),
    },
  });
}

export async function runCanonicalScientificEvidenceBackfill(
  config: CanonicalizationCliConfig,
  prisma = getPrismaClient(),
) {
  const run = await findOrCreateCanonicalizationRun(prisma, config);
  const snapshotCutoff =
    run?.snapshotCutoff ??
    new Date(Date.now() + 1000);
  let lastCatalogItemId = readCheckpointLastCatalogItemId(run);
  let totalProcessed = 0;
  const runId = run?.id ?? null;
  const overallCounters = emptyCounters();

  console.log(
    JSON.stringify({
      event: 'canonicalization_started',
      run_id: runId,
      dry_run: config.dryRun,
      batch_size: config.batchSize,
      limit: config.limit,
      full_text_mode: config.fullTextMode,
      llm_mode: config.llmMode,
      snapshot_cutoff: snapshotCutoff.toISOString(),
    }),
  );

  while (config.limit === null || totalProcessed < config.limit) {
    const remaining =
      config.limit === null ? config.batchSize : config.limit - totalProcessed;
    const batch = await fetchAcceptedCatalogBatch({
      prisma,
      batchSize: Math.min(config.batchSize, remaining),
      lastCatalogItemId,
      snapshotCutoff,
    });

    if (batch.length === 0) {
      break;
    }

    const results = batch.map((record) => ({
      record,
      ...canonicalizeScientificEvidenceRecord(record, {
        fullTextMode: config.fullTextMode,
        llmMode: config.llmMode,
      }),
    }));
    const batchCounters = emptyCounters();
    await persistCanonicalizationBatch({
      prisma,
      runId,
      records: batch,
      results,
      counters: batchCounters,
      config,
    });

    overallCounters.processed += batchCounters.processed;
    overallCounters.canonicalExtracted += batchCounters.canonicalExtracted;
    overallCounters.insufficientSource += batchCounters.insufficientSource;
    overallCounters.needsFullText += batchCounters.needsFullText;
    overallCounters.needsReview += batchCounters.needsReview;
    overallCounters.failed += batchCounters.failed;
    overallCounters.skipped += batchCounters.skipped;
    overallCounters.canonicalFacts += batchCounters.canonicalFacts;
    overallCounters.benchmarkRecords += batchCounters.benchmarkRecords;

    lastCatalogItemId = batch[batch.length - 1]?.id ?? lastCatalogItemId;
    totalProcessed += batch.length;

    await updateRunProgress({
      prisma,
      runId,
      counters: batchCounters,
      lastCatalogItemId,
      snapshotCutoff,
    });

    console.log(
      JSON.stringify({
        event: 'canonicalization_batch_completed',
        run_id: runId,
        last_catalog_item_id: lastCatalogItemId,
        ...batchCounters,
      }),
    );
  }

  await updateRunProgress({
    prisma,
    runId,
    counters: emptyCounters(),
    lastCatalogItemId,
    snapshotCutoff,
    completed: true,
  });

  console.log(
    JSON.stringify({
      event: 'canonicalization_completed',
      run_id: runId,
      ...overallCounters,
    }),
  );

  return {
    runId,
    counters: overallCounters,
    lastCatalogItemId,
  };
}

async function main() {
  const config = parseCanonicalizationCliConfig();

  try {
    await runCanonicalScientificEvidenceBackfill(config);
  } finally {
    await disconnectPrismaClient();
  }
}

if (process.argv[1]?.endsWith('canonicalize-scientific-evidence.ts')) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'canonicalization_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
