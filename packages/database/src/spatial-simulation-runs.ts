import { randomUUID } from 'node:crypto';

import {
  claimSpatialSimulationRunInputSchema,
  createSpatialSimulationRunInputSchema,
  retrySpatialSimulationRunInputSchema,
  spatialSimulationResultSchema,
  spatialSimulationResultForInputSchema,
  spatialSimulationRunLeaseInputSchema,
  spatialSimulationRunSnapshotSchema,
  transitionSpatialSimulationRunInputSchema,
  spatialRuntimeInputSchema,
  type ClaimSpatialSimulationRunInput,
  type CreateSpatialSimulationRunInput,
  type RetrySpatialSimulationRunInput,
  type SpatialRuntimeInput,
  type SpatialSimulationRunSnapshot,
  type SpatialSimulationRunStatus,
  type SpatialSimulationRunLeaseInput,
  type TransitionSpatialSimulationRunInput,
} from '@metrev/domain-contracts';

import { Prisma, type PrismaClient } from '../generated/prisma/client';
import { getPrismaClient } from './prisma-client';

const toDatabaseStatus = {
  queued: 'QUEUED',
  preparing_geometry: 'PREPARING_GEOMETRY',
  meshing: 'MESHING',
  solving: 'SOLVING',
  postprocessing: 'POSTPROCESSING',
  completed: 'COMPLETED',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
} as const;

