import { describe, expect, it } from 'vitest';

import { MemorySpatialSimulationRunRepository } from '@metrev/database';
import {
  spatialSimulationResultSchema,
  type CreateSpatialSimulationRunInput,
  type SpatialSimulationRunSnapshot,
} from '@metrev/domain-contracts';

import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';

const meshSha256 = 'a'.repeat(64);
const input: CreateSpatialSimulationRunInput = {
  owner_id: 'user-123',
  evaluation_id: null,
  idempotency_key: 'spatial-run-test-key',
  model_id: 'cell-2d-development-v1',
  system: 'MFC',
  dimension: 2,
  input_contract_version: 'spatial-input-v2',
  input_sha256: 'd'.repeat(64),
  solver_version: 'solver-dev-1',
  runtime_version: 'sidecar-dev-1',
  mesh_request_sha256: 'c'.repeat(64),
};

async function completeRun(
  repository: MemorySpatialSimulationRunRepository,
): Promise<SpatialSimulationRunSnapshot> {
  const { run } = await repository.createOrGet(input);
  const preparing = await repository.transition({
    run_id: run.id,
    owner_id: input.owner_id,
    expected_status: 'queued',
    next_status: 'preparing_geometry',
    progress: 10,
  });
  if (!preparing) throw new Error('Run was not found after queueing');
  const meshing = await repository.transition({
    run_id: run.id,
    owner_id: input.owner_id,
    expected_status: 'preparing_geometry',
    next_status: 'meshing',
    progress: 20,
  });
  if (!meshing) throw new Error('Run was not found after geometry setup');
  const solving = await repository.transition({
    run_id: run.id,
    owner_id: input.owner_id,
    expected_status: 'meshing',
    next_status: 'solving',
    progress: 30,
    mesh_sha256: meshSha256,
  });
  if (!solving) throw new Error('Run was not found after meshing');
  const postprocessing = await repository.transition({
    run_id: run.id,
    owner_id: input.owner_id,
    expected_status: 'solving',
    next_status: 'postprocessing',
    progress: 90,
  });
  if (!postprocessing) throw new Error('Run was not found after solving');
  const completed = await repository.transition({
    run_id: run.id,
    owner_id: input.owner_id,
    expected_status: 'postprocessing',
    next_status: 'completed',
    progress: 100,
    result: validSpatialSimulationResult({
      ...postprocessing,
      status: 'completed',
      progress: 100,
      mesh_sha256: meshSha256,
      result: null,
      failure: null,
      completed_at: new Date().toISOString(),
    }),
  });
  if (!completed) throw new Error('Run was not found after postprocessing');
  return completed;
}

describe('spatial simulation result contract', () => {
  it('accepts compact field references, physical domains, units and numerical diagnostics', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const completed = await completeRun(repository);

    expect(completed.status).toBe('completed');
    expect(completed.result?.fields[0]?.artifact.uri).toMatch(
      /^metrev-artifact:\/\/sha256\//,
    );
    expect(completed.result?.conservation_residuals[0]?.passed).toBe(true);
    expect(completed.result?.mesh.mesh_quality.cell_count).toBe(480);
  });

  it('rejects a field hash or physical-group map that is not represented by the result manifest', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const valid = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
      status: 'solving',
      progress: 30,
      started_at: new Date().toISOString(),
    });

    expect(() =>
      spatialSimulationResultSchema.parse({
        ...valid,
        artifact_hashes: [meshSha256],
      }),
    ).toThrow();
    expect(() =>
      spatialSimulationResultSchema.parse({
        ...valid,
        domains: valid.domains.map((domain) =>
          domain.physical_group_tag === 'region:anode'
            ? { ...domain, physical_group_id: 44 }
            : domain,
        ),
      }),
    ).toThrow();
  });

  it('rejects inline field arrays, false conservation passes and unbounded field domains', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const valid = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
      status: 'solving',
      progress: 30,
      started_at: new Date().toISOString(),
    });

    expect(() =>
      spatialSimulationResultSchema.parse({
        ...valid,
        fields: [{ ...valid.fields[0], values: [0.1, 0.2, 0.3] }],
      }),
    ).toThrow();
    expect(() =>
      spatialSimulationResultSchema.parse({
        ...valid,
        conservation_residuals: [
          {
            ...valid.conservation_residuals[0],
            relative_residual: 1,
            tolerance: 1e-5,
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      spatialSimulationResultSchema.parse({
        ...valid,
        fields: [{ ...valid.fields[0], domain_tags: ['unknown_mesh_region'] }],
      }),
    ).toThrow();
  });
});

