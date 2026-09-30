import {
  SpatialSimulationRunError,
  type SpatialSimulationRunRepository,
} from '@metrev/database';
import type {
  SpatialModelInputV2,
  SpatialSimulationResult,
  SpatialSimulationRunSnapshot,
} from '@metrev/domain-contracts';
import { z } from 'zod';

const activeStatusSchema = z.enum([
  'preparing_geometry',
  'meshing',
  'solving',
  'postprocessing',
]);

const progressSchema = z
  .object({
    status: activeStatusSchema,
    progress: z.number().int().min(5).max(99),
    mesh_sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'solving' && !value.mesh_sha256)
      context.addIssue({
        code: 'custom',
        path: ['mesh_sha256'],
        message: 'The verified mesh digest is required before solving',
      });
    if (value.status !== 'solving' && value.mesh_sha256)
      context.addIssue({
        code: 'custom',
        path: ['mesh_sha256'],
        message: 'The mesh digest is only committed on the solving transition',
      });
  });

export type SpatialWorkerProgress = z.infer<typeof progressSchema>;

export interface SpatialSimulationExecutionContext {
  /** Authenticated owner from the durable queue claim; never taken from the model. */
  ownerId: string;
  input: SpatialModelInputV2;
  run: SpatialSimulationRunSnapshot;
  signal: AbortSignal;
  reportProgress(progress: SpatialWorkerProgress): Promise<void>;
}

/** A solver must cooperate with AbortSignal and return a contract-valid manifest. */
export interface SpatialSimulationExecutor {
  solverVersion: string;
  runtimeVersion: string;
  supports(input: SpatialModelInputV2): boolean;
  execute(
    context: SpatialSimulationExecutionContext,
  ): Promise<SpatialSimulationResult>;
}

export interface SpatialSimulationWorkerCycleResult {
  claimed: number;
  completed: number;
  failed: number;
  cancelled: number;
  leaseLost: number;
}

export interface SpatialSimulationWorkerOptions {
  repository: SpatialSimulationRunRepository;
  executor: SpatialSimulationExecutor;
  workerId: string;
  maxJobs?: number;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
  executionTimeoutMs?: number;
}

const DEFAULT_LEASE_DURATION_MS = 60_000;
const DEFAULT_EXECUTION_TIMEOUT_MS = 15 * 60_000;
const MAX_EXECUTION_TIMEOUT_MS = 30 * 60_000;

function isLeaseLost(error: unknown): boolean {
  return (
    error instanceof SpatialSimulationRunError && error.code === 'lease_lost'
  );
}

function workerFailure(timedOut: boolean, code: string) {
  return {
    code: timedOut ? 'execution_timeout' : code,
    message: timedOut
      ? 'Spatial execution exceeded the configured worker deadline'
      : 'The spatial execution did not produce a valid result',
  };
}