const fromDatabaseStatus = {
  QUEUED: 'queued',
  PREPARING_GEOMETRY: 'preparing_geometry',
  MESHING: 'meshing',
  SOLVING: 'solving',
  POSTPROCESSING: 'postprocessing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

const allowedNextStatuses: Record<
  SpatialSimulationRunStatus,
  readonly SpatialSimulationRunStatus[]
> = {
  queued: ['preparing_geometry', 'failed', 'cancelled'],
  preparing_geometry: ['meshing', 'failed', 'cancelled'],
  meshing: ['solving', 'failed', 'cancelled'],
  solving: ['postprocessing', 'failed', 'cancelled'],
  postprocessing: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

const MAX_RESULT_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_INPUT_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_MANUAL_RETRIES = 2;
const activeStatuses = [
  'PREPARING_GEOMETRY',
  'MESHING',
  'SOLVING',
  'POSTPROCESSING',
] as const;

export type SpatialSimulationRunErrorCode =
  | 'not_found'
  | 'idempotency_conflict'
  | 'invalid_transition'
  | 'stale_state'
  | 'invalid_evaluation_scope'
  | 'result_manifest_too_large'
  | 'input_snapshot_too_large'
  | 'lease_lost'
  | 'cancel_requested'
  | 'retry_not_allowed'
  | 'retry_limit_exceeded';

export class SpatialSimulationRunError extends Error {
  constructor(
    readonly code: SpatialSimulationRunErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SpatialSimulationRunError';
  }
}

function serializeResultManifest(result: unknown): string | null {
  if (result === null || result === undefined) return null;
  const json = JSON.stringify(result);
  if (json === undefined) return null;
  if (Buffer.byteLength(json, 'utf8') > MAX_RESULT_MANIFEST_BYTES)
    throw new SpatialSimulationRunError(
      'result_manifest_too_large',
      'Spatial result metadata exceeds 2 MiB; keep field samples in artifacts and reduce verbose diagnostic histories',
    );
  return json;
}

export interface CreateSpatialSimulationRunResult {
  run: SpatialSimulationRunSnapshot;
  created: boolean;
}

export interface SpatialSimulationRunWorkItem {
  ownerId: string;
  workerId: string;
  leaseToken: string;
  input: SpatialRuntimeInput;
  run: SpatialSimulationRunSnapshot;
}

export interface SpatialSimulationRunLeaseResult {
  cancelRequested: boolean;
  leaseExpiresAt: string;
}

export interface RetrySpatialSimulationRunResult {
  created: boolean;
  run: SpatialSimulationRunSnapshot;
}

export interface SpatialSimulationRunRepository {
  createOrGet(
    input: CreateSpatialSimulationRunInput,
  ): Promise<CreateSpatialSimulationRunResult>;
  getOwnedRun(
    runId: string,
    ownerId: string,
  ): Promise<SpatialSimulationRunSnapshot | null>;
  getOwnedInput(
    runId: string,
    ownerId: string,
  ): Promise<SpatialRuntimeInput | null>;
  transition(
    input: TransitionSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunSnapshot | null>;
  claimNextQueued(
    input: ClaimSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunWorkItem | null>;
  renewClaim(
    input: SpatialSimulationRunLeaseInput,
  ): Promise<SpatialSimulationRunLeaseResult | null>;
  transitionClaimed(
    input: TransitionSpatialSimulationRunInput & {
      worker_id: string;
      lease_token: string;
    },
  ): Promise<SpatialSimulationRunSnapshot | null>;
  requestCancellation(
    runId: string,
    ownerId: string,
  ): Promise<SpatialSimulationRunSnapshot | null>;
  retryFailedRun(
    input: RetrySpatialSimulationRunInput,
  ): Promise<RetrySpatialSimulationRunResult>;
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function fromRecord(record: {
  id: string;
  evaluationId: string | null;
  modelId: string;
  system: string;
  dimension: number;
  inputContractVersion: string;
  inputSha256: string;
  solverVersion: string;
  runtimeVersion: string;
  meshRequestSha256: string | null;
  meshSha256: string | null;
  status: keyof typeof fromDatabaseStatus;
  progress: number;
  resultManifest: unknown;
  failureDetail: unknown;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  attemptCount: number;
  maxAttempts: number;
  retryCount: number;
  retryOfRunId: string | null;
  cancelRequestedAt: Date | null;
}): SpatialSimulationRunSnapshot {
  const result = record.resultManifest
    ? spatialSimulationResultSchema.parse(record.resultManifest)
    : null;
  return spatialSimulationRunSnapshotSchema.parse({
    id: record.id,
    evaluation_id: record.evaluationId,
    model_id: record.modelId,
    system: record.system,
    dimension: record.dimension,
    input_contract_version: record.inputContractVersion,
    input_sha256: record.inputSha256,
    solver_version: record.solverVersion,
    runtime_version: record.runtimeVersion,
    mesh_request_sha256: record.meshRequestSha256,
    mesh_sha256: record.meshSha256,
    status: fromDatabaseStatus[record.status],
    progress: record.progress,
    attempt_count: record.attemptCount,
    max_attempts: record.maxAttempts,
    retry_count: record.retryCount,
    retry_of_run_id: record.retryOfRunId,
    cancellation_requested: record.cancelRequestedAt !== null,
    result,
    failure: record.failureDetail,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
    started_at: iso(record.startedAt),
    completed_at: iso(record.completedAt),
  });
}

function assertSameIdempotentRequest(
  run: SpatialSimulationRunSnapshot,
  input: ReturnType<typeof createSpatialSimulationRunInputSchema.parse>,
): void {
  if (
    run.evaluation_id !== input.evaluation_id ||
    run.model_id !== input.model_id ||
    run.system !== input.system ||
    run.dimension !== input.dimension ||
    run.input_contract_version !== input.input_contract_version ||
    run.input_sha256 !== input.input_sha256 ||
    run.solver_version !== input.solver_version ||
    run.runtime_version !== input.runtime_version ||
    run.mesh_request_sha256 !== input.mesh_request_sha256
  )
    throw new SpatialSimulationRunError(
      'idempotency_conflict',
      'This idempotency key is already bound to a different spatial run request',
    );
}

function assertTransition(
  current: SpatialSimulationRunSnapshot,
  input: ReturnType<typeof transitionSpatialSimulationRunInputSchema.parse>,
  inputSnapshot?: unknown,
): SpatialSimulationRunSnapshot {
  if (
    current.cancellation_requested &&
    !['cancelled', 'failed'].includes(input.next_status)
  )
    throw new SpatialSimulationRunError(
      'cancel_requested',
      'The run has a pending cancellation request',
    );
  if (current.status !== input.expected_status)
    throw new SpatialSimulationRunError(
      'stale_state',
      `Expected ${input.expected_status}; run is ${current.status}`,
    );

  const sameActiveState =
    current.status === input.next_status &&
    !['completed', 'failed', 'cancelled'].includes(current.status);
  if (
    !sameActiveState &&
    !allowedNextStatuses[current.status].includes(input.next_status)
  )
    throw new SpatialSimulationRunError(
      'invalid_transition',
      `Cannot transition a ${current.status} run to ${input.next_status}`,
    );
  if (input.progress < current.progress)
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'Run progress cannot move backwards',
    );
  if (input.next_status === 'completed' && input.progress !== 100)
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'Completed runs must report 100% progress',
    );
  if (input.next_status !== 'completed' && input.progress >= 100)
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'An active run must remain below 100% progress',
    );
  if (input.next_status === 'completed' && !input.result)
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'A completed run requires a spatial result manifest',
    );
  if (
    input.next_status === 'completed' &&
    input.result &&
    (input.result.convergence.some(
      (entry) => entry.status === 'not_converged',
    ) ||
      input.result.conservation_residuals.some((entry) => !entry.passed))
  )
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'A non-converged or conservation-failing result must be retained as a failed run',
    );
  if (!['completed', 'failed'].includes(input.next_status) && input.result)
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'A spatial result manifest may only be persisted on completion or failure',
    );
  if (input.next_status === 'failed' && !input.failure)
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'A failed run requires a structured failure reason',
    );
  if (input.next_status !== 'failed' && input.failure)
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'Failure details may only be persisted for a failed run',
    );

  const meshSha256 = input.mesh_sha256 ?? current.mesh_sha256;
  if (input.mesh_sha256 && input.next_status !== 'solving')
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'The verified mesh hash must be recorded when the run enters solving',
    );
  if (
    current.mesh_sha256 &&
    input.mesh_sha256 &&
    current.mesh_sha256 !== input.mesh_sha256
  )
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'A run mesh hash is immutable once recorded',
    );
  if (
    ['solving', 'postprocessing', 'completed'].includes(input.next_status) &&
    !meshSha256
  )
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'Solving and later states require a verified mesh hash',
    );
  if (
    input.result &&
    (input.result.run_id !== current.id ||
      input.result.evaluation_id !== current.evaluation_id ||
      input.result.model_id !== current.model_id ||
      input.result.system !== current.system ||
      input.result.dimension !== current.dimension ||
      input.result.input_sha256 !== current.input_sha256 ||
      input.result.mesh.request_sha256 !== current.mesh_request_sha256 ||
      input.result.solver_version !== current.solver_version ||
      input.result.runtime_version !== current.runtime_version ||
      input.result.mesh.artifact.sha256 !== meshSha256)
  )
    throw new SpatialSimulationRunError(
      'invalid_transition',
      'Result manifest does not match the immutable run and verified mesh',
    );

  if (input.result) {
    const parsedInput = spatialRuntimeInputSchema.safeParse(inputSnapshot);
    if (!parsedInput.success)
      throw new SpatialSimulationRunError(
        'invalid_transition',
        'Result persistence requires a valid immutable input snapshot',
      );
    const boundResult = spatialSimulationResultForInputSchema(
      parsedInput.data,
      current.input_sha256,
    ).safeParse(input.result);
    if (!boundResult.success)
      throw new SpatialSimulationRunError(
        'invalid_transition',
        `Result field contract does not match its input: ${boundResult.error.issues.map((issue) => issue.message).join('; ')}`,
      );
  }

  const now = new Date(
    Math.max(Date.now(), Date.parse(current.updated_at) + 1),
  ).toISOString();
  const terminal = ['completed', 'failed', 'cancelled'].includes(
    input.next_status,
  );
  const cancelledBeforeStart =
    input.next_status === 'cancelled' &&
    current.status === 'queued' &&
    current.started_at === null;
  const result = input.result ?? null;
  const failure = input.failure ?? null;
  return spatialSimulationRunSnapshotSchema.parse({
    ...current,
    status: input.next_status,
    progress: input.progress,
    mesh_sha256: meshSha256,
    cancellation_requested:
      current.cancellation_requested || input.next_status === 'cancelled',
    result,
    failure,
    updated_at: now,
    started_at:
      current.started_at ??
      (input.next_status === 'queued' || cancelledBeforeStart ? null : now),
    completed_at: terminal ? now : null,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

export class PrismaSpatialSimulationRunRepository implements SpatialSimulationRunRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createOrGet(
    candidate: CreateSpatialSimulationRunInput,
  ): Promise<CreateSpatialSimulationRunResult> {
    const input = createSpatialSimulationRunInputSchema.parse(candidate);
    const inputSnapshotJson = JSON.stringify(input.input_snapshot);
    if (Buffer.byteLength(inputSnapshotJson, 'utf8') > MAX_INPUT_SNAPSHOT_BYTES)
      throw new SpatialSimulationRunError(
        'input_snapshot_too_large',
        'Spatial input metadata exceeds 2 MiB; keep mesh and field arrays in artifacts',
      );
    const existing = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: {
        ownerId: input.owner_id,
        idempotencyKey: input.idempotency_key,
      },
    });
    if (existing) {
      const run = fromRecord(existing);
      assertSameIdempotentRequest(run, input);
      return { run, created: false };
    }

    if (input.evaluation_id) {
      const ownedEvaluation = await this.prisma.evaluationRecord.findFirst({
        where: {
          id: input.evaluation_id,
          case: { createdBy: input.owner_id },
        },
        select: { id: true },
      });
      if (!ownedEvaluation)
        throw new SpatialSimulationRunError(
          'invalid_evaluation_scope',
          'The evaluation is not owned by the authenticated run owner',
        );
    }

    try {
      const created = await this.prisma.spatialSimulationRunRecord.create({
        data: {
          id: randomUUID(),
          ownerId: input.owner_id,
          evaluationId: input.evaluation_id,
          idempotencyKey: input.idempotency_key,
          modelId: input.model_id,
          system: input.system,
          dimension: input.dimension,
          inputContractVersion: input.input_contract_version,
          inputSha256: input.input_sha256,
          inputSnapshot: JSON.parse(inputSnapshotJson) as Prisma.InputJsonValue,
          solverVersion: input.solver_version,
          runtimeVersion: input.runtime_version,
          meshRequestSha256: input.mesh_request_sha256,
        },
      });
      return { run: fromRecord(created), created: true };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const raced = await this.prisma.spatialSimulationRunRecord.findFirst({
        where: {
          ownerId: input.owner_id,
          idempotencyKey: input.idempotency_key,
        },
      });
      if (!raced) throw error;
      const run = fromRecord(raced);
      assertSameIdempotentRequest(run, input);
      return { run, created: false };
    }
  }

  async getOwnedRun(
    runId: string,
    ownerId: string,
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const record = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: { id: runId, ownerId },
    });
    return record ? fromRecord(record) : null;
  }

  async getOwnedInput(
    runId: string,
    ownerId: string,
  ): Promise<SpatialRuntimeInput | null> {
    const record = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: { id: runId, ownerId },
      select: { inputSnapshot: true },
    });
    if (!record?.inputSnapshot) return null;
    return spatialRuntimeInputSchema.parse(record.inputSnapshot);
  }

  async transition(
    candidate: TransitionSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const input = transitionSpatialSimulationRunInputSchema.parse(candidate);
    const currentRecord =
      await this.prisma.spatialSimulationRunRecord.findFirst({
        where: { id: input.run_id, ownerId: input.owner_id },
      });
    if (!currentRecord) return null;

    const current = fromRecord(currentRecord);
    const next = assertTransition(current, input, currentRecord.inputSnapshot);
    const resultJson = serializeResultManifest(input.result);

    const updated = await this.prisma.spatialSimulationRunRecord.updateMany({
      where: {
        id: input.run_id,
        ownerId: input.owner_id,
        status: toDatabaseStatus[input.expected_status],
        updatedAt: currentRecord.updatedAt,
        leaseToken: null,
      },
      data: {
        status: toDatabaseStatus[input.next_status],
        progress: input.progress,
        meshSha256: next.mesh_sha256,
        resultManifest:
          resultJson !== null
            ? (JSON.parse(resultJson) as Prisma.InputJsonValue)
            : undefined,
        failureDetail: input.failure
          ? (input.failure as Prisma.InputJsonValue)
          : undefined,
        updatedAt: new Date(next.updated_at),
        startedAt: next.started_at ? new Date(next.started_at) : null,
        completedAt: next.completed_at ? new Date(next.completed_at) : null,
        cancelRequestedAt:
          input.next_status === 'cancelled'
            ? new Date(next.updated_at)
            : undefined,
      },
    });
    if (updated.count !== 1)
      throw new SpatialSimulationRunError(
        'stale_state',
        'The run changed while this transition was being committed',
      );

    const persisted = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: { id: input.run_id, ownerId: input.owner_id },
    });
    return persisted ? fromRecord(persisted) : null;
  }

  async claimNextQueued(
    candidate: ClaimSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunWorkItem | null> {
    const input = claimSpatialSimulationRunInputSchema.parse(candidate);
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const legacyQueued = await tx.spatialSimulationRunRecord.findMany({
        where: {
          status: 'QUEUED',
          inputSnapshot: { equals: Prisma.DbNull },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 100,
      });
      for (const record of legacyQueued) {
        await tx.spatialSimulationRunRecord.updateMany({
          where: {
            id: record.id,
            status: 'QUEUED',
            updatedAt: record.updatedAt,
            inputSnapshot: { equals: Prisma.DbNull },
          },
          data: {
            status: 'FAILED',
            failureDetail: {
              code: 'missing_input_snapshot',
              message:
                'This queued run cannot be reproduced because its input snapshot was not persisted',
            },
            startedAt: record.startedAt ?? now,
            completedAt: now,
            updatedAt: now,
          },
        });
      }
      const expired = await tx.spatialSimulationRunRecord.findMany({
        where: {
          status: { in: [...activeStatuses] },
          leaseExpiresAt: { lte: now },
        },
        orderBy: [{ leaseExpiresAt: 'asc' }, { id: 'asc' }],
        take: 100,
      });
      for (const record of expired) {
        const cancelled = record.cancelRequestedAt !== null;
        const exhausted = record.attemptCount >= record.maxAttempts;
        const status = cancelled
          ? 'CANCELLED'
          : exhausted
            ? 'FAILED'
            : 'QUEUED';
        await tx.spatialSimulationRunRecord.updateMany({
          where: {
            id: record.id,
            status: record.status,
            workerId: record.workerId,
            leaseToken: record.leaseToken,
            leaseExpiresAt: { lte: now },
            cancelRequestedAt: record.cancelRequestedAt,
          },
          data: {
            status,
            progress: cancelled || exhausted ? record.progress : 0,
            resultManifest: Prisma.DbNull,
            failureDetail: exhausted
              ? {
                  code: 'worker_lease_expired',
                  message:
                    'The worker lease expired after the allowed attempts',
                }
              : Prisma.DbNull,
            workerId: null,
            leaseToken: null,
            leaseExpiresAt: null,
            startedAt: cancelled || exhausted ? record.startedAt : null,
            completedAt: cancelled || exhausted ? now : null,
            updatedAt: now,
          },
        });
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const queued = await tx.spatialSimulationRunRecord.findFirst({
          where: {
            status: 'QUEUED',
            inputSnapshot: { not: Prisma.DbNull },
            cancelRequestedAt: null,
            leaseToken: null,
            solverVersion: input.solver_version,
            runtimeVersion: input.runtime_version,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        if (!queued) return null;
        const leaseToken = randomUUID();
        const updatedAt = new Date(
          Math.max(now.getTime(), queued.updatedAt.getTime() + 1),
        );
        const claimed = await tx.spatialSimulationRunRecord.updateMany({
          where: {
            id: queued.id,
            ownerId: queued.ownerId,
            status: 'QUEUED',
            updatedAt: queued.updatedAt,
            leaseToken: null,
            cancelRequestedAt: null,
            inputSnapshot: { not: Prisma.DbNull },
            solverVersion: input.solver_version,
            runtimeVersion: input.runtime_version,
          },
          data: {
            status: 'PREPARING_GEOMETRY',
            progress: 5,
            attemptCount: { increment: 1 },
            workerId: input.worker_id,
            leaseToken,
            leaseExpiresAt: new Date(
              updatedAt.getTime() + input.lease_duration_ms,
            ),
            startedAt: updatedAt,
            updatedAt,
          },
        });
        if (claimed.count !== 1) continue;
        const persisted = await tx.spatialSimulationRunRecord.findUnique({
          where: { id: queued.id },
        });
        if (!persisted || persisted.inputSnapshot === null) return null;
        return {
          ownerId: persisted.ownerId,
          workerId: input.worker_id,
          leaseToken,
          input: spatialRuntimeInputSchema.parse(persisted.inputSnapshot),
          run: fromRecord(persisted),
        };
      }
      return null;
    });
  }

  async renewClaim(
    candidate: SpatialSimulationRunLeaseInput,
  ): Promise<SpatialSimulationRunLeaseResult | null> {
    const input = spatialSimulationRunLeaseInputSchema.parse(candidate);
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + input.lease_duration_ms);
    const renewed = await this.prisma.spatialSimulationRunRecord.updateMany({
      where: {
        id: input.run_id,
        ownerId: input.owner_id,
        workerId: input.worker_id,
        leaseToken: input.lease_token,
        status: { in: [...activeStatuses] },
        leaseExpiresAt: { gt: now },
      },
      data: { leaseExpiresAt, updatedAt: now },
    });
    if (renewed.count !== 1) return null;
    const record = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: {
        id: input.run_id,
        ownerId: input.owner_id,
        workerId: input.worker_id,
        leaseToken: input.lease_token,
      },
    });
    if (!record) return null;
    return {
      cancelRequested: record.cancelRequestedAt !== null,
      leaseExpiresAt: leaseExpiresAt.toISOString(),
    };
  }

  async transitionClaimed(
    candidate: TransitionSpatialSimulationRunInput & {
      worker_id: string;
      lease_token: string;
    },
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const { worker_id, lease_token, ...transition } = candidate;
    const input = transitionSpatialSimulationRunInputSchema.parse(transition);
    const currentRecord =
      await this.prisma.spatialSimulationRunRecord.findFirst({
        where: { id: input.run_id, ownerId: input.owner_id },
      });
    if (!currentRecord) return null;
    const now = new Date();
    if (
      currentRecord.workerId !== worker_id ||
      currentRecord.leaseToken !== lease_token ||
      !currentRecord.leaseExpiresAt ||
      currentRecord.leaseExpiresAt <= now
    )
      throw new SpatialSimulationRunError(
        'lease_lost',
        'The worker no longer owns a live lease for this run',
      );
    const current = fromRecord(currentRecord);
    const next = assertTransition(current, input, currentRecord.inputSnapshot);
    const resultJson = serializeResultManifest(input.result);
    const terminal = ['completed', 'failed', 'cancelled'].includes(
      input.next_status,
    );
    const updated = await this.prisma.spatialSimulationRunRecord.updateMany({
      where: {
        id: input.run_id,
        ownerId: input.owner_id,
        status: toDatabaseStatus[input.expected_status],
        workerId: worker_id,
        leaseToken: lease_token,
        leaseExpiresAt: { gt: now },
        ...(current.cancellation_requested && input.next_status !== 'cancelled'
          ? { cancelRequestedAt: currentRecord.cancelRequestedAt }
          : input.next_status === 'cancelled'
            ? {}
            : { cancelRequestedAt: null }),
      },
      data: {
        status: toDatabaseStatus[input.next_status],
        progress: input.progress,
        meshSha256: next.mesh_sha256,
        resultManifest:
          resultJson !== null
            ? (JSON.parse(resultJson) as Prisma.InputJsonValue)
            : Prisma.DbNull,
        failureDetail: input.failure
          ? (input.failure as Prisma.InputJsonValue)
          : Prisma.DbNull,
        updatedAt: new Date(next.updated_at),
        startedAt: next.started_at ? new Date(next.started_at) : null,
        completedAt: next.completed_at ? new Date(next.completed_at) : null,
        cancelRequestedAt:
          input.next_status === 'cancelled'
            ? (currentRecord.cancelRequestedAt ?? now)
            : undefined,
        workerId: terminal ? null : worker_id,
        leaseToken: terminal ? null : lease_token,
        leaseExpiresAt: terminal ? null : currentRecord.leaseExpiresAt,
      },
    });
    if (updated.count !== 1)
      throw new SpatialSimulationRunError(
        'lease_lost',
        'The run or worker lease changed while the transition was being committed',
      );
    const persisted = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: { id: input.run_id, ownerId: input.owner_id },
    });
    return persisted ? fromRecord(persisted) : null;
  }

  async requestCancellation(
    runId: string,
    ownerId: string,
  ): Promise<SpatialSimulationRunSnapshot | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const record = await this.prisma.spatialSimulationRunRecord.findFirst({
        where: { id: runId, ownerId },
      });
      if (!record) return null;
      const current = fromRecord(record);
      if (['completed', 'failed', 'cancelled'].includes(current.status))
        return current;
      if (current.cancellation_requested) return current;
      const now = new Date(
        Math.max(Date.now(), record.updatedAt.getTime() + 1),
      );
      if (current.status === 'queued' && record.leaseToken === null) {
        const next = assertTransition(current, {
          run_id: runId,
          owner_id: ownerId,
          expected_status: 'queued',
          next_status: 'cancelled',
          progress: current.progress,
        });
        const updated = await this.prisma.spatialSimulationRunRecord.updateMany(
          {
            where: {
              id: runId,
              ownerId,
              status: 'QUEUED',
              updatedAt: record.updatedAt,
              leaseToken: null,
              cancelRequestedAt: null,
            },
            data: {
              status: 'CANCELLED',
              progress: current.progress,
              startedAt: null,
              completedAt: new Date(next.completed_at!),
              cancelRequestedAt: now,
              workerId: null,
              leaseToken: null,
              leaseExpiresAt: null,
              updatedAt: now,
            },
          },
        );
        if (updated.count === 1) {
          const cancelled =
            await this.prisma.spatialSimulationRunRecord.findFirst({
              where: { id: runId, ownerId },
            });
          return cancelled ? fromRecord(cancelled) : null;
        }
        continue;
      }
      const updated = await this.prisma.spatialSimulationRunRecord.updateMany({
        where: {
          id: runId,
          ownerId,
          status: toDatabaseStatus[current.status],
          updatedAt: record.updatedAt,
          cancelRequestedAt: null,
        },
        data: { cancelRequestedAt: now, updatedAt: now },
      });
      if (updated.count === 1) {
        const requested =
          await this.prisma.spatialSimulationRunRecord.findFirst({
            where: { id: runId, ownerId },
          });
        return requested ? fromRecord(requested) : null;
      }
    }
    throw new SpatialSimulationRunError(
      'stale_state',
      'The run changed while cancellation was being requested',
    );
  }

  async retryFailedRun(
    candidate: RetrySpatialSimulationRunInput,
  ): Promise<RetrySpatialSimulationRunResult> {
    const input = retrySpatialSimulationRunInputSchema.parse(candidate);
    const existing = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: {
        ownerId: input.owner_id,
        idempotencyKey: input.idempotency_key,
      },
    });
    if (existing) {
      if (existing.retryOfRunId !== input.run_id)
        throw new SpatialSimulationRunError(
          'idempotency_conflict',
          'This idempotency key is already bound to another run',
        );
      return { created: false, run: fromRecord(existing) };
    }
    const parent = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: { id: input.run_id, ownerId: input.owner_id },
    });
    if (!parent)
      throw new SpatialSimulationRunError('not_found', 'Run not found');
    if (parent.status !== 'FAILED' || parent.inputSnapshot === null)
      throw new SpatialSimulationRunError(
        'retry_not_allowed',
        'Only failed runs with a persisted input snapshot can be retried',
      );
    if (parent.retryCount >= MAX_MANUAL_RETRIES)
      throw new SpatialSimulationRunError(
        'retry_limit_exceeded',
        'This run has reached the manual retry limit',
      );
    const sibling = await this.prisma.spatialSimulationRunRecord.findFirst({
      where: { retryOfRunId: parent.id },
      select: { id: true },
    });
    if (sibling)
      throw new SpatialSimulationRunError(
        'retry_not_allowed',
        'This failed run already has a retry; continue from that lineage',
      );
    const id = randomUUID();
    try {
      const retried = await this.prisma.spatialSimulationRunRecord.create({
        data: {
          id,
          ownerId: parent.ownerId,
          evaluationId: parent.evaluationId,
          idempotencyKey: input.idempotency_key,
          modelId: parent.modelId,
          system: parent.system,
          dimension: parent.dimension,
          inputContractVersion: parent.inputContractVersion,
          inputSha256: parent.inputSha256,
          inputSnapshot: parent.inputSnapshot as Prisma.InputJsonValue,
          solverVersion: parent.solverVersion,
          runtimeVersion: parent.runtimeVersion,
          meshRequestSha256: parent.meshRequestSha256,
          retryOfRunId: parent.id,
          retryCount: parent.retryCount + 1,
          maxAttempts: parent.maxAttempts,
        },
      });
      return { created: true, run: fromRecord(retried) };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const raced = await this.prisma.spatialSimulationRunRecord.findFirst({
        where: {
          ownerId: input.owner_id,
          idempotencyKey: input.idempotency_key,
        },
      });
      if (raced) {
        if (raced.retryOfRunId !== input.run_id) throw error;
        return { created: false, run: fromRecord(raced) };
      }
      const sibling = await this.prisma.spatialSimulationRunRecord.findFirst({
        where: { retryOfRunId: parent.id },
        select: { id: true },
      });
      if (sibling)
        throw new SpatialSimulationRunError(
          'retry_not_allowed',
          'This failed run already has a retry; continue from that lineage',
        );
      throw error;
    }
  }
}

