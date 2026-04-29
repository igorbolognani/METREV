import {
  assertRuntimeDatabaseReady,
  createResearchRepository,
  type ResearchRepository,
} from '@metrev/database';
import { initializeTelemetry } from '@metrev/telemetry/node';

import {
  createWorkerHealthMonitor,
  startWorkerHealthServer,
  type StartedWorkerHealthServer,
} from './health';
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

function parseNonNegativeInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function main() {
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
  const healthPort = parseNonNegativeInteger(
    process.env.METREV_RESEARCH_WORKER_HEALTH_PORT,
    4020,
  );
  const healthHost =
    process.env.METREV_RESEARCH_WORKER_HEALTH_HOST?.trim() || '0.0.0.0';
  const healthMonitor = createWorkerHealthMonitor();
  let keepRunning = true;
  let healthServer: StartedWorkerHealthServer | null = null;
  let repository: ResearchRepository | null = null;

  try {
    await initializeTelemetry('metrev-research-worker');
    await assertRuntimeDatabaseReady();
    repository = createResearchRepository();

    if (healthPort > 0) {
      healthServer = await startWorkerHealthServer({
        host: healthHost,
        monitor: healthMonitor,
        port: healthPort,
      });
    }

    healthMonitor.markReady();

    while (keepRunning) {
      healthMonitor.markCycleStart();
      const result = await runResearchWorkerCycle({
        repository,
        extractionLimit,
        backfillLimit,
      });
      healthMonitor.markCycleComplete(result);
      console.log(`[research-worker] ${summarizeWorkerCycle(result)}`);

      if (once) {
        keepRunning = false;
        continue;
      }

      if (
        result.backfillsProcessed === 0 &&
        result.extractionJobsProcessed === 0
      ) {
        await delay(pollMs);
      }
    }
  } catch (error) {
    healthMonitor.markFatal(error);
    console.error('[research-worker] fatal error', error);
    process.exitCode = 1;
  } finally {
    if (healthServer) {
      await healthServer.close();
    }

    if (repository) {
      await repository.disconnect();
    }
  }
}

void main();
