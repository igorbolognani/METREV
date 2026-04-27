import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import {
  collectIngestionInventory,
  optionFlag,
  optionList,
  optionNumber,
  optionValue,
  parseScriptOptions,
  readJsonFile,
} from './external-ingestion-shared.mjs';
import { runCrossrefIngestion } from './ingest-crossref-literature';
import { runCuratedManifestIngestion } from './ingest-curated-manifest';
import { runEuropePmcIngestion } from './ingest-europe-pmc-literature';
import { runOpenAlexIngestion } from './ingest-openalex-literature';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

const bootstrapTriggerMode = 'bigdata_bootstrap';

const runnerBySource = {
  openalex: runOpenAlexIngestion,
  crossref: runCrossrefIngestion,
  europepmc: runEuropePmcIngestion,
};

type BootstrapSource = keyof typeof runnerBySource;

type BootstrapRunner = (
  overrides?: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

function parseBootstrapCheckpoint(checkpoint: unknown) {
  const record =
    checkpoint && typeof checkpoint === 'object' && !Array.isArray(checkpoint)
      ? checkpoint
      : {};
  const cursor =
    typeof record.cursor === 'string' && record.cursor.trim().length > 0
      ? record.cursor
      : '*';
  const pagesProcessed =
    typeof record.pages_processed === 'number' &&
    Number.isFinite(record.pages_processed) &&
    record.pages_processed >= 0
      ? Math.trunc(record.pages_processed)
      : 0;

  return {
    cursor,
    pagesProcessed,
  };
}

function mapBootstrapSourceToDatabase(source: BootstrapSource) {
  switch (source) {
    case 'crossref':
      return 'CROSSREF';
    case 'europepmc':
      return 'EUROPE_PMC';
    default:
      return 'OPENALEX';
  }
}

async function findBootstrapResumeState(input: {
  prisma: {
    ingestionRun: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        checkpoint: unknown;
        status: string;
      } | null>;
    };
  };
  query: string;
  source: BootstrapSource;
}) {
  const record = await input.prisma.ingestionRun.findFirst({
    where: {
      query: input.query,
      sourceType: mapBootstrapSourceToDatabase(input.source),
      triggerMode: bootstrapTriggerMode,
    },
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      checkpoint: true,
      status: true,
    },
  });

  if (!record) {
    return null;
  }

  return {
    status: record.status,
    ...parseBootstrapCheckpoint(record.checkpoint),
  };
}

export async function runBigDataBootstrap(
  overrides = {},
  dependencies: {
    collectInventory?: typeof collectIngestionInventory;
    configData?: Record<string, unknown>;
    prisma?: {
      ingestionRun: {
        findFirst: (args: Record<string, unknown>) => Promise<{
          checkpoint: unknown;
          status: string;
        } | null>;
      };
    };
    runners?: Partial<Record<BootstrapSource, BootstrapRunner>>;
  } = {},
) {
  const options = {
    ...parseScriptOptions(),
    ...overrides,
  };
  const configPath = optionValue(
    options,
    'config',
    '../data/bigdata-bootstrap.config.json',
  );
  const config =
    dependencies.configData ?? readJsonFile(configPath, import.meta.url);
  const dryRun = optionFlag(options, 'dryRun', false);
  const resume = optionFlag(options, 'resume', true);
  const selectedSources = optionList(
    options,
    'sources',
    Object.keys(runnerBySource),
  ) as string[];
  const queryLimit = optionNumber(
    options,
    'queryLimit',
    Array.isArray(config?.queries) ? config.queries.length : 0,
    0,
    1000,
  );
  const perQueryLimitOverride = optionNumber(
    options,
    'perQueryLimit',
    Number.NaN,
    1,
    5000,
  );
  const configuredRunners = {
    ...runnerBySource,
    ...dependencies.runners,
  } as Record<BootstrapSource, BootstrapRunner>;
  const ownsPrisma = !dependencies.prisma && !dryRun;
  const prisma = dependencies.prisma ?? (dryRun ? null : getPrismaClient());

  const queries = Array.isArray(config?.queries)
    ? config.queries.slice(0, queryLimit || config.queries.length)
    : [];
  const runResults = [];

  for (const source of selectedSources) {
    const normalizedSource = source.toLowerCase() as BootstrapSource;
    const runner = configuredRunners[normalizedSource];
    const sourceConfig = config?.sources?.[normalizedSource];
    if (!runner || sourceConfig?.enabled === false) {
      continue;
    }

    for (const query of queries) {
      const configuredMaxPages =
        sourceConfig?.maxPages ?? config?.defaults?.maxPages ?? 1;
      const resumeState =
        resume && prisma
          ? await findBootstrapResumeState({
              prisma,
              query,
              source: normalizedSource,
            })
          : null;
      const completedPages = resumeState?.pagesProcessed ?? 0;
      const remainingPages = Math.max(0, configuredMaxPages - completedPages);

      if (!dryRun && resumeState && remainingPages === 0) {
        runResults.push({
          query,
          resumed: false,
          skipped: true,
          sourceType: normalizedSource.toUpperCase(),
        });
        continue;
      }

      const result = await runner({
        query,
        limit: Number.isFinite(perQueryLimitOverride)
          ? perQueryLimitOverride
          : (sourceConfig?.perQueryLimit ??
            config?.defaults?.perQueryLimit ??
            25),
        pageSize: sourceConfig?.pageSize ?? config?.defaults?.pageSize ?? 25,
        maxPages: Math.max(1, remainingPages || configuredMaxPages),
        cursor: resumeState?.cursor,
        dryRun,
        triggerMode: bootstrapTriggerMode,
      });
      runResults.push({
        ...result,
        resumed: Boolean(resumeState),
        skipped: false,
      });
    }
  }

  const manifests = Array.isArray(config?.manifests) ? config.manifests : [];
  for (const manifestPath of manifests) {
    const result = await runCuratedManifestIngestion({
      manifest: manifestPath,
      dryRun,
    });
    runResults.push(result);
  }

  const summary = {
    configPath,
    dryRun,
    executedRuns: runResults.filter((result) => !result.skipped).length,
    resumedRuns: runResults.filter((result) => result.resumed).length,
    skippedRuns: runResults.filter((result) => result.skipped).length,
    totalRecordsFetched: runResults.reduce(
      (total, result) => total + Number(result.recordsFetched ?? 0),
      0,
    ),
    totalRecordsStored: runResults.reduce(
      (total, result) => total + Number(result.recordsStored ?? 0),
      0,
    ),
    totalClaimsStored: runResults.reduce(
      (total, result) =>
        total + Number(result.claimsStored ?? result.claimCount ?? 0),
      0,
    ),
    totalSupplierDocumentsStored: runResults.reduce(
      (total, result) =>
        total +
        Number(
          result.supplierDocumentsStored ?? result.supplierDocumentCount ?? 0,
        ),
      0,
    ),
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  try {
    if (!prisma) {
      console.log(JSON.stringify(summary, null, 2));
      return summary;
    }

    const inventory = await (
      dependencies.collectInventory ?? collectIngestionInventory
    )(prisma as never);
    const output = {
      ...summary,
      inventory,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  } finally {
    if (ownsPrisma) {
      await disconnectPrismaClient();
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runBigDataBootstrap();
}
