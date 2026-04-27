import { createResearchRepository } from '@metrev/database';

import { runResearchWorkerCycle, summarizeWorkerCycle } from './worker';

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const repository = createResearchRepository();
  const once = process.env.METREV_RESEARCH_WORKER_ONCE === 'true';
  const pollMs = parsePositiveInteger(
    process.env.METREV_RESEARCH_WORKER_POLL_MS,
    5000,
  );
  const extractionLimit = parsePositiveInteger(
    process.env.METREV_RESEARCH_WORKER_EXTRACTION_LIMIT,
    25,
  );
  const backfillLimit = parsePositiveInteger(
    process.env.METREV_RESEARCH_WORKER_BACKFILL_LIMIT,
    1,
  );

  try {
    do {
      const result = await runResearchWorkerCycle({
        repository,
        extractionLimit,
        backfillLimit,
      });
      console.log(`[research-worker] ${summarizeWorkerCycle(result)}`);

      if (once) {
        break;
      }

      if (
        result.backfillsProcessed === 0 &&
        result.extractionJobsProcessed === 0
      ) {
        await delay(pollMs);
      }
    } while (true);
  } finally {
    await repository.disconnect();
  }
}

void main().catch((error) => {
  console.error('[research-worker] fatal error', error);
  process.exitCode = 1;
});
