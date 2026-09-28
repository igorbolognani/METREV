import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PrismaSpatialSimulationRunRepository,
  disconnectPrismaClient,
  getPrismaClient,
} from '@metrev/database';
import type { CreateSpatialSimulationRunInput } from '@metrev/domain-contracts';

import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';

describe('PostgreSQL spatial simulation run lifecycle', () => {
  const prisma = getPrismaClient();
  const repository = new PrismaSpatialSimulationRunRepository(prisma);
  const idempotencyKey = `spatial-run-postgres-${randomUUID()}`;
  let ownerId: string;
  let runId: string;

  beforeAll(async () => {
    const email = (
      process.env.METREV_LOCAL_ANALYST_EMAIL ?? 'analyst@metrev.local'
    ).toLowerCase();
    const owner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!owner)
      throw new Error('Seeded analyst user is required for this test');
    ownerId = owner.id;
  });

  afterAll(async () => {
    if (ownerId) {
      await prisma.spatialSimulationRunRecord.deleteMany({
        where: {
          ownerId,
          idempotencyKey: {
            in: [
              idempotencyKey,
              `${idempotencyKey}-parallel`,
              `${idempotencyKey}-nonconverged`,
            ],
          },
        },
      });
    }
    await disconnectPrismaClient();
  });

  it('persists an idempotent owner-scoped run through completion and result reload', async () => {
    const input: CreateSpatialSimulationRunInput = {
      owner_id: ownerId,
      evaluation_id: null,
      idempotency_key: idempotencyKey,
      model_id: 'cell-2d-development-v1',
      system: 'MFC',
      dimension: 2,
      input_contract_version: 'spatial-input-v2',
      input_sha256: 'd'.repeat(64),
      solver_version: 'solver-dev-1',
      runtime_version: 'sidecar-dev-1',
      mesh_request_sha256: 'c'.repeat(64),
    };

    const created = await repository.createOrGet(input);
    runId = created.run.id;
    expect(created.created).toBe(true);
    expect(created.run.status).toBe('queued');

    const replay = await repository.createOrGet(input);
    expect(replay.created).toBe(false);
    expect(replay.run.id).toBe(runId);
    await expect(
      repository.createOrGet({ ...input, input_sha256: 'e'.repeat(64) }),
    ).rejects.toMatchObject({
      code: 'idempotency_conflict',
    });
    await expect(
      repository.getOwnedRun(runId, 'different-owner'),
    ).resolves.toBeNull();

    const preparing = await repository.transition({
      run_id: runId,
      owner_id: ownerId,
      expected_status: 'queued',
      next_status: 'preparing_geometry',
      progress: 10,
    });
    expect(preparing?.started_at).not.toBeNull();
    const meshing = await repository.transition({
      run_id: runId,
      owner_id: ownerId,
      expected_status: 'preparing_geometry',
      next_status: 'meshing',
      progress: 20,
    });
    expect(meshing?.status).toBe('meshing');
    const solving = await repository.transition({
      run_id: runId,
      owner_id: ownerId,
      expected_status: 'meshing',
      next_status: 'solving',
      progress: 30,
      mesh_sha256: 'a'.repeat(64),
    });
    expect(solving?.mesh_sha256).toBe('a'.repeat(64));
    const postprocessing = await repository.transition({
      run_id: runId,
      owner_id: ownerId,
      expected_status: 'solving',
      next_status: 'postprocessing',
      progress: 90,
    });
    if (!postprocessing) throw new Error('Postprocessing transition was lost');

    const result = validSpatialSimulationResult({
      ...postprocessing,
      status: 'completed',
      progress: 100,
      mesh_sha256: 'a'.repeat(64),
      result: null,
      failure: null,
      completed_at: new Date().toISOString(),
    });
    const completed = await repository.transition({
      run_id: runId,
      owner_id: ownerId,
      expected_status: 'postprocessing',
      next_status: 'completed',
      progress: 100,
      result,
    });
    expect(completed).toMatchObject({
      id: runId,
      status: 'completed',
      progress: 100,
      result: { contract_version: 'spatial-simulation-result-v1' },
    });

    const reloaded = await repository.getOwnedRun(runId, ownerId);
    expect(reloaded?.result?.fields[0]?.artifact.sha256).toBe('b'.repeat(64));
    expect(reloaded?.result?.mesh.mesh_quality.cell_count).toBe(480);
  });

  it('deduplicates concurrent creates that reuse one owner idempotency key', async () => {
    const input: CreateSpatialSimulationRunInput = {
      owner_id: ownerId,
      evaluation_id: null,
      idempotency_key: `${idempotencyKey}-parallel`,
      model_id: 'cell-2d-development-v1',
      system: 'MFC',
      dimension: 2,
      input_contract_version: 'spatial-input-v2',
      input_sha256: 'f'.repeat(64),
      solver_version: 'solver-dev-1',
      runtime_version: 'sidecar-dev-1',
      mesh_request_sha256: 'c'.repeat(64),
    };
    const outcomes = await Promise.all([
      repository.createOrGet(input),
      repository.createOrGet(input),
    ]);

    expect(outcomes.map(({ created }) => created).sort()).toEqual([
      false,
      true,
    ]);
    expect(outcomes[0]?.run.id).toBe(outcomes[1]?.run.id);
  });

  it('reloads non-convergence diagnostics and failure state from PostgreSQL', async () => {
    const input: CreateSpatialSimulationRunInput = {
      owner_id: ownerId,
      evaluation_id: null,
      idempotency_key: `${idempotencyKey}-nonconverged`,
      model_id: 'cell-2d-development-v1',
      system: 'MFC',
      dimension: 2,
      input_contract_version: 'spatial-input-v2',
      input_sha256: '9'.repeat(64),
      solver_version: 'solver-dev-1',
      runtime_version: 'sidecar-dev-1',
      mesh_request_sha256: 'c'.repeat(64),
    };
    const { run } = await repository.createOrGet(input);
    const preparing = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'queued',
      next_status: 'preparing_geometry',
      progress: 10,
    });
    if (!preparing) throw new Error('Run was not found after queueing');
    const meshing = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'preparing_geometry',
      next_status: 'meshing',
      progress: 20,
    });
    if (!meshing) throw new Error('Run was not found after geometry setup');
    const solving = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'meshing',
      next_status: 'solving',
      progress: 40,
      mesh_sha256: 'a'.repeat(64),
    });
    if (!solving) throw new Error('Run was not found after meshing');
    const valid = validSpatialSimulationResult(solving);
    const result = {
      ...valid,
      convergence: [
        {
          ...valid.convergence[0],
          status: 'not_converged' as const,
          termination_reason: 'maximum_iterations',
          history: [
            { iteration: 1, nonlinear_residual: 0.1 },
            { iteration: 2, nonlinear_residual: 0.05 },
          ],
        },
      ],
      warnings: [
        {
          code: 'non_convergence',
          severity: 'error' as const,
          message: 'The nonlinear solver reached its iteration limit',
        },
      ],
    };
    const failed = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'solving',
      next_status: 'failed',
      progress: 80,
      result,
      failure: {
        code: 'non_convergence',
        message: 'Solver stopped before satisfying the declared tolerance',
      },
    });

    const reloaded = await repository.getOwnedRun(run.id, ownerId);
    expect(failed?.status).toBe('failed');
    expect(reloaded).toMatchObject({
      status: 'failed',
      result: { convergence: [{ status: 'not_converged' }] },
      failure: { code: 'non_convergence' },
    });
  });
});