async function processClaimedRun(input: {
  repository: SpatialSimulationRunRepository;
  executor: SpatialSimulationExecutor;
  workerId: string;
  leaseDurationMs: number;
  heartbeatIntervalMs: number;
  executionTimeoutMs: number;
}): Promise<'completed' | 'failed' | 'cancelled' | 'lease_lost' | null> {
  const work = await input.repository.claimNextQueued({
    worker_id: input.workerId,
    solver_version: input.executor.solverVersion,
    runtime_version: input.executor.runtimeVersion,
    lease_duration_ms: input.leaseDurationMs,
  });
  if (!work) return null;

  const abortController = new AbortController();
  let latest = work.run;
  let cancellationRequested = false;
  let leaseLost = false;
  let heartbeatError: unknown = null;
  let heartbeatInFlight: Promise<void> | null = null;
  let timedOut = false;
  let failureCode = 'spatial_execution_failed';

  const heartbeat = () => {
    if (heartbeatInFlight) return heartbeatInFlight;
    if (leaseLost) return Promise.resolve();
    heartbeatInFlight = (async () => {
      try {
        const renewed = await input.repository.renewClaim({
          run_id: latest.id,
          owner_id: work.ownerId,
          worker_id: work.workerId,
          lease_token: work.leaseToken,
          lease_duration_ms: input.leaseDurationMs,
        });
        if (!renewed) {
          leaseLost = true;
          abortController.abort(new Error('worker lease lost'));
        } else if (renewed.cancelRequested) {
          cancellationRequested = true;
          abortController.abort(new Error('cancellation requested'));
        }
      } catch (error) {
        heartbeatError = error;
        leaseLost = true;
        abortController.abort(new Error('worker lease heartbeat failed'));
      }
    })().finally(() => {
      heartbeatInFlight = null;
    });
    return heartbeatInFlight;
  };

  const heartbeatTimer = setInterval(
    () => void heartbeat(),
    input.heartbeatIntervalMs,
  );
  const executionTimer = setTimeout(() => {
    timedOut = true;
    abortController.abort(new Error('spatial execution deadline exceeded'));
  }, input.executionTimeoutMs);
  let rejectOnAbort: ((reason: unknown) => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectOnAbort = reject;
  });
  const onAbort = () => rejectOnAbort?.(abortController.signal.reason);
  abortController.signal.addEventListener('abort', onAbort, { once: true });

  try {
    if (!input.executor.supports(work.input)) {
      failureCode = 'unsupported_spatial_input';
      throw new Error(
        'The configured spatial executor does not support this input',
      );
    }
    const execution = input.executor.execute({
      ownerId: work.ownerId,
      input: work.input,
      run: work.run,
      signal: abortController.signal,
      reportProgress: async (candidate) => {
        if (abortController.signal.aborted)
          throw abortController.signal.reason ?? new Error('execution aborted');
        const progress = progressSchema.parse(candidate);
        const next = await input.repository.transitionClaimed({
          run_id: latest.id,
          owner_id: work.ownerId,
          expected_status: latest.status,
          next_status: progress.status,
          progress: progress.progress,
          ...(progress.status === 'solving'
            ? { mesh_sha256: progress.mesh_sha256 }
            : {}),
          worker_id: work.workerId,
          lease_token: work.leaseToken,
        });
        if (!next) throw new Error('Spatial run disappeared during execution');
        latest = next;
      },
    });
    // An adapter may fail to settle after AbortSignal. Release the claim and
    // record the deadline/cancellation without waiting indefinitely for it.
    const result = await Promise.race([execution, aborted]);

    await heartbeat();
    if (cancellationRequested)
      throw new Error('spatial execution cancellation requested');
    if (leaseLost) throw heartbeatError ?? new Error('worker lease lost');
    if (timedOut) throw new Error('spatial execution deadline exceeded');

    const completed = await input.repository.transitionClaimed({
      run_id: latest.id,
      owner_id: work.ownerId,
      expected_status: latest.status,
      next_status: 'completed',
      progress: 100,
      result,
      worker_id: work.workerId,
      lease_token: work.leaseToken,
    });
    if (!completed)
      throw new Error('Spatial run disappeared before completion');
    latest = completed;
    return 'completed';
  } catch (error) {
    const current =
      (await input.repository
        .getOwnedRun(latest.id, work.ownerId)
        .catch(() => null)) ?? latest;
    if (current.cancellation_requested || cancellationRequested) {
      if (['completed', 'failed', 'cancelled'].includes(current.status))
        return current.status === 'cancelled' ? 'cancelled' : 'lease_lost';
      try {
        await input.repository.transitionClaimed({
          run_id: current.id,
          owner_id: work.ownerId,
          expected_status: current.status,
          next_status: 'cancelled',
          progress: current.progress,
          worker_id: work.workerId,
          lease_token: work.leaseToken,
        });
        return 'cancelled';
      } catch (transitionError) {
        return isLeaseLost(transitionError) ? 'lease_lost' : 'failed';
      }
    }

    if (isLeaseLost(error) || leaseLost) return 'lease_lost';
    if (['completed', 'failed', 'cancelled'].includes(current.status))
      return current.status === 'failed' ? 'failed' : 'lease_lost';
    try {
      await input.repository.transitionClaimed({
        run_id: current.id,
        owner_id: work.ownerId,
        expected_status: current.status,
        next_status: 'failed',
        progress: current.progress,
        failure: workerFailure(timedOut, failureCode),
        worker_id: work.workerId,
        lease_token: work.leaseToken,
      });
      return 'failed';
    } catch (transitionError) {
      return isLeaseLost(transitionError) ? 'lease_lost' : 'failed';
    }
  } finally {
    clearInterval(heartbeatTimer);
    clearTimeout(executionTimer);
    abortController.signal.removeEventListener('abort', onAbort);
    if (!abortController.signal.aborted) abortController.abort();
  }
}

export async function runSpatialSimulationWorkerCycle(
  options: SpatialSimulationWorkerOptions,
): Promise<SpatialSimulationWorkerCycleResult> {
  const maxJobs = options.maxJobs ?? 1;
  const leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
  const heartbeatIntervalMs =
    options.heartbeatIntervalMs ?? Math.floor(leaseDurationMs / 3);
  const executionTimeoutMs =
    options.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;
  if (!options.workerId.trim() || options.workerId.length > 128)
    throw new RangeError('workerId must contain 1 to 128 characters');
  const solverVersion = z
    .string()
    .trim()
    .min(1)
    .max(160)
    .parse(options.executor.solverVersion);
  const runtimeVersion = z
    .string()
    .trim()
    .min(1)
    .max(160)
    .parse(options.executor.runtimeVersion);
  if (
    solverVersion !== options.executor.solverVersion ||
    runtimeVersion !== options.executor.runtimeVersion
  )
    throw new RangeError('solver/runtime versions must be trimmed identifiers');
  if (!Number.isSafeInteger(maxJobs) || maxJobs < 1 || maxJobs > 20)
    throw new RangeError('maxJobs must be between 1 and 20');
  if (
    !Number.isSafeInteger(leaseDurationMs) ||
    leaseDurationMs < 1_000 ||
    leaseDurationMs > 300_000
  )
    throw new RangeError('leaseDurationMs must be between 1s and 5m');
  if (
    !Number.isSafeInteger(heartbeatIntervalMs) ||
    heartbeatIntervalMs < 250 ||
    heartbeatIntervalMs >= leaseDurationMs
  )
    throw new RangeError(
      'heartbeatIntervalMs must be below the lease duration',
    );
  if (
    !Number.isSafeInteger(executionTimeoutMs) ||
    executionTimeoutMs < 1_000 ||
    executionTimeoutMs > MAX_EXECUTION_TIMEOUT_MS
  )
    throw new RangeError('executionTimeoutMs must be between 1s and 30m');

  const result: SpatialSimulationWorkerCycleResult = {
    claimed: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    leaseLost: 0,
  };
  for (let index = 0; index < maxJobs; index += 1) {
    const outcome = await processClaimedRun({
      repository: options.repository,
      executor: options.executor,
      workerId: options.workerId,
      leaseDurationMs,
      heartbeatIntervalMs,
      executionTimeoutMs,
    });
    if (outcome === null) break;
    result.claimed += 1;
    if (outcome === 'lease_lost') result.leaseLost += 1;
    else result[outcome] += 1;
  }
  return result;
}
