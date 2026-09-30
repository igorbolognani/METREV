import { MemorySpatialSimulationRunRepository } from '@metrev/database';
import { describe, expect, it } from 'vitest';

import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';
import {
  runSpatialSimulationWorkerCycle,
  type SpatialSimulationExecutor,
  type SpatialSimulationWorkerLogEvent,
} from '../../packages/spatial-worker/src/worker';
import {
  normalizeSpatialSimulationExecutionError,
  SpatialSimulationExecutionError,
} from '../../packages/spatial-worker/src/execution-error';
import { SidecarTransportError } from '../../packages/spatial-sidecar-client/src';

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

  it('emits structured claim, progress, and completion events', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const events: SpatialSimulationWorkerLogEvent[] = [];
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      executor: successfulExecutor(),
      workerId: 'spatial-worker-structured-log-test',
      logger: { emit: (event) => events.push(event) },
    });

    expect(cycle.completed).toBe(1);
    expect(events.map((event) => event.event)).toEqual([
      'spatial_run_claimed',
      'spatial_run_progress',
      'spatial_run_progress',
      'spatial_run_progress',
      'spatial_run_completed',
    ]);
    expect(events[0]).toMatchObject({
      run_id: run.id,
      worker_id: 'spatial-worker-structured-log-test',
      solver_version: workerVersions.solverVersion,
      runtime_version: workerVersions.runtimeVersion,
    });
    expect(events[1]).toMatchObject({
      status: 'meshing',
      progress: 20,
    });
    expect(events.at(-1)).toMatchObject({ run_id: run.id });
    expect(
      events.every((event) => Number.isFinite(Date.parse(event.occurred_at))),
    ).toBe(true);
  });

  it('does not let a broken logger alter durable worker outcomes', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      executor: successfulExecutor(),
      workerId: 'spatial-worker-broken-logger-test',
      logger: {
        emit() {
          throw new Error('log sink unavailable');
        },
      },
    });

    expect(cycle.completed).toBe(1);
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({ status: 'completed', progress: 100 });
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

  it('persists typed failure reasons and emits their stable codes', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const events: SpatialSimulationWorkerLogEvent[] = [];
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-classified-failure-test',
      logger: { emit: (event) => events.push(event) },
      executor: {
        ...workerVersions,
        supports: () => true,
        async execute() {
          throw new SpatialSimulationExecutionError(
            'solver_nonconverged',
            'The Stokes solver did not converge within the configured tolerance',
          );
        },
      },
    });

    expect(cycle.failed).toBe(1);
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'failed',
      failure: {
        code: 'solver_nonconverged',
        message:
          'The Stokes solver did not converge within the configured tolerance',
      },
    });
    expect(events.at(-1)).toMatchObject({
      event: 'spatial_run_failed',
      run_id: run.id,
      failure_code: 'solver_nonconverged',
    });
  });

  it.each([
    [
      'timeout',
      'spatial_sidecar_timeout',
      'The spatial solver exceeded its process time limit',
    ],
    [
      'cancelled',
      'spatial_sidecar_cancelled',
      'The spatial solver process was cancelled',
    ],
    [
      'process_failure',
      'spatial_sidecar_process_failure',
      'The spatial solver process exited unexpectedly',
    ],
    [
      'invalid_response',
      'spatial_sidecar_invalid_response',
      'The spatial solver returned invalid protocol data',
    ],
    [
      'artifact_integrity',
      'spatial_artifact_integrity_failure',
      'The spatial solver artifacts failed integrity validation',
    ],
  ] as const)(
    'maps sidecar %s errors to safe persistent failure detail',
    (transportCode, code, message) => {
      const error = normalizeSpatialSimulationExecutionError(
        new SidecarTransportError(
          transportCode,
          'python traceback with local paths',
        ),
      );
      expect(error).toBeInstanceOf(SpatialSimulationExecutionError);
      expect(error).toMatchObject({ code, message });
      expect((error as Error).message).not.toContain('local paths');
    },
  );

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

  it('settles a timed-out claim even when the executor ignores abort', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-unresponsive-test',
      leaseDurationMs: 2_000,
      heartbeatIntervalMs: 250,
      executionTimeoutMs: 1_000,
      executor: {
        ...workerVersions,
        supports: () => true,
        execute: () => new Promise(() => undefined),
      },
    });

    expect(cycle).toMatchObject({ claimed: 1, failed: 1 });
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'failed',
      failure: { code: 'execution_timeout' },
    });
  }, 5_000);

  it('settles cancellation even when the executor ignores abort', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    let started!: () => void;
    const executorStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const cyclePromise = runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'spatial-worker-unresponsive-cancel',
      leaseDurationMs: 1_000,
      heartbeatIntervalMs: 250,
      executor: {
        ...workerVersions,
        supports: () => true,
        execute: () => {
          started();
          return new Promise(() => undefined);
        },
      },
    });
    await executorStarted;
    await repository.requestCancellation(run.id, ownerId);
    const cycle = await cyclePromise;
    expect(cycle).toMatchObject({ claimed: 1, cancelled: 1 });
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'cancelled',
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

describe('service shutdown', () => {
  it('leaves queued runs unclaimed when the service is already stopped', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const shutdown = new AbortController();
    shutdown.abort();
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      executor: successfulExecutor(),
      workerId: 'stopped-worker',
      signal: shutdown.signal,
    });
    expect(cycle.claimed).toBe(0);
    expect(await repository.getOwnedRun(run.id, ownerId)).toMatchObject({
      status: 'queued',
      attempt_count: 0,
    });
  });

  it('aborts a blocked executor, records a retryable shutdown and stops the batch', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const { run: nextRun } = await queueRun(repository);
    const shutdown = new AbortController();
    let solverSignal: AbortSignal | undefined;
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      workerId: 'stopping-worker',
      maxJobs: 2,
      signal: shutdown.signal,
      executor: {
        ...workerVersions,
        supports: () => true,
        async execute(context) {
          solverSignal = context.signal;
          await context.reportProgress({ status: 'meshing', progress: 20 });
          shutdown.abort(new Error('private shutdown detail'));
          return new Promise(() => {});
        },
      },
    });
    expect(solverSignal?.aborted).toBe(true);
    expect(cycle).toMatchObject({ claimed: 1, failed: 1, cancelled: 0 });
    expect(await repository.getOwnedRun(run.id, ownerId)).toMatchObject({
      status: 'failed',
      failure: { code: 'worker_shutdown' },
    });
    expect(await repository.getOwnedRun(nextRun.id, ownerId)).toMatchObject({
      status: 'queued',
      attempt_count: 0,
    });
  });

  it('handles shutdown that arrives while the queue claim is pending', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await queueRun(repository);
    const shutdown = new AbortController();
    const claim = repository.claimNextQueued.bind(repository);
    repository.claimNextQueued = async (input) => {
      const work = await claim(input);
      shutdown.abort();
      return work;
    };
    const executor = successfulExecutor();
    executor.execute = async () => {
      throw new Error('must not start a solver after shutdown');
    };
    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      executor,
      workerId: 'claim-race-worker',
      signal: shutdown.signal,
    });
    expect(cycle.failed).toBe(1);
    expect(await repository.getOwnedRun(run.id, ownerId)).toMatchObject({
      status: 'failed',
      failure: { code: 'worker_shutdown' },
    });
  });
});