describe('spatial simulation run lifecycle', () => {
  it('is owner scoped, idempotent, monotonic and persists a matching result only at completion', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const first = await repository.createOrGet(input);
    const replay = await repository.createOrGet(input);
    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(replay.run.id).toBe(first.run.id);
    await expect(
      repository.createOrGet({ ...input, input_sha256: 'e'.repeat(64) }),
    ).rejects.toMatchObject({
      code: 'idempotency_conflict',
    });
    await expect(
      repository.getOwnedRun(first.run.id, 'other-user'),
    ).resolves.toBeNull();

    const completed = await completeRun(repository);
    await expect(
      repository.getOwnedRun(completed.id, input.owner_id),
    ).resolves.toMatchObject({ status: 'completed', progress: 100 });
    await expect(
      repository.transition({
        run_id: completed.id,
        owner_id: input.owner_id,
        expected_status: 'postprocessing',
        next_status: 'completed',
        progress: 100,
        result: completed.result ?? undefined,
      }),
    ).rejects.toMatchObject({
      code: 'stale_state',
    });
  });

  it('rejects skipped phases, backwards progress and completion without mesh/result evidence', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet({
      ...input,
      idempotency_key: 'invalid-transition-key',
    });

    await expect(
      repository.transition({
        run_id: run.id,
        owner_id: input.owner_id,
        expected_status: 'queued',
        next_status: 'solving',
        progress: 10,
        mesh_sha256: meshSha256,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_transition',
    });
    const preparing = await repository.transition({
      run_id: run.id,
      owner_id: input.owner_id,
      expected_status: 'queued',
      next_status: 'preparing_geometry',
      progress: 50,
    });
    expect(preparing?.status).toBe('preparing_geometry');
    await expect(
      repository.transition({
        run_id: run.id,
        owner_id: input.owner_id,
        expected_status: 'preparing_geometry',
        next_status: 'preparing_geometry',
        progress: 20,
      }),
    ).rejects.toMatchObject({
      code: 'invalid_transition',
    });
  });

  it('records structured failure without presenting it as a completed result', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet({
      ...input,
      idempotency_key: 'failed-run-key',
    });
    const failed = await repository.transition({
      run_id: run.id,
      owner_id: input.owner_id,
      expected_status: 'queued',
      next_status: 'failed',
      progress: 0,
      failure: { code: 'mesh_failure', message: 'Mesh quality gate failed' },
    });
    expect(failed).toMatchObject({
      status: 'failed',
      result: null,
      failure: { code: 'mesh_failure' },
    });
  });

  it('preserves a non-converged numerical result on a failed run', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet({
      ...input,
      idempotency_key: 'nonconverged-run-key',
    });
    await repository.transition({
      run_id: run.id,
      owner_id: input.owner_id,
      expected_status: 'queued',
      next_status: 'preparing_geometry',
      progress: 10,
    });
    await repository.transition({
      run_id: run.id,
      owner_id: input.owner_id,
      expected_status: 'preparing_geometry',
      next_status: 'meshing',
      progress: 20,
    });
    const solving = await repository.transition({
      run_id: run.id,
      owner_id: input.owner_id,
      expected_status: 'meshing',
      next_status: 'solving',
      progress: 40,
      mesh_sha256: meshSha256,
    });
    if (!solving) throw new Error('Run was not found after meshing');
    const postprocessing = await repository.transition({
      run_id: run.id,
      owner_id: input.owner_id,
      expected_status: 'solving',
      next_status: 'postprocessing',
      progress: 80,
    });
    if (!postprocessing) throw new Error('Run was not found after solving');
    const valid = validSpatialSimulationResult(postprocessing);
    const result = spatialSimulationResultSchema.parse({
      ...valid,
      convergence: [
        {
          ...valid.convergence[0],
          status: 'not_converged',
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
          severity: 'error',
          message: 'The nonlinear solver reached its iteration limit',
        },
      ],
    });
    await expect(
      repository.transition({
        run_id: run.id,
        owner_id: input.owner_id,
        expected_status: 'postprocessing',
        next_status: 'completed',
        progress: 100,
        result,
      }),
    ).rejects.toMatchObject({ code: 'invalid_transition' });
    const failed = await repository.transition({
      run_id: run.id,
      owner_id: input.owner_id,
      expected_status: 'postprocessing',
      next_status: 'failed',
      progress: 80,
      result,
      failure: {
        code: 'non_convergence',
        message: 'Solver stopped before satisfying the declared tolerance',
      },
    });

    expect(failed).toMatchObject({
      status: 'failed',
      result: { convergence: [{ status: 'not_converged' }] },
      failure: { code: 'non_convergence' },
    });
  });
});
