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

const runnerBySource = {
  openalex: runOpenAlexIngestion,
  crossref: runCrossrefIngestion,
  europepmc: runEuropePmcIngestion,
};

type BootstrapSource = keyof typeof runnerBySource;

export async function runBigDataBootstrap(overrides = {}) {
  const options = {
    ...parseScriptOptions(),
    ...overrides,
  };
  const configPath = optionValue(
    options,
    'config',
    '../data/bigdata-bootstrap.config.json',
  );
  const config = readJsonFile(configPath, import.meta.url);
  const dryRun = optionFlag(options, 'dryRun', false);
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

  const queries = Array.isArray(config?.queries)
    ? config.queries.slice(0, queryLimit || config.queries.length)
    : [];
  const runResults = [];

  for (const source of selectedSources) {
    const normalizedSource = source.toLowerCase() as BootstrapSource;
    const runner = runnerBySource[normalizedSource];
    const sourceConfig = config?.sources?.[normalizedSource];
    if (!runner || sourceConfig?.enabled === false) {
      continue;
    }

    for (const query of queries) {
      const result = await runner({
        query,
        limit: Number.isFinite(perQueryLimitOverride)
          ? perQueryLimitOverride
          : (sourceConfig?.perQueryLimit ??
            config?.defaults?.perQueryLimit ??
            25),
        pageSize: sourceConfig?.pageSize ?? config?.defaults?.pageSize ?? 25,
        maxPages: sourceConfig?.maxPages ?? config?.defaults?.maxPages ?? 1,
        dryRun,
      });
      runResults.push(result);
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
    executedRuns: runResults.length,
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

  const prisma = getPrismaClient();
  try {
    const inventory = await collectIngestionInventory(prisma);
    const output = {
      ...summary,
      inventory,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  } finally {
    await disconnectPrismaClient();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runBigDataBootstrap();
}
