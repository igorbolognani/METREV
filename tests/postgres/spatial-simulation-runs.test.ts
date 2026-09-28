import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PrismaSpatialSimulationRunRepository,
  disconnectPrismaClient,
  getPrismaClient,
} from '@metrev/database';
import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';

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
              `${idempotencyKey}-lease`,
              `${idempotencyKey}-retry-parent`,
              `${idempotencyKey}-retry-child`,
            ],
          },
        },
      });
    }
    await disconnectPrismaClient();
  });

  it('persists an idempotent owner-scoped run through completion and result reload', async () => {
    const input = createSpatialSimulationRunInput({
      ownerId,
      idempotencyKey,
    });

    const created = await repository.createOrGet(input);
    runId = created.run.id;
    expect(created.created).toBe(true);
    expect(created.run.status).toBe('queued');

    const replay = await repository.createOrGet(input);
    expect(replay.created).toBe(false);
    expect(replay.run.id).toBe(runId);
    await expect(
      repository.createOrGet({ ...input, runtime_version: 'sidecar-dev-2' }),
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
    const input = createSpatialSimulationRunInput({
      ownerId,
      idempotencyKey: `${idempotencyKey}-parallel`,
    });
    const outcomes = await Promise.all([
      repository.createOrGet(input),
      repository.createOrGet(input),
    ]);

    expect(outcomes.map(({ created }) => created).sort()).toEqual([
      false,
      true,
    ]);
    expect(outcomes[0]?.run.id).toBe(outcomes[1]?.run.id);
    await expect(
      repository.requestCancellation(outcomes[0]!.run.id, ownerId),
    ).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('leases a queued run to one worker and persists cancellation and retry lineage', async () => {
    const queuedInput = createSpatialSimulationRunInput({
      ownerId,
      idempotencyKey: `${idempotencyKey}-lease`,
    });
    const { run } = await repository.createOrGet(queuedInput);
    const claims = await Promise.all([
      repository.claimNextQueued({
        worker_id: 'postgres-worker-a',
        solver_version: queuedInput.solver_version,
        runtime_version: queuedInput.runtime_version,
        lease_duration_ms: 30_000,
      }),
      repository.claimNextQueued({
        worker_id: 'postgres-worker-b',
        solver_version: queuedInput.solver_version,
        runtime_version: queuedInput.runtime_version,
        lease_duration_ms: 30_000,
      }),
    ]);
    const claimed = claims.filter((entry) => entry !== null);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.run).toMatchObject({
      id: run.id,
      status: 'preparing_geometry',
      attempt_count: 1,
    });
    const worker = claimed[0]!;
    await expect(
      repository.requestCancellation(run.id, ownerId),
    ).resolves.toMatchObject({ cancellation_requested: true });
    await expect(
      repository.renewClaim({
        run_id: run.id,
        owner_id: ownerId,
        worker_id: worker.workerId,
        lease_token: worker.leaseToken,
        lease_duration_ms: 30_000,
      }),
    ).resolves.toMatchObject({ cancelRequested: true });
    const cancelled = await repository.transitionClaimed({
      run_id: run.id,
      owner_id: ownerId,
      worker_id: worker.workerId,
      lease_token: worker.leaseToken,
      expected_status: 'preparing_geometry',
      next_status: 'cancelled',
      progress: 5,
    });
    expect(cancelled).toMatchObject({
      status: 'cancelled',
      cancellation_requested: true,
    });

    const failedInput = createSpatialSimulationRunInput({
      ownerId,
      idempotencyKey: `${idempotencyKey}-retry-parent`,
    });
    const failedRun = await repository.createOrGet(failedInput);
    await repository.transition({
      run_id: failedRun.run.id,
      owner_id: ownerId,
      expected_status: 'queued',
      next_status: 'failed',
      progress: 0,
      failure: { code: 'mesh_failure', message: 'Mesh preparation failed' },
    });
    const retry = await repository.retryFailedRun({
      run_id: failedRun.run.id,
      owner_id: ownerId,
      idempotency_key: `${idempotencyKey}-retry-child`,
    });
    expect(retry).toMatchObject({
      created: true,
      run: {
        status: 'queued',
        retry_of_run_id: failedRun.run.id,
        retry_count: 1,
      },
    });
    await expect(
      repository.retryFailedRun({
        run_id: failedRun.run.id,
        owner_id: ownerId,
        idempotency_key: `${idempotencyKey}-retry-child`,
      }),
    ).resolves.toMatchObject({ created: false, run: { id: retry.run.id } });
  });

  it('reloads non-convergence diagnostics and failure state from PostgreSQL', async () => {
    const input = createSpatialSimulationRunInput({
      ownerId,
      idempotencyKey: `${idempotencyKey}-nonconverged`,
    });
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
