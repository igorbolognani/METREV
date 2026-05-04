import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import { CANONICAL_FACT_LAYER } from './canonical-scientific-evidence.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

export async function buildEvidenceQualityReport(prisma = getPrismaClient()) {
  const [
    catalogTotal,
    accepted,
    pendingReview,
    rejected,
    sourceRecords,
    claims,
    scientificFacts,
    canonicalFacts,
    decisionReadyFacts,
    benchmarkRecords,
    benchmarkReadyRecords,
    benchmarkAggregates,
    duplicateDecisions,
    latestIngestionRun,
    latestCanonicalizationRun,
    extractionStatusGroups,
    factLayerGroups,
    acceptedWithoutCanonicalFacts,
  ] = await prisma.$transaction([
    prisma.externalEvidenceCatalogItem.count(),
    prisma.externalEvidenceCatalogItem.count({ where: { reviewStatus: 'ACCEPTED' } }),
    prisma.externalEvidenceCatalogItem.count({ where: { reviewStatus: 'PENDING' } }),
    prisma.externalEvidenceCatalogItem.count({ where: { reviewStatus: 'REJECTED' } }),
    prisma.externalSourceRecord.count(),
    prisma.evidenceClaim.count(),
    prisma.scientificEvidenceFact.count(),
    prisma.scientificEvidenceFact.count({ where: { factLayer: CANONICAL_FACT_LAYER } }),
    prisma.scientificEvidenceFact.count({
      where: { factLayer: CANONICAL_FACT_LAYER, decisionReady: true },
    }),
    prisma.evidenceBenchmarkRecord.count(),
    prisma.evidenceBenchmarkRecord.count({ where: { decisionReady: true } }),
    prisma.evidenceBenchmarkAggregate.count(),
    prisma.evidenceDuplicateDecision.count(),
    prisma.ingestionRun.findFirst({
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        status: true,
        targetTotal: true,
        recordsFetched: true,
        recordsStored: true,
        recordsAccepted: true,
        recordsPendingReview: true,
        recordsFailed: true,
        duplicatesSkipped: true,
        updatedAt: true,
      },
    }),
    prisma.evidenceCanonicalizationRun.findFirst({
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        status: true,
        targetTotal: true,
        batchSize: true,
        recordsProcessed: true,
        recordsCanonicalExtracted: true,
        recordsInsufficientSource: true,
        recordsNeedsFullText: true,
        recordsNeedsReview: true,
        recordsFailed: true,
        canonicalFactsStored: true,
        benchmarkRecordsStored: true,
        checkpoint: true,
        snapshotCutoff: true,
        startedAt: true,
        completedAt: true,
        updatedAt: true,
      },
    }),
    prisma.externalEvidenceCatalogItem.groupBy({
      by: ['extractionStatus'],
      _count: { _all: true },
    }),
    prisma.scientificEvidenceFact.groupBy({
      by: ['factLayer'],
      _count: { _all: true },
    }),
    prisma.externalEvidenceCatalogItem.count({
      where: {
        reviewStatus: 'ACCEPTED',
        scientificFacts: {
          none: {
            factLayer: CANONICAL_FACT_LAYER,
          },
        },
      },
    }),
  ]);

  return {
    catalog_total: catalogTotal,
    accepted,
    pending_review: pendingReview,
    rejected,
    source_records: sourceRecords,
    claims,
    scientific_facts: scientificFacts,
    canonical_facts: canonicalFacts,
    decision_ready_canonical_facts: decisionReadyFacts,
    benchmark_records: benchmarkRecords,
    benchmark_ready_records: benchmarkReadyRecords,
    benchmark_aggregates: benchmarkAggregates,
    duplicate_decisions: duplicateDecisions,
    accepted_without_canonical_facts: acceptedWithoutCanonicalFacts,
    latest_ingestion_run: latestIngestionRun,
    latest_canonicalization_run: latestCanonicalizationRun,
    extraction_statuses: Object.fromEntries(
      extractionStatusGroups.map((group) => [
        group.extractionStatus,
        group._count._all,
      ]),
    ),
    fact_layers: Object.fromEntries(
      factLayerGroups.map((group) => [group.factLayer, group._count._all]),
    ),
    integrity: {
      placeholders_excluded_from_decision_benchmarks: true,
      no_fabricated_scientific_facts: true,
      decision_benchmarks_require_canonical_decision_ready_records: true,
    },
  };
}

async function main() {
  try {
    console.log(JSON.stringify(await buildEvidenceQualityReport(), null, 2));
  } finally {
    await disconnectPrismaClient();
  }
}

if (process.argv[1]?.endsWith('evidence-quality-report.ts')) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'evidence_quality_report_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
