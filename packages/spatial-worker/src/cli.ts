import { setTimeout as delay } from 'node:timers/promises';
import { spatialWorkerConfigFromEnvironment } from './config';

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

  const config = spatialWorkerConfigFromEnvironment(process.env);
  await initializeTelemetry('metrev-spatial-worker');
  await assertRuntimeDatabaseReady();
  const repository = createSpatialSimulationRunRepository();
  const workerId =
    process.env.METREV_SPATIAL_WORKER_ID?.trim() ||
    `${hostname()}:${process.pid}`;
  const { pollMs, maxJobs, leaseDurationMs, executionTimeoutMs } = config;
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
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
    while (!shutdown.signal.aborted) {
      const result = await runSpatialSimulationWorkerCycle({
        repository,
        executor,
        workerId,
        logger: {
          emit: (event) => console.info(JSON.stringify(event)),
        },
        signal: shutdown.signal,
        maxJobs,
        leaseDurationMs,
        executionTimeoutMs,
      });
      console.info(
        JSON.stringify({ event: 'spatial_worker_cycle', ...result }),
      );
      if (result.claimed === 0 && !shutdown.signal.aborted) {
        await delay(pollMs, undefined, { signal: shutdown.signal }).catch(
          (error: unknown) => {
            if (!shutdown.signal.aborted) throw error;
          },
        );
      }
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