export class MemorySpatialSimulationRunRepository implements SpatialSimulationRunRepository {
  private readonly runs = new Map<
    string,
    {
      ownerId: string;
      idempotencyKey: string;
      input: SpatialRuntimeInput;
      workerId: string | null;
      leaseToken: string | null;
      leaseExpiresAt: number | null;
      cancelRequestedAt: string | null;
      snapshot: SpatialSimulationRunSnapshot;
    }
  >();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async createOrGet(
    candidate: CreateSpatialSimulationRunInput,
  ): Promise<CreateSpatialSimulationRunResult> {
    const input = createSpatialSimulationRunInputSchema.parse(candidate);
    const inputJson = JSON.stringify(input.input_snapshot);
    if (Buffer.byteLength(inputJson, 'utf8') > MAX_INPUT_SNAPSHOT_BYTES)
      throw new SpatialSimulationRunError(
        'input_snapshot_too_large',
        'Spatial input metadata exceeds 2 MiB; keep mesh and field arrays in artifacts',
      );
    const existing = [...this.runs.values()].find(
      (record) =>
        record.ownerId === input.owner_id &&
        record.idempotencyKey === input.idempotency_key,
    );
    if (existing) {
      assertSameIdempotentRequest(existing.snapshot, input);
      return { run: existing.snapshot, created: false };
    }
    const now = this.now().toISOString();
    const run = spatialSimulationRunSnapshotSchema.parse({
      id: randomUUID(),
      evaluation_id: input.evaluation_id,
      model_id: input.model_id,
      system: input.system,
      dimension: input.dimension,
      input_contract_version: input.input_contract_version,
      input_sha256: input.input_sha256,
      solver_version: input.solver_version,
      runtime_version: input.runtime_version,
      mesh_request_sha256: input.mesh_request_sha256,
      mesh_sha256: null,
      status: 'queued',
      progress: 0,
      attempt_count: 0,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
      retry_count: 0,
      retry_of_run_id: null,
      cancellation_requested: false,
      result: null,
      failure: null,
      created_at: now,
      updated_at: now,
      started_at: null,
      completed_at: null,
    });
    this.runs.set(run.id, {
      ownerId: input.owner_id,
      idempotencyKey: input.idempotency_key,
      input: spatialRuntimeInputSchema.parse(JSON.parse(inputJson)),
      workerId: null,
      leaseToken: null,
      leaseExpiresAt: null,
      cancelRequestedAt: null,
      snapshot: run,
    });
    return { run, created: true };
  }

