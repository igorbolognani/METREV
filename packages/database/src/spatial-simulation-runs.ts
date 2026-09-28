import { randomUUID } from 'node:crypto';

import {
  createSpatialSimulationRunInputSchema,
  spatialSimulationResultSchema,
  spatialSimulationRunSnapshotSchema,
  transitionSpatialSimulationRunInputSchema,
  type CreateSpatialSimulationRunInput,
  type SpatialSimulationRunSnapshot,
  type SpatialSimulationRunStatus,
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

export type SpatialSimulationRunErrorCode =
  | 'not_found'
  | 'idempotency_conflict'
  | 'invalid_transition'
  | 'stale_state'
  | 'invalid_evaluation_scope'
  | 'result_manifest_too_large';

export class SpatialSimulationRunError extends Error {
  constructor(
    readonly code: SpatialSimulationRunErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SpatialSimulationRunError';
  }
}

export interface CreateSpatialSimulationRunResult {
  run: SpatialSimulationRunSnapshot;
  created: boolean;
}

export interface SpatialSimulationRunRepository {
  createOrGet(
    input: CreateSpatialSimulationRunInput,
  ): Promise<CreateSpatialSimulationRunResult>;
  getOwnedRun(
    runId: string,
    ownerId: string,
  ): Promise<SpatialSimulationRunSnapshot | null>;
  transition(
    input: TransitionSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunSnapshot | null>;
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
): SpatialSimulationRunSnapshot {
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

  const now = new Date(
    Math.max(Date.now(), Date.parse(current.updated_at) + 1),
  ).toISOString();
  const terminal = ['completed', 'failed', 'cancelled'].includes(
    input.next_status,
  );
  const result = input.result ?? null;
  const failure = input.failure ?? null;
  return spatialSimulationRunSnapshotSchema.parse({
    ...current,
    status: input.next_status,
    progress: input.progress,
    mesh_sha256: meshSha256,
    result,
    failure,
    updated_at: now,
    started_at:
      current.started_at ?? (input.next_status === 'queued' ? null : now),
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
    const next = assertTransition(current, input);
    const resultJson = input.result ? JSON.stringify(input.result) : null;
    if (
      resultJson !== null &&
      Buffer.byteLength(resultJson, 'utf8') > MAX_RESULT_MANIFEST_BYTES
    )
      throw new SpatialSimulationRunError(
        'result_manifest_too_large',
        'Spatial result metadata exceeds 2 MiB; move field samples into artifacts',
      );

    const updated = await this.prisma.spatialSimulationRunRecord.updateMany({
      where: {
        id: input.run_id,
        ownerId: input.owner_id,
        status: toDatabaseStatus[input.expected_status],
        updatedAt: currentRecord.updatedAt,
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
}

export class MemorySpatialSimulationRunRepository implements SpatialSimulationRunRepository {
  private readonly runs = new Map<
    string,
    {
      ownerId: string;
      idempotencyKey: string;
      snapshot: SpatialSimulationRunSnapshot;
    }
  >();

  async createOrGet(
    candidate: CreateSpatialSimulationRunInput,
  ): Promise<CreateSpatialSimulationRunResult> {
    const input = createSpatialSimulationRunInputSchema.parse(candidate);
    const existing = [...this.runs.values()].find(
      (record) =>
        record.ownerId === input.owner_id &&
        record.idempotencyKey === input.idempotency_key,
    );
    if (existing) {
      assertSameIdempotentRequest(existing.snapshot, input);
      return { run: existing.snapshot, created: false };
    }
    const now = new Date().toISOString();
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

  async transition(
    candidate: TransitionSpatialSimulationRunInput,
  ): Promise<SpatialSimulationRunSnapshot | null> {
    const input = transitionSpatialSimulationRunInputSchema.parse(candidate);
    const record = this.runs.get(input.run_id);
    if (!record || record.ownerId !== input.owner_id) return null;
    const next = assertTransition(record.snapshot, input);
    if (
      input.result &&
      Buffer.byteLength(JSON.stringify(input.result), 'utf8') >
        MAX_RESULT_MANIFEST_BYTES
    )
      throw new SpatialSimulationRunError(
        'result_manifest_too_large',
        'Spatial result metadata exceeds 2 MiB; move field samples into artifacts',
      );
    record.snapshot = next;
    return next;
  }
}

export function createSpatialSimulationRunRepository(
  prisma: PrismaClient = getPrismaClient(),
): PrismaSpatialSimulationRunRepository {
  return new PrismaSpatialSimulationRunRepository(prisma);
}
