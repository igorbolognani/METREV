import { disconnectPrismaClient } from '../src/prisma-client';

import { runCanonicalScientificEvidenceBackfill } from './canonicalize-scientific-evidence';
import { runScientificEvidenceIngestion } from './ingest-scientific-evidence';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';
import { refreshCanonicalEvidenceBenchmarks } from './refresh-evidence-benchmarks';
import { buildEvidenceReadinessReport } from './evidence-readiness-report';

loadWorkspaceEnv(import.meta.url);

const DEFAULT_CONFIG = '../data/table-ready-expansion.config.json';

type ExpansionPlan = {
  canonical_limit: number;
  config: string;
  dry_run: boolean;
  ingestion_batch_size: number;
  lawful_acquisition_policy: string;
  max_provider_pages: number;
  query_limit: number;
  readiness_limit: number;
  stages: string[];
  target_total: number;
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

export function buildTableReadyExpansionPlan(
  input: {
    canonicalLimit?: number;
    config?: string;
    dryRun?: boolean;
    ingestionBatchSize?: number;
    maxProviderPages?: number;
    queryLimit?: number;
    readinessLimit?: number;
    targetTotal?: number;
  } = {},
) {
  const targetTotal = Math.max(1, Math.min(input.targetTotal ?? 500, 5000));
  const queryLimit = Math.max(1, Math.min(input.queryLimit ?? 20, 20));
  return {
    canonical_limit: Math.max(1, Math.min(input.canonicalLimit ?? 500, 5000)),
    config: input.config ?? DEFAULT_CONFIG,
    dry_run: input.dryRun ?? true,
    ingestion_batch_size: Math.max(
      1,
      Math.min(input.ingestionBatchSize ?? 100, 1000),
    ),
    lawful_acquisition_policy:
      'Only existing artifacts/chunks, OA metadata/full-text URLs, publisher OA URLs, Europe PMC OA content, Semantic Scholar OA links, Unpaywall/OpenAlex OA URLs, and analyst-provided local PDFs with access/license metadata may be used. Paywall bypass sources are out of scope.',
    max_provider_pages: Math.max(
      1,
      Math.min(input.maxProviderPages ?? 20, 100),
    ),
    query_limit: queryLimit,
    readiness_limit: Math.max(1, Math.min(input.readinessLimit ?? 500, 5000)),
    stages: [
      'search focused MFC/MEC wastewater and biosensor queries for lawful OA/bibliographic metadata',
      'hydrate open full text and persist source chunks during canonicalization',
      'store canonical scientific facts and normalized benchmark records',
      'refresh aggregate benchmarks from decision-ready records',
      'emit strict article-level readiness report',
    ],
    target_total: targetTotal,
  } satisfies ExpansionPlan;
}

export async function runTableReadyExpansionCampaign(plan: ExpansionPlan) {
  if (plan.dry_run) {
    console.log(JSON.stringify({ campaign_plan: plan }, null, 2));
    return { dryRun: true, plan };
  }

  const ingestion = await runScientificEvidenceIngestion({
    'auto-accept': true,
    'batch-size': plan.ingestion_batch_size,
    config: plan.config,
    'max-provider-pages': plan.max_provider_pages,
    queryLimit: plan.query_limit,
    resume: true,
    sources: 'openalex,crossref,europepmc',
    'target-total': plan.target_total,
  });
  const canonicalization = await runCanonicalScientificEvidenceBackfill({
    batchSize: 50,
    dryRun: false,
    fullTextConcurrency: 3,
    fullTextMode: 'hydrate',
    limit: plan.canonical_limit,
    llmMode: 'disabled',
    replacePlaceholders: true,
    resume: true,
  });
  const benchmarkRefresh = await refreshCanonicalEvidenceBenchmarks();
  const readiness = await buildEvidenceReadinessReport({
    limit: plan.readiness_limit,
  });
  const result = {
    benchmarkRefresh,
    canonicalization,
    ingestion,
    plan,
    readinessSummary: readiness.summary,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const plan = buildTableReadyExpansionPlan({
    canonicalLimit: optionNumber('canonical-limit', 500),
    config: optionValue('config', DEFAULT_CONFIG),
    dryRun: !hasFlag('--execute'),
    ingestionBatchSize: optionNumber('batch-size', 100),
    maxProviderPages: optionNumber('max-provider-pages', 20),
    queryLimit: optionNumber('queryLimit', 20),
    readinessLimit: optionNumber('readiness-limit', 500),
    targetTotal: optionNumber('target-total', 500),
  });

  try {
    await runTableReadyExpansionCampaign(plan);
  } finally {
    await disconnectPrismaClient();
  }
}

if (process.argv[1]?.endsWith('expand-table-ready-corpus.ts')) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'table_ready_expansion_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
