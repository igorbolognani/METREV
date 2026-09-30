import { hostname } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import {
  assertRuntimeDatabaseReady,
  createSpatialSimulationRunRepository,
  disconnectPrismaClient,
} from '@metrev/database';
import { initializeTelemetry } from '@metrev/telemetry/node';

import {
  runSpatialSimulationWorkerCycle,
  type SpatialSimulationExecutor,
} from './worker';

export {
  DarcyDevelopmentExecutor,
  type DarcyDevelopmentExecutorOptions,
  type SpatialSidecarRunner,
} from './darcy-development-executor';
export {
  StokesDevelopmentExecutor,
  type StokesDevelopmentExecutorOptions,
  type StokesSidecarRunner,
} from './stokes-development-executor';
export {
  SpatialSimulationExecutionError,
  normalizeSpatialSimulationExecutionError,
} from './execution-error';
export type {
  SpatialSimulationWorkerLogEvent,
  SpatialSimulationWorkerLogger,
} from './worker';

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function delay(ms: number) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function main() {
  const executorModulePath =
    process.env.METREV_SPATIAL_WORKER_EXECUTOR_MODULE?.trim();
  if (!executorModulePath)
    throw new Error(
      'Set METREV_SPATIAL_WORKER_EXECUTOR_MODULE to a reviewed solver adapter before starting the spatial worker',
    );

  const loaded = (await import(
    pathToFileURL(resolve(executorModulePath)).href
  )) as { spatialSimulationExecutor?: SpatialSimulationExecutor };
  const executor = loaded.spatialSimulationExecutor;
  if (
    !executor ||
    typeof executor.supports !== 'function' ||
    typeof executor.execute !== 'function' ||
    typeof executor.solverVersion !== 'string' ||
    !executor.solverVersion.trim() ||
    typeof executor.runtimeVersion !== 'string' ||
    !executor.runtimeVersion.trim()
  )
    throw new Error(
      'The configured solver adapter must export supports, execute, solverVersion and runtimeVersion',
    );

  await initializeTelemetry('metrev-spatial-worker');
  await assertRuntimeDatabaseReady();
  const repository = createSpatialSimulationRunRepository();
  const workerId =
    process.env.METREV_SPATIAL_WORKER_ID?.trim() ||
    `${hostname()}:${process.pid}`;
  const pollMs = positiveInteger(
    process.env.METREV_SPATIAL_WORKER_POLL_MS,
    2_000,
  );
  const maxJobs = positiveInteger(
    process.env.METREV_SPATIAL_WORKER_MAX_JOBS_PER_CYCLE,
    1,
  );
  const leaseDurationMs = positiveInteger(
    process.env.METREV_SPATIAL_WORKER_LEASE_MS,
    60_000,
  );
  const executionTimeoutMs = positiveInteger(
    process.env.METREV_SPATIAL_WORKER_TIMEOUT_MS,
    15 * 60_000,
  );
  let keepRunning = true;
  const stop = () => {
    keepRunning = false;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    console.info(
      JSON.stringify({
        event: 'spatial_worker_ready',
        worker_id: workerId,
        executor_module: executorModulePath,
        solver_version: executor.solverVersion,
        runtime_version: executor.runtimeVersion,
        lease_duration_ms: leaseDurationMs,
        execution_timeout_ms: executionTimeoutMs,
      }),
    );
    while (keepRunning) {
      const result = await runSpatialSimulationWorkerCycle({
        repository,
        executor,
        workerId,
        logger: {
          emit: (event) => console.info(JSON.stringify(event)),
        },
        maxJobs,
        leaseDurationMs,
        executionTimeoutMs,
      });
      console.info(
        JSON.stringify({ event: 'spatial_worker_cycle', ...result }),
      );
      if (result.claimed === 0 && keepRunning) await delay(pollMs);
    }
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await disconnectPrismaClient();
  }
}

void main().catch((error: unknown) => {
  console.error('[spatial-worker] fatal error', error);
  process.exitCode = 1;
});
