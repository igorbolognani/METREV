import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import { loadWorkspaceEnv } from './load-workspace-env.mjs';
import {
  evaluateTechnicalCompleteness,
  type TechnicalCompletenessAction,
  type TechnicalCompletenessAssessment,
  type TechnicalCompletenessCandidate,
} from './table-ready-completeness';

loadWorkspaceEnv(import.meta.url);

type EvidenceReadinessReportItem = {
  assessment: TechnicalCompletenessAssessment;
  catalog_item_id: string;
  source_record_id: string;
  source_type: string;
  title: string;
};

type EvidenceReadinessReport = {
  generated_at: string;
  items: EvidenceReadinessReportItem[];
  lawful_acquisition_policy: string;
  limit: number;
  summary: {
    action_counts: Record<TechnicalCompletenessAction, number>;
    accepted_records_evaluated: number;
    strict_table_ready_records: number;
  };
};

function hasFlag(flag: string) {
  return process.argv.slice(2).includes(flag);
}

function optionValue(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const raw = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : fallback;
}

function optionNumber(name: string, fallback: number) {
  const parsed = Number(optionValue(name, String(fallback)));
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function emptyActionCounts(): Record<TechnicalCompletenessAction, number> {
  return {
    delete_record: 0,
    keep: 0,
    quarantine_for_review: 0,
    reacquire_full_text: 0,
    reject_from_intake: 0,
    rerun_extraction: 0,
  };
}

function toCandidate(
  record: Awaited<ReturnType<typeof loadAcceptedRecords>>[number],
) {
  return {
    abstractAvailable: Boolean(record.sourceRecord.abstractText?.trim()),
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
  } satisfies TechnicalCompletenessCandidate;
}

async function loadAcceptedRecords(limit: number) {
  return getPrismaClient().externalEvidenceCatalogItem.findMany({
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
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

export async function buildEvidenceReadinessReport(input: { limit: number }) {
  const records = await loadAcceptedRecords(input.limit);
  const items = records.map((record) => ({
    assessment: evaluateTechnicalCompleteness(toCandidate(record)),
    catalog_item_id: record.id,
    source_record_id: record.sourceRecordId,
    source_type: record.sourceRecord.sourceType.toLowerCase(),
    title: record.title,
  }));
  const actionCounts = emptyActionCounts();

  for (const item of items) {
    actionCounts[item.assessment.recommendedAction] += 1;
  }

  return {
    generated_at: new Date().toISOString(),
    items,
    lawful_acquisition_policy:
      'Allowed: existing source artifacts/chunks, Unpaywall/OpenAlex/Europe PMC/Semantic Scholar OA links, publisher OA URLs, and analyst-provided local artifacts with explicit access/license metadata. Disallowed: paywall bypass and piracy mirrors.',
    limit: input.limit,
    summary: {
      action_counts: actionCounts,
      accepted_records_evaluated: items.length,
      strict_table_ready_records: items.filter(
        (item) => item.assessment.strictTableReady,
      ).length,
    },
  } satisfies EvidenceReadinessReport;
}

function escapeCsvValue(value: unknown) {
  const raw = Array.isArray(value) ? value.join(';') : String(value ?? '');
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function toCsv(report: EvidenceReadinessReport) {
  const header = [
    'catalog_item_id',
    'source_record_id',
    'title',
    'source_type',
    'strict_table_ready',
    'score',
    'recommended_action',
    'missing_requirements',
    'flags',
    'overview',
    'reactor_materials',
    'metrics_outputs',
    'decision_metadata',
    'normalized_metric_records',
    'reactor_material_signals',
    'performance_metric_signals',
  ];
  const rows = report.items.map((item) => [
    item.catalog_item_id,
    item.source_record_id,
    item.title,
    item.source_type,
    item.assessment.strictTableReady,
    item.assessment.score,
    item.assessment.recommendedAction,
    item.assessment.missingRequirements,
    item.assessment.flags,
    item.assessment.coverage.overview,
    item.assessment.coverage.reactorMaterials,
    item.assessment.coverage.metricsOutputs,
    item.assessment.coverage.decisionMetadata,
    item.assessment.counts.normalizedMetricRecords,
    item.assessment.counts.reactorMaterialSignals,
    item.assessment.counts.performanceMetricSignals,
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
}

async function writeOutput(input: {
  content: string;
  outputPath: string | null;
}) {
  if (!input.outputPath) {
    console.log(input.content);
    return;
  }

  const resolvedPath = resolve(input.outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, input.content);
  console.log(JSON.stringify({ output_path: resolvedPath }, null, 2));
}

async function main() {
  try {
    const limit = optionNumber('limit', 5000);
    const format = optionValue('format', hasFlag('--csv') ? 'csv' : 'json');
    const outputPath = optionValue('output', '').trim() || null;
    const report = await buildEvidenceReadinessReport({ limit });
    const content =
      format === 'csv' ? toCsv(report) : JSON.stringify(report, null, 2);

    await writeOutput({ content, outputPath });
  } finally {
    await disconnectPrismaClient();
  }
}

if (process.argv[1]?.endsWith('evidence-readiness-report.ts')) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'evidence_readiness_report_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
