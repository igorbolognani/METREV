import {
    MFC_MEC_30000_PRESET_ID,
    createResearchRepository,
    planResearchBackfillPreset,
} from '../src';
import { disconnectPrismaClient } from '../src/prisma-client';

import { pathToFileURL } from 'node:url';
import {
    optionFlag,
    optionNumber,
    optionValue,
    parseScriptOptions,
} from './external-ingestion-shared.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

export async function runQueueResearchBackfillTarget(
  overrides: Record<string, unknown> = {},
) {
  const options = {
    ...parseScriptOptions(),
    ...overrides,
  };
  const configPath = optionValue(options, 'config', undefined);
  const preset = optionValue(options, 'preset', MFC_MEC_30000_PRESET_ID);
  const targetRecords = optionNumber(options, 'targetRecords', 30000);
  const dryRun = optionFlag(options, 'dryRun', false);
  const plan = planResearchBackfillPreset({
    configPath,
    presetId:
      preset === 'mfc-mec-30000'
        ? MFC_MEC_30000_PRESET_ID
        : MFC_MEC_30000_PRESET_ID,
    targetRecords,
  });
  const repository = createResearchRepository();

  try {
    const existing = await repository.listResearchBackfills();
    const activeQueries = new Set(
      existing.items
        .filter((item) => item.status === 'queued' || item.status === 'running')
        .map((item) => item.query.trim().toLowerCase()),
    );
    const skippedQueries: string[] = [];
    let queuedRuns = 0;

    if (!dryRun) {
      for (const backfill of plan.plannedBackfills) {
        const queryKey = backfill.query.trim().toLowerCase();

        if (activeQueries.has(queryKey)) {
          skippedQueries.push(backfill.query);
          continue;
        }

        await repository.enqueueResearchBackfill({
          ...backfill,
          actorId: 'script:queue-research-backfill-target',
        });
        activeQueries.add(queryKey);
        queuedRuns += 1;
      }
    }

    const backfills = dryRun
      ? existing.items
      : (await repository.listResearchBackfills()).items;

    return {
      preset_id: plan.presetId,
      target_records: plan.targetRecords,
      query_count: plan.queryCount,
      per_provider_limit: plan.plannedBackfills[0]?.per_provider_limit ?? 0,
      max_pages: plan.plannedBackfills[0]?.max_pages ?? 0,
      queued_runs: queuedRuns,
      skipped_queries: skippedQueries,
      dry_run: dryRun,
      backfills,
    };
  } finally {
    await disconnectPrismaClient();
  }
}

const invokedScriptUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (invokedScriptUrl && import.meta.url === invokedScriptUrl) {
  runQueueResearchBackfillTarget()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
