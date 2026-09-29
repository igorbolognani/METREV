import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PrismaSpatialSimulationRunRepository,
  disconnectPrismaClient,
  getPrismaClient,
} from '@metrev/database';

import { oversizedSpatialSimulationResult } from '../fixtures/oversized-spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';

describe('PostgreSQL spatial result manifest limits', () => {
  const prisma = getPrismaClient();
  const repository = new PrismaSpatialSimulationRunRepository(prisma);
  const idempotencyKey = `spatial-result-size-${randomUUID()}`;
  let ownerId: string;

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
    if (ownerId)
      await prisma.spatialSimulationRunRecord.deleteMany({
        where: { ownerId, idempotencyKey },
      });
    await disconnectPrismaClient();
  });

  it('rejects a schema-valid manifest over 2 MiB without completing the run', async () => {
    const createInput = createSpatialSimulationRunInput({
      ownerId,
      idempotencyKey,
    });
    const { run } = await repository.createOrGet(createInput);
    const preparing = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'queued',
      next_status: 'preparing_geometry',
      progress: 10,
    });
    if (!preparing) throw new Error('Run disappeared after queueing');
    const meshing = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'preparing_geometry',
      next_status: 'meshing',
      progress: 20,
    });
    if (!meshing) throw new Error('Run disappeared during meshing');
    const solving = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'meshing',
      next_status: 'solving',
      progress: 30,
      mesh_sha256: 'a'.repeat(64),
    });
    if (!solving) throw new Error('Run disappeared after meshing');
    const postprocessing = await repository.transition({
      run_id: run.id,
      owner_id: ownerId,
      expected_status: 'solving',
      next_status: 'postprocessing',
      progress: 90,
    });
    if (!postprocessing)
      throw new Error('Run disappeared before result persistence');

    const result = oversizedSpatialSimulationResult({
      ...postprocessing,
      status: 'completed',
      progress: 100,
      mesh_sha256: 'a'.repeat(64),
      result: null,
      failure: null,
      completed_at: new Date().toISOString(),
    });

    await expect(
      repository.transition({
        run_id: run.id,
        owner_id: ownerId,
        expected_status: 'postprocessing',
        next_status: 'completed',
        progress: 100,
        result,
      }),
    ).rejects.toMatchObject({ code: 'result_manifest_too_large' });
    await expect(
      repository.getOwnedRun(run.id, ownerId),
    ).resolves.toMatchObject({
      status: 'postprocessing',
      result: null,
    });
  });
});
