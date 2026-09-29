import { describe, expect, it } from 'vitest';

import { MemorySpatialSimulationRunRepository } from '@metrev/database';
import type { SpatialSimulationRunStatus } from '@metrev/domain-contracts';

import { oversizedSpatialSimulationResult } from '../fixtures/oversized-spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';

const meshSha256 = 'a'.repeat(64);

describe('spatial result persistence bounds', () => {
  it.each([false, true])(
    'rejects oversized valid metadata before persistence for leased=%s',
    async (leased) => {
      const repository = new MemorySpatialSimulationRunRepository();
      const createInput = createSpatialSimulationRunInput({
        ownerId: 'user-spatial-result-limit',
        idempotencyKey: `result-limit-${leased}`,
      });
      const { run } = await repository.createOrGet(createInput);
      const claim = leased
        ? await repository.claimNextQueued({
            worker_id: 'result-limit-worker',
            solver_version: createInput.solver_version,
            runtime_version: createInput.runtime_version,
            lease_duration_ms: 30_000,
          })
        : null;
      if (leased && !claim) throw new Error('Expected the run to be claimed');

      const advance = async (
        expected_status: SpatialSimulationRunStatus,
        next_status: SpatialSimulationRunStatus,
        progress: number,
        mesh_sha256?: string,
      ) => {
        const transition = {
          run_id: run.id,
          owner_id: createInput.owner_id,
          expected_status,
          next_status,
          progress,
          ...(mesh_sha256 ? { mesh_sha256 } : {}),
        } as const;
        return claim
          ? repository.transitionClaimed({
              ...transition,
              worker_id: claim.workerId,
              lease_token: claim.leaseToken,
            })
          : repository.transition(transition);
      };

      let current = claim?.run ?? run;
      if (!claim) {
        current = (await advance('queued', 'preparing_geometry', 10))!;
      }
      current = (await advance(current.status, 'meshing', 20))!;
      current = (await advance(current.status, 'solving', 30, meshSha256))!;
      const postprocessing = await advance(
        current.status,
        'postprocessing',
        90,
      );
      if (!postprocessing)
        throw new Error('Expected the run to reach postprocessing');

      const result = oversizedSpatialSimulationResult({
        ...postprocessing,
        status: 'completed',
        progress: 100,
        mesh_sha256: meshSha256,
        result: null,
        failure: null,
        completed_at: new Date().toISOString(),
      });

      const completion = {
        run_id: run.id,
        owner_id: createInput.owner_id,
        expected_status: 'postprocessing' as const,
        next_status: 'completed' as const,
        progress: 100,
        result,
      };
      await expect(
        claim
          ? repository.transitionClaimed({
              ...completion,
              worker_id: claim.workerId,
              lease_token: claim.leaseToken,
            })
          : repository.transition(completion),
      ).rejects.toMatchObject({ code: 'result_manifest_too_large' });

      await expect(
        repository.getOwnedRun(run.id, createInput.owner_id),
      ).resolves.toMatchObject({
        status: 'postprocessing',
      });
    },
  );
});
