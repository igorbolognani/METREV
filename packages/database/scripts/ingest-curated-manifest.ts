import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';

import {
  deduplicateEntries,
  normalizeCuratedManifestRecord,
  optionFlag,
  optionValue,
  parseScriptOptions,
  persistNormalizedEntries,
  readJsonFile,
  summarizeNormalizedEntries,
} from './external-ingestion-shared.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

type CuratedManifestRecord = Record<string, unknown>;

export function loadCuratedManifestRecords(
  manifestPath: string,
  importMetaUrl: string,
) {
  const manifest = readJsonFile(manifestPath, importMetaUrl);
  const resolvedManifestPath = isAbsolute(manifestPath)
    ? manifestPath
    : resolve(dirname(fileURLToPath(importMetaUrl)), manifestPath);
  const manifestFileUrl = pathToFileURL(resolvedManifestPath).href;
  const directRecords: CuratedManifestRecord[] = Array.isArray(
    manifest?.records,
  )
    ? manifest.records
    : [];
  const shardPaths: string[] = Array.isArray(manifest?.shards)
    ? manifest.shards.filter(
        (value: unknown): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
    : [];
  const shardRecords = shardPaths.flatMap((shardPath) => {
    const shard = readJsonFile(shardPath, manifestFileUrl);

    if (Array.isArray(shard)) {
      return shard as CuratedManifestRecord[];
    }

    return Array.isArray(shard?.records)
      ? (shard.records as CuratedManifestRecord[])
      : [];
  });

  return {
    manifest,
    records: [...directRecords, ...shardRecords],
    shardCount: shardPaths.length,
    resolvedManifestPath,
  };
}

export async function runCuratedManifestIngestion(overrides = {}) {
  const options = {
    ...parseScriptOptions(),
    ...overrides,
  };

  const manifestPath = optionValue(
    options,
    'manifest',
    '../data/curated-bigdata-manifest.json',
  );
  const dryRun = optionFlag(options, 'dryRun', false);
  const { manifest, records, shardCount } = loadCuratedManifestRecords(
    manifestPath,
    import.meta.url,
  );
  const startedAt = new Date();
  const entries = deduplicateEntries(
    records
      .map((record: CuratedManifestRecord) =>
        normalizeCuratedManifestRecord(
          record,
          startedAt.toISOString(),
          manifestPath,
        ),
      )
      .filter(Boolean),
  );

  if (dryRun) {
    const summary = summarizeNormalizedEntries(entries);
    const output = {
      sourceType: 'CURATED_MANIFEST',
      manifestPath,
      shardCount,
      dryRun: true,
      ...summary,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  }

  const prisma = getPrismaClient();
  const run = await prisma.ingestionRun.create({
    data: {
      sourceType: 'CURATED_MANIFEST',
      triggerMode: 'manual_script',
      query: manifest?.name ?? manifestPath,
      status: 'STARTED',
      recordsFetched: records.length,
      recordsStored: 0,
      summary: {
        manifest_path: manifestPath,
        manifest_version: manifest?.version ?? null,
        shard_count: shardCount,
      },
      startedAt,
    },
  });

  try {
    const persisted = await persistNormalizedEntries(prisma, entries, {
      runId: run.id,
    });

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        recordsStored: persisted.recordsStored,
        summary: {
          manifest_path: manifestPath,
          manifest_version: manifest?.version ?? null,
          shard_count: shardCount,
          claims_stored: persisted.claimsStored,
          supplier_documents_stored: persisted.supplierDocumentsStored,
        },
        completedAt: new Date(),
      },
    });

    const output = {
      runId: run.id,
      sourceType: 'CURATED_MANIFEST',
      manifestPath,
      shardCount,
      recordsFetched: records.length,
      ...persisted,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        failureDetail: {
          message: error instanceof Error ? error.message : String(error),
        },
      },
    });
    throw error;
  } finally {
    await disconnectPrismaClient();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runCuratedManifestIngestion();
}
