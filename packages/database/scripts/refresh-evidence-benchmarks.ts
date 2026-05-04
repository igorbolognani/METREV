import { Prisma } from '../generated/prisma/client';
import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

export async function refreshCanonicalEvidenceBenchmarks(
  prisma = getPrismaClient(),
) {
  const latestRun = await prisma.evidenceCanonicalizationRun.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
    select: { id: true },
  });
  const extractionRunId = latestRun?.id ?? null;

  await prisma.evidenceBenchmarkAggregate.deleteMany();

  const inserted = await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "EvidenceBenchmarkAggregate" (
        "id",
        "extractionRunId",
        "systemType",
        "application",
        "componentType",
        "material",
        "membraneSeparator",
        "operatingConditionKey",
        "metricType",
        "canonicalKey",
        "normalizedUnit",
        "publicationYear",
        "evidenceQuality",
        "scale",
        "trl",
        "recordCount",
        "minValue",
        "p25Value",
        "medianValue",
        "p75Value",
        "p90Value",
        "maxValue",
        "meanValue",
        "confidenceCoverage",
        "payload",
        "createdAt",
        "updatedAt"
      )
      WITH grouped AS (
        SELECT
          "systemType",
          "application",
          "componentType",
          "material",
          "membraneSeparator",
          "operatingConditionKey",
          "metricType",
          "canonicalKey",
          "normalizedUnit",
          "publicationYear",
          "evidenceQuality",
          "scale",
          "trl",
          COUNT(*)::integer AS "recordCount",
          MIN("normalizedValue")::double precision AS "minValue",
          percentile_cont(0.25) WITHIN GROUP (ORDER BY "normalizedValue")::double precision AS "p25Value",
          percentile_cont(0.5) WITHIN GROUP (ORDER BY "normalizedValue")::double precision AS "medianValue",
          percentile_cont(0.75) WITHIN GROUP (ORDER BY "normalizedValue")::double precision AS "p75Value",
          percentile_cont(0.9) WITHIN GROUP (ORDER BY "normalizedValue")::double precision AS "p90Value",
          MAX("normalizedValue")::double precision AS "maxValue",
          AVG("normalizedValue")::double precision AS "meanValue",
          (COUNT("confidence")::double precision / NULLIF(COUNT(*)::double precision, 0))::double precision AS "confidenceCoverage"
        FROM "EvidenceBenchmarkRecord"
        WHERE
          "decisionReady" = true
          AND "normalizedValue" IS NOT NULL
          AND "canonicalKey" IS NOT NULL
          AND "normalizedUnit" IS NOT NULL
        GROUP BY
          "systemType",
          "application",
          "componentType",
          "material",
          "membraneSeparator",
          "operatingConditionKey",
          "metricType",
          "canonicalKey",
          "normalizedUnit",
          "publicationYear",
          "evidenceQuality",
          "scale",
          "trl"
      )
      SELECT
        'eba_' || md5(row_number() OVER ()::text || clock_timestamp()::text),
        CAST(${extractionRunId} AS TEXT),
        "systemType",
        "application",
        "componentType",
        "material",
        "membraneSeparator",
        "operatingConditionKey",
        "metricType",
        "canonicalKey",
        "normalizedUnit",
        "publicationYear",
        "evidenceQuality",
        "scale",
        "trl",
        "recordCount",
        "minValue",
        "p25Value",
        "medianValue",
        "p75Value",
        "p90Value",
        "maxValue",
        "meanValue",
        "confidenceCoverage",
        jsonb_build_object(
          'source', 'canonical_scientific_fact_v1',
          'aggregate_version', 'benchmark_percentiles_v1',
          'decision_ready_only', true,
          'placeholder_excluded', true
        ),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM grouped
    `,
  );

  console.log(
    JSON.stringify({
      event: 'evidence_benchmark_refresh_completed',
      extraction_run_id: extractionRunId,
      aggregate_rows_inserted: inserted,
    }),
  );

  return { extractionRunId, aggregateRowsInserted: Number(inserted) };
}

async function main() {
  try {
    await refreshCanonicalEvidenceBenchmarks();
  } finally {
    await disconnectPrismaClient();
  }
}

if (process.argv[1]?.endsWith('refresh-evidence-benchmarks.ts')) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'evidence_benchmark_refresh_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
