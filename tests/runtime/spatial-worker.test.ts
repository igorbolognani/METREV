import { MemorySpatialSimulationRunRepository } from '@metrev/database';
import { describe, expect, it } from 'vitest';

import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';
import {
  runSpatialSimulationWorkerCycle,
  type SpatialSimulationExecutor,
} from '../../packages/spatial-worker/src/worker';

const ownerId = 'spatial-worker-owner';
const meshSha = 'a'.repeat(64);
const workerVersions = {
  solverVersion: 'solver-dev-1',
  runtimeVersion: 'sidecar-dev-1',
};

async function queueRun(repository: MemorySpatialSimulationRunRepository) {
  return repository.createOrGet(
    createSpatialSimulationRunInput({
      ownerId,
      idempotencyKey: `worker-run-${Math.random()}`,
    }),
  );
}

function successfulExecutor(
  solverVersion = workerVersions.solverVersion,
  runtimeVersion = workerVersions.runtimeVersion,
): SpatialSimulationExecutor {
  return {
    solverVersion,
    runtimeVersion,
    supports: () => true,
    async execute({ run, reportProgress }) {
      await reportProgress({ status: 'meshing', progress: 20 });
      await reportProgress({
        status: 'solving',
        progress: 50,
        mesh_sha256: meshSha,
      });
      await reportProgress({ status: 'postprocessing', progress: 90 });
      return validSpatialSimulationResult({
        ...run,
        status: 'postprocessing',
        progress: 90,
        mesh_sha256: meshSha,
      });
    },
  };
}

describe('spatial simulation worker', () => {
  it('claims a run, persists monotonic stages and completes with a bound manifest', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      executor: successfulExecutor(),
      workerId: 'spatial-worker-test',
    });

    expect(cycle).toEqual({
      claimed: 1,
      completed: 1,
      failed: 0,
      cancelled: 0,
      leaseLost: 0,
    });
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'completed',
      progress: 100,
      attempt_count: 1,
      result: { run_id: run.id, mesh: { artifact: { sha256: meshSha } } },
    });
  });

  it('stores a structured failure when the configured executor fails', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-failing-test',
      executor: {
        ...workerVersions,
        supports: () => true,
        async execute() {
          throw new Error('private runtime details are not persisted');
        },
      },
    });

    expect(cycle.failed).toBe(1);
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'failed',
      failure: {
        code: 'spatial_execution_failed',
        message: 'The spatial execution did not produce a valid result',
      },
    });
  });

  it('aborts cooperatively and records an analyst cancellation', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    let started!: () => void;
    const executorStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const cyclePromise = runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-cancel-test',
      leaseDurationMs: 1_000,
      heartbeatIntervalMs: 250,
      executor: {
        ...workerVersions,
        supports: () => true,
        execute({ signal }) {
          started();
          return new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            });
          });
        },
      },
    });
    await executorStarted;
    await repository.requestCancellation(run.id, ownerId);
    const cycle = await cyclePromise;

    expect(cycle.cancelled).toBe(1);
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'cancelled',
      cancellation_requested: true,
    });
  });

  it('enforces the execution deadline when the executor honors abort', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-timeout-test',
      leaseDurationMs: 1_000,
      heartbeatIntervalMs: 250,
      executionTimeoutMs: 1_000,
      executor: {
        ...workerVersions,
        supports: () => true,
        execute({ signal }) {
          return new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            });
          });
        },
      },
    });

    expect(cycle.failed).toBe(1);
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'failed',
      failure: { code: 'execution_timeout' },
    });
  }, 5_000);

  it('leaves runs queued for a different solver/runtime version', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const mismatchedCycle = await runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-v2',
      executor: successfulExecutor('solver-dev-2', 'sidecar-dev-2'),
    });

    expect(mismatchedCycle.claimed).toBe(0);
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({ status: 'queued', attempt_count: 0 });

    const matchingCycle = await runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-v1',
      executor: successfulExecutor(),
    });
    expect(matchingCycle.completed).toBe(1);
  });
});
