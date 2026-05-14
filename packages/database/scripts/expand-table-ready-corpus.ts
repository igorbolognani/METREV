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
  return {
    canonical_limit: input.canonicalLimit ?? 1000,
    config: input.config ?? DEFAULT_CONFIG,
    dry_run: input.dryRun ?? true,
    ingestion_batch_size: input.ingestionBatchSize ?? 50,
    lawful_acquisition_policy:
      'Only existing artifacts/chunks, OA metadata/full-text URLs, publisher OA URLs, Europe PMC OA content, Semantic Scholar OA links, Unpaywall/OpenAlex OA URLs, and analyst-provided local PDFs with access/license metadata may be used. Paywall bypass sources are out of scope.',
    max_provider_pages: input.maxProviderPages ?? 90,
    query_limit: input.queryLimit ?? 30,
    readiness_limit: input.readinessLimit ?? 5000,
    stages: [
      'ingest lawful OA/bibliographic metadata from configured providers',
      'hydrate open full text and persist source chunks during canonicalization',
      'store canonical scientific facts and normalized benchmark records',
      'refresh aggregate benchmarks from decision-ready records',
      'emit strict article-level readiness report',
      'use research:hard-prune --table-ready-only after backup/dry-run approval',
    ],
    target_total: input.targetTotal ?? 5000,
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
    canonicalLimit: optionNumber('canonical-limit', 1000),
    config: optionValue('config', DEFAULT_CONFIG),
    dryRun: !hasFlag('--execute'),
    ingestionBatchSize: optionNumber('batch-size', 50),
    maxProviderPages: optionNumber('max-provider-pages', 90),
    queryLimit: optionNumber('queryLimit', 30),
    readinessLimit: optionNumber('readiness-limit', 5000),
    targetTotal: optionNumber('target-total', 5000),
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