  async getOwnedRun(
    runId: string,
    ownerId: string,
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const record = this.runs.get(runId);
    return record?.ownerId === ownerId ? record.snapshot : null;
  }

  async getOwnedInput(
    runId: string,
    ownerId: string,
  ): Promise<SpatialRuntimeInput | null> {
    const record = this.runs.get(runId);
    return record?.ownerId === ownerId ? record.input : null;
  }

  async transition(
    candidate: TransitionSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const input = transitionSpatialSimulationRunInputSchema.parse(candidate);
    const record = this.runs.get(input.run_id);
    if (!record || record.ownerId !== input.owner_id) return null;
    if (record.leaseToken)
      throw new SpatialSimulationRunError(
        'lease_lost',
        'A claimed run can only be transitioned by its active worker lease',
      );
    const next = assertTransition(record.snapshot, input, record.input);
    serializeResultManifest(input.result);
    record.snapshot = next;
    if (input.next_status === 'cancelled')
      record.cancelRequestedAt = next.updated_at;
    if (['completed', 'failed', 'cancelled'].includes(input.next_status)) {
      record.workerId = null;
      record.leaseToken = null;
      record.leaseExpiresAt = null;
    }
    return next;
  }

  async claimNextQueued(
    candidate: ClaimSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunWorkItem | null> {
    const input = claimSpatialSimulationRunInputSchema.parse(candidate);
    const now = this.now();
    for (const record of this.runs.values()) {
      if (
        !record.leaseExpiresAt ||
        record.leaseExpiresAt > now.getTime() ||
        ![
          'preparing_geometry',
          'meshing',
          'solving',
          'postprocessing',
        ].includes(record.snapshot.status)
      )
        continue;
      const terminal = record.cancelRequestedAt
        ? 'cancelled'
        : record.snapshot.attempt_count >= record.snapshot.max_attempts
          ? 'failed'
          : null;
      const updatedAt = new Date(
        Math.max(now.getTime(), Date.parse(record.snapshot.updated_at) + 1),
      ).toISOString();
      if (terminal === 'cancelled') {
        record.snapshot = spatialSimulationRunSnapshotSchema.parse({
          ...record.snapshot,
          status: 'cancelled',
          cancellation_requested: true,
          updated_at: updatedAt,
          completed_at: updatedAt,
        });
      } else if (terminal === 'failed') {
        record.snapshot = spatialSimulationRunSnapshotSchema.parse({
          ...record.snapshot,
          status: 'failed',
          failure: {
            code: 'worker_lease_expired',
            message: 'The worker lease expired after the allowed attempts',
          },
          updated_at: updatedAt,
          completed_at: updatedAt,
        });
      } else {
        record.snapshot = spatialSimulationRunSnapshotSchema.parse({
          ...record.snapshot,
          status: 'queued',
          progress: 0,
          result: null,
          failure: null,
          updated_at: updatedAt,
          started_at: null,
          completed_at: null,
        });
      }
      record.workerId = null;
      record.leaseToken = null;
      record.leaseExpiresAt = null;
    }

    const queued = [...this.runs.values()]
      .filter(
        (record) =>
          record.snapshot.status === 'queued' &&
          !record.snapshot.cancellation_requested &&
          record.snapshot.solver_version === input.solver_version &&
          record.snapshot.runtime_version === input.runtime_version,
      )
      .sort(
        (left, right) =>
          left.snapshot.created_at.localeCompare(right.snapshot.created_at) ||
          left.snapshot.id.localeCompare(right.snapshot.id),
      )[0];
    if (!queued) return null;
    const leaseToken = randomUUID();
    const preparing = assertTransition(queued.snapshot, {
      run_id: queued.snapshot.id,
      owner_id: queued.ownerId,
      expected_status: 'queued',
      next_status: 'preparing_geometry',
      progress: 5,
    });
    const attemptCount = preparing.attempt_count + 1;
    queued.snapshot = spatialSimulationRunSnapshotSchema.parse({
      ...preparing,
      attempt_count: attemptCount,
    });
    queued.workerId = input.worker_id;
    queued.leaseToken = leaseToken;
    queued.leaseExpiresAt = now.getTime() + input.lease_duration_ms;
    return {
      ownerId: queued.ownerId,
      workerId: input.worker_id,
      leaseToken,
      input: queued.input,
      run: queued.snapshot,
    };
  }

  async renewClaim(
    candidate: SpatialSimulationRunLeaseInput,
  ): Promise<SpatialSimulationRunLeaseResult | null> {
    const input = spatialSimulationRunLeaseInputSchema.parse(candidate);
    const record = this.runs.get(input.run_id);
    const now = this.now();
    if (
      !record ||
      record.ownerId !== input.owner_id ||
      record.workerId !== input.worker_id ||
      record.leaseToken !== input.lease_token ||
      !record.leaseExpiresAt ||
      record.leaseExpiresAt <= now.getTime() ||
      !['preparing_geometry', 'meshing', 'solving', 'postprocessing'].includes(
        record.snapshot.status,
      )
    )
      return null;
    record.leaseExpiresAt = now.getTime() + input.lease_duration_ms;
    return {
      cancelRequested: record.cancelRequestedAt !== null,
      leaseExpiresAt: new Date(record.leaseExpiresAt).toISOString(),
    };
  }

  async transitionClaimed(
    candidate: TransitionSpatialSimulationRunInput & {
      worker_id: string;
      lease_token: string;
    },
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const { worker_id, lease_token, ...transition } = candidate;
    const input = transitionSpatialSimulationRunInputSchema.parse(transition);
    const record = this.runs.get(input.run_id);
    const now = this.now();
    if (!record || record.ownerId !== input.owner_id) return null;
    if (
      record.workerId !== worker_id ||
      record.leaseToken !== lease_token ||
      !record.leaseExpiresAt ||
      record.leaseExpiresAt <= now.getTime()
    )
      throw new SpatialSimulationRunError(
        'lease_lost',
        'The worker no longer owns a live lease for this run',
      );
    const next = assertTransition(record.snapshot, input, record.input);
    serializeResultManifest(input.result);
    record.snapshot = next;
    if (input.next_status === 'cancelled' && !record.cancelRequestedAt)
      record.cancelRequestedAt = next.updated_at;
    if (['completed', 'failed', 'cancelled'].includes(input.next_status)) {
      record.workerId = null;
      record.leaseToken = null;
      record.leaseExpiresAt = null;
    }
    return next;
  }

  async requestCancellation(
    runId: string,
    ownerId: string,
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const record = this.runs.get(runId);
    if (!record || record.ownerId !== ownerId) return null;
    const current = record.snapshot;
    if (['completed', 'failed', 'cancelled'].includes(current.status))
      return current;
    if (current.cancellation_requested) return current;
    const now = new Date(
      Math.max(this.now().getTime(), Date.parse(current.updated_at) + 1),
    ).toISOString();
    if (current.status === 'queued') {
      record.snapshot = assertTransition(current, {
        run_id: runId,
        owner_id: ownerId,
        expected_status: 'queued',
        next_status: 'cancelled',
        progress: current.progress,
      });
      record.cancelRequestedAt = now;
      return record.snapshot;
    }
    record.cancelRequestedAt = now;
    record.snapshot = spatialSimulationRunSnapshotSchema.parse({
      ...current,
      cancellation_requested: true,
      updated_at: now,
    });
    return record.snapshot;
  }

  async retryFailedRun(
    candidate: RetrySpatialSimulationRunInput,
  ): Promise<RetrySpatialSimulationRunResult> {
    const input = retrySpatialSimulationRunInputSchema.parse(candidate);
    const existing = [...this.runs.values()].find(
      (record) =>
        record.ownerId === input.owner_id &&
        record.idempotencyKey === input.idempotency_key,
    );
    if (existing) {
      if (existing.snapshot.retry_of_run_id !== input.run_id)
        throw new SpatialSimulationRunError(
          'idempotency_conflict',
          'This idempotency key is already bound to another run',
        );
      return { created: false, run: existing.snapshot };
    }
    const parent = this.runs.get(input.run_id);
    if (!parent || parent.ownerId !== input.owner_id)
      throw new SpatialSimulationRunError('not_found', 'Run not found');
    if (parent.snapshot.status !== 'failed')
      throw new SpatialSimulationRunError(
        'retry_not_allowed',
        'Only failed runs can be retried',
      );
    if (parent.snapshot.retry_count >= MAX_MANUAL_RETRIES)
      throw new SpatialSimulationRunError(
        'retry_limit_exceeded',
        'This run has reached the manual retry limit',
      );
    if (
      [...this.runs.values()].some(
        (record) => record.snapshot.retry_of_run_id === parent.snapshot.id,
      )
    )
      throw new SpatialSimulationRunError(
        'retry_not_allowed',
        'This failed run already has a retry; continue from that lineage',
      );
    const now = this.now().toISOString();
    const run = spatialSimulationRunSnapshotSchema.parse({
      ...parent.snapshot,
      id: randomUUID(),
      status: 'queued',
      progress: 0,
      attempt_count: 0,
      retry_count: parent.snapshot.retry_count + 1,
      retry_of_run_id: parent.snapshot.id,
      cancellation_requested: false,
      result: null,
      failure: null,
      created_at: now,
      updated_at: now,
      started_at: null,
      completed_at: null,
    });
    this.runs.set(run.id, {
      ownerId: parent.ownerId,
      idempotencyKey: input.idempotency_key,
      input: parent.input,
      workerId: null,
      leaseToken: null,
      leaseExpiresAt: null,
      cancelRequestedAt: null,
      snapshot: run,
    });
    return { created: true, run };
  }
}

export function createSpatialSimulationRunRepository(
  prisma: PrismaClient = getPrismaClient(),
): PrismaSpatialSimulationRunRepository {
  return new PrismaSpatialSimulationRunRepository(prisma);
}
