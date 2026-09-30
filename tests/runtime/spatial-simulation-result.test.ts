import { describe, expect, it } from 'vitest';

import { MemorySpatialSimulationRunRepository } from '@metrev/database';
import {
  createSpatialSimulationRunInputSchema,
  spatialModelInputV2Schema,
  spatialModelInputV2Sha256,
  spatialSimulationResultSchema,
  spatialSimulationResultForInputSchema,
  spatialSimulationRunSnapshotSchema,
  type SpatialSimulationRunSnapshot,
} from '@metrev/domain-contracts';

import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';
import { validSpatialInput } from '../fixtures/spatial-input-v2';

const meshSha256 = 'a'.repeat(64);
const input = createSpatialSimulationRunInput({
  ownerId: 'user-123',
  idempotencyKey: 'spatial-run-test-key',
});
const workerVersions = {
  solver_version: input.solver_version,
  runtime_version: input.runtime_version,
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
  it('binds and persists a requested vector field with component metrics', async () => {
    const snapshot = spatialModelInputV2Schema.parse({
      ...validSpatialInput(),
      variables: [
        ...validSpatialInput().variables,
        { id: 'ux', kind: 'velocity_x', domain_tags: ['liquid'], unit: 'm/s' },
        { id: 'uy', kind: 'velocity_y', domain_tags: ['liquid'], unit: 'm/s' },
      ],
      vector_outputs: [
        {
          id: 'liquid_velocity',
          components: [
            { axis: 'x', variable_id: 'ux' },
            { axis: 'y', variable_id: 'uy' },
          ],
        },
      ],
      requested_outputs: ['liquid_velocity'],
    });
    const inputSha = spatialModelInputV2Sha256(snapshot);
    const runInput = createSpatialSimulationRunInput({
      ownerId: 'vector-owner',
      idempotencyKey: 'vector-output',
    });
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet({
      ...runInput,
      input_snapshot: snapshot,
      input_sha256: inputSha,
    });
    const base = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
    });
    const { summary: _scalarSummary, ...fieldCommon } = base
      .fields[0] as Extract<
      (typeof base.fields)[number],
      { value_type: 'scalar' }
    >;
    const vector = {
      ...fieldCommon,
      field_id: 'velocity_final',
      variable_id: 'liquid_velocity',
      value_type: 'vector' as const,
      unit: 'm/s',
      domain_tags: ['liquid'],
      components: [
        {
          axis: 'x' as const,
          summary: {
            sample_count: 120,
            minimum: 0,
            maximum: 0.02,
            mean: 0.01,
            integral: 0.000001,
            integral_unit: 'm3/s',
            integration_measure: 'domain_area' as const,
          },
        },
        {
          axis: 'y' as const,
          summary: {
            sample_count: 120,
            minimum: 0,
            maximum: 0.04,
            mean: 0.02,
            integral: 0.000002,
            integral_unit: 'm3/s',
            integration_measure: 'domain_area' as const,
          },
        },
      ],
    };
    const result = {
      ...base,
      fields: [vector],
      scalar_outputs: [
        {
          metric_id: 'mean_y_velocity',
          value: 0.02,
          unit: 'm/s',
          source_kind: 'modeled' as const,
          source_ref: base.model_id,
          derivation: {
            kind: 'field_component_summary' as const,
            field_id: 'velocity_final',
            axis: 'y' as const,
            statistic: 'mean' as const,
          },
        },
      ],
      artifact_hashes: [
        base.mesh.artifact.sha256,
        vector.artifact.sha256,
      ].sort(),
    };
    const schema = spatialSimulationResultForInputSchema(snapshot);
    expect(schema.safeParse(result).success).toBe(true);
    expect(schema.safeParse({ ...result, fields: [] }).success).toBe(false);
    expect(
      schema.safeParse({
        ...result,
        fields: [{ ...vector, domain_tags: ['anode'] }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...result, fields: [{ ...vector, unit: 'Pa' }] })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...result,
        scalar_outputs: [{ ...result.scalar_outputs[0], value: 0.03 }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...result,
        scalar_outputs: [
          {
            ...result.scalar_outputs[0],
            derivation: { ...result.scalar_outputs[0].derivation, axis: 'z' },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...result,
        fields: [{ ...vector, variable_id: 'ux' }],
      }).success,
    ).toBe(false);
    for (const [expected_status, next_status, progress] of [
      ['queued', 'preparing_geometry', 10],
      ['preparing_geometry', 'meshing', 20],
      ['meshing', 'solving', 30],
      ['solving', 'postprocessing', 90],
    ] as const) {
      await repository.transition({
        run_id: run.id,
        owner_id: runInput.owner_id,
        expected_status,
        next_status,
        progress,
        ...(next_status === 'solving' ? { mesh_sha256: meshSha256 } : {}),
      });
    }
    const completed = await repository.transition({
      run_id: run.id,
      owner_id: runInput.owner_id,
      expected_status: 'postprocessing',
      next_status: 'completed',
      progress: 100,
      result,
    });
    expect(completed?.result?.fields[0]).toMatchObject({
      variable_id: 'liquid_velocity',
      value_type: 'vector',
    });
  });
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

  it('retains direct linear-solver termination separately from nonlinear history', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const completed = await completeRun(repository);
    const linearSolverDiagnostics = [
      {
        solver_id: 'darcy_pressure',
        method: 'petsc_preonly_lu',
        status: 'converged' as const,
        iterations: 3,
        termination_reason: 'petsc_ksp_converged',
        termination_code: 4,
      },
      {
        solver_id: 'neutral_scalar_transport',
        method: 'petsc_preonly_lu',
        status: 'converged' as const,
        iterations: 2,
        termination_reason: 'petsc_ksp_converged',
        termination_code: 4,
      },
    ];
    const withLinearDiagnostics = {
      ...completed.result!,
      linear_solver_diagnostics: linearSolverDiagnostics,
    };

    expect(
      spatialSimulationResultSchema.safeParse(withLinearDiagnostics).success,
    ).toBe(true);
    expect(
      spatialSimulationResultSchema.safeParse({
        ...withLinearDiagnostics,
        linear_solver_diagnostics: [
          ...linearSolverDiagnostics,
          linearSolverDiagnostics[0],
        ],
      }).success,
    ).toBe(false);
    expect(
      spatialSimulationRunSnapshotSchema.safeParse({
        ...completed,
        result: {
          ...withLinearDiagnostics,
          linear_solver_diagnostics: [
            {
              ...linearSolverDiagnostics[0],
              status: 'not_converged',
              termination_reason: 'petsc_ksp_diverged',
              termination_code: -3,
            },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it('binds integral units and scalar metrics to dimensionally compatible field summaries', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const result = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
    });
    const firstField = result.fields[0];
    if (firstField?.value_type !== 'scalar')
      throw new Error('Expected scalar fixture field');

    expect(spatialSimulationResultSchema.safeParse(result).success).toBe(true);
    expect(
      spatialSimulationResultSchema.safeParse({
        ...result,
        fields: result.fields.map((field, index) =>
          index === 0 && field.value_type === 'scalar'
            ? {
                ...field,
                summary: { ...field.summary, integral_unit: 'mol/m3' },
              }
            : field,
        ),
      }).success,
    ).toBe(false);
    expect(
      spatialSimulationResultSchema.safeParse({
        ...result,
        fields: result.fields.map((field, index) =>
          index === 0 && field.value_type === 'scalar'
            ? {
                ...field,
                summary: {
                  ...field.summary,
                  integration_measure: 'domain_volume',
                },
              }
            : field,
        ),
      }).success,
    ).toBe(false);
    const axisymmetricResult = {
      ...result,
      coordinate_system: 'axisymmetric' as const,
      fields: result.fields.map((field, index) =>
        field.value_type === 'scalar'
          ? {
              ...field,
              summary: {
                ...field.summary,
                integration_measure:
                  index === 0
                    ? ('domain_volume' as const)
                    : ('boundary_area' as const),
                integral_unit: index === 0 ? 'mol' : 'V*m2',
              },
            }
          : field,
      ),
    };
    expect(
      spatialSimulationResultSchema.safeParse(axisymmetricResult).success,
    ).toBe(true);
    expect(
      spatialSimulationResultSchema.safeParse({
        ...axisymmetricResult,
        fields: axisymmetricResult.fields.map((field, index) =>
          index === 0 && field.value_type === 'scalar'
            ? {
                ...field,
                summary: { ...field.summary, integral_unit: 'mol/m' },
              }
            : field,
        ),
      }).success,
    ).toBe(false);

    for (const patch of [
      { unit: 'V' },
      { value: 0.7 },
      {
        derivation: {
          kind: 'field_summary' as const,
          field_id: 'missing',
          statistic: 'maximum' as const,
        },
      },
      {
        derivation: {
          kind: 'field_summary' as const,
          field_id: firstField.field_id,
          statistic: 'integral' as const,
        },
      },
      { derivation: undefined },
    ]) {
      expect(
        spatialSimulationResultSchema.safeParse({
          ...result,
          scalar_outputs: result.scalar_outputs.map((output, index) =>
            index === 0 ? { ...output, ...patch } : output,
          ),
        }).success,
      ).toBe(false);
    }
  });

  it('keeps v1 snapshots readable while requiring v2 for new input-bound results', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const result = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
    });
    const legacy = {
      ...result,
      contract_version: 'spatial-simulation-result-v1' as const,
      scalar_outputs: result.scalar_outputs.map(
        ({ derivation: _derivation, ...output }) => output,
      ),
      fields: result.fields.map((field, index) =>
        index === 0 && field.value_type === 'scalar'
          ? { ...field, summary: { ...field.summary, integral_unit: 'mol/m3' } }
          : field,
      ),
    };

    expect(spatialSimulationResultSchema.safeParse(legacy).success).toBe(true);
    expect(
      spatialSimulationResultForInputSchema(input.input_snapshot).safeParse(
        legacy,
      ).success,
    ).toBe(false);
  });

  it('binds field IDs, canonical units and eligible domains to the authoritative input', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const valid = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
    });
    const schema = spatialSimulationResultForInputSchema(input.input_snapshot);
    expect(schema.safeParse(valid).success).toBe(true);
    for (const patch of [
      { variable_id: 'undeclared' },
      { unit: 'V' },
      { unit: 'mmol/m3' },
      { domain_tags: ['anode'] },
    ]) {
      expect(
        schema.safeParse({
          ...valid,
          fields: valid.fields.map((field, index) =>
            index === 0 ? { ...field, ...patch } : field,
          ),
        }).success,
      ).toBe(false);
    }
    expect(
      schema.safeParse({ ...valid, input_sha256: 'e'.repeat(64) }).success,
    ).toBe(false);
    const { summary, ...common } = valid.fields[0] as Extract<
      (typeof valid.fields)[number],
      { value_type: 'scalar' }
    >;
    expect(
      schema.safeParse({
        ...valid,
        fields: [
          {
            ...common,
            value_type: 'vector',
            components: [
              { axis: 'x', summary },
              { axis: 'y', summary },
            ],
          },
          ...valid.fields.slice(1),
        ],
      }).success,
    ).toBe(false);
  });

  it('binds result domains, boundaries and interfaces to the immutable mesh topology', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const valid = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
    });
    const bound = spatialSimulationResultForInputSchema(input.input_snapshot);
    const swappedGroups = {
      ...valid,
      mesh: {
        ...valid.mesh,
        physical_groups: {
          ...valid.mesh.physical_groups,
          'region:anode': 2,
          'region:biofilm': 1,
        },
      },
      domains: valid.domains.map((domain) =>
        domain.physical_group_tag === 'region:anode'
          ? { ...domain, physical_group_id: 2 }
          : domain.physical_group_tag === 'region:biofilm'
            ? { ...domain, physical_group_id: 1 }
            : domain,
      ),
    };

    expect(spatialSimulationResultSchema.safeParse(swappedGroups).success).toBe(
      true,
    );
    expect(bound.safeParse(swappedGroups).success).toBe(false);

    const swappedComponents = {
      ...valid,
      domains: valid.domains.map((domain) =>
        domain.role === 'domain' && domain.tag === 'anode'
          ? { ...domain, component_id: 'case/biofilm' }
          : domain,
      ),
    };
    const reversedInterface = {
      ...valid,
      domains: valid.domains.map((domain) =>
        domain.role === 'interface' && domain.tag === 'interface:anode:biofilm'
          ? {
              ...domain,
              from_domain_tag: 'biofilm',
              to_domain_tag: 'anode',
              normal: [-1, 0],
              tag: 'interface:biofilm:anode',
            }
          : domain,
      ),
    };
    const wrongBoundaryRole = {
      ...valid,
      domains: valid.domains.map((domain) =>
        domain.role === 'boundary' && domain.tag === 'inlet'
          ? { ...domain, boundary_kind: 'outlet' as const }
          : domain,
      ),
    };

    for (const candidate of [
      swappedComponents,
      reversedInterface,
      wrongBoundaryRole,
    ]) {
      expect(spatialSimulationResultSchema.safeParse(candidate).success).toBe(
        true,
      );
      expect(bound.safeParse(candidate).success).toBe(false);
    }
  });

  it('requires every requested output and rejects unrequested state fields', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const valid = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
    });
    const schema = spatialSimulationResultForInputSchema(input.input_snapshot);
    const withFields = (fields: typeof valid.fields) => ({
      ...valid,
      fields,
      artifact_hashes: [
        valid.mesh.artifact.sha256,
        ...fields.map((field) => field.artifact.sha256),
      ].sort(),
    });

    expect(
      schema.safeParse(
        withFields(
          valid.fields.filter((field) => field.variable_id !== 'phi_s'),
        ),
      ).success,
    ).toBe(false);
    expect(
      schema.safeParse(
        withFields(
          valid.fields.map((field) =>
            field.variable_id === 'phi_s'
              ? { ...field, variable_id: 'temperature', unit: 'K' }
              : field,
          ),
        ),
      ).success,
    ).toBe(false);
  });

  it('uses the admitted digest after persisted JSON changes object key order', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const valid = validSpatialSimulationResult({
      ...run,
      mesh_sha256: meshSha256,
    });
    const reloadedInput = JSON.parse(
      JSON.stringify(input.input_snapshot, (_key, value: unknown) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).reverse())
          : value,
      ),
    ) as typeof input.input_snapshot;

    expect(spatialModelInputV2Sha256(reloadedInput)).not.toBe(run.input_sha256);
    const bound = spatialSimulationResultForInputSchema(
      reloadedInput,
      run.input_sha256,
    );
    expect(bound.safeParse(valid).success).toBe(true);
    expect(
      bound.safeParse({ ...valid, input_sha256: 'e'.repeat(64) }).success,
    ).toBe(false);
    expect(
      bound.safeParse({
        ...valid,
        fields: valid.fields.map((field, index) =>
          index === 0 ? { ...field, unit: 'V' } : field,
        ),
      }).success,
    ).toBe(false);
  });

  it.each([false, true])(
    'rejects incompatible persisted fields for leased=%s without changing state',
    async (leased) => {
      const repository = new MemorySpatialSimulationRunRepository();
      const { run } = await repository.createOrGet(input);
      const claim = leased
        ? await repository.claimNextQueued({
            worker_id: 'unit-worker',
            ...workerVersions,
            lease_duration_ms: 30_000,
          })
        : null;
      const transition = (
        candidate: Parameters<typeof repository.transition>[0],
      ) =>
        claim
          ? repository.transitionClaimed({
              ...candidate,
              worker_id: 'unit-worker',
              lease_token: claim.leaseToken,
            })
          : repository.transition(candidate);
      if (!leased)
        await transition({
          run_id: run.id,
          owner_id: input.owner_id,
          expected_status: 'queued',
          next_status: 'preparing_geometry',
          progress: 10,
        });
      await transition({
        run_id: run.id,
        owner_id: input.owner_id,
        expected_status: 'preparing_geometry',
        next_status: 'meshing',
        progress: 20,
      });
      await transition({
        run_id: run.id,
        owner_id: input.owner_id,
        expected_status: 'meshing',
        next_status: 'solving',
        progress: 30,
        mesh_sha256: meshSha256,
      });
      const current = await transition({
        run_id: run.id,
        owner_id: input.owner_id,
        expected_status: 'solving',
        next_status: 'postprocessing',
        progress: 90,
      });
      const valid = validSpatialSimulationResult(current!);
      const inputBoundUnitMismatch = {
        ...valid,
        fields: valid.fields.map((field, index) =>
          index === 0 && field.value_type === 'scalar'
            ? {
                ...field,
                unit: 'kg/m3',
                summary: { ...field.summary, integral_unit: 'kg/m' },
              }
            : field,
        ),
        scalar_outputs: valid.scalar_outputs.map((output, index) =>
          index === 0 ? { ...output, unit: 'kg/m3' } : output,
        ),
      };
      for (const next_status of ['completed', 'failed'] as const) {
        await expect(
          transition({
            run_id: run.id,
            owner_id: input.owner_id,
            expected_status: 'postprocessing',
            next_status,
            progress: next_status === 'completed' ? 100 : 90,
            result: inputBoundUnitMismatch,
            ...(next_status === 'failed'
              ? { failure: { code: 'test_failure', message: 'Fixture' } }
              : {}),
          }),
        ).rejects.toMatchObject({ code: 'invalid_transition' });
        expect(
          (await repository.getOwnedRun(run.id, input.owner_id))?.status,
        ).toBe('postprocessing');
      }
      await expect(
        transition({
          run_id: run.id,
          owner_id: input.owner_id,
          expected_status: 'postprocessing',
          next_status: 'completed',
          progress: 100,
          result: valid,
        }),
      ).resolves.toMatchObject({ status: 'completed' });
    },
  );

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
  it('binds idempotency metadata to a validated, hash-bound input snapshot', () => {
    expect(() =>
      createSpatialSimulationRunInputSchema.parse({
        ...input,
        input_sha256: 'e'.repeat(64),
      }),
    ).toThrow(/immutable spatial input snapshot/i);
    expect(() =>
      createSpatialSimulationRunInputSchema.parse({
        ...input,
        model_id: 'another-model',
      }),
    ).toThrow(/immutable spatial input snapshot/i);
  });

  it('is owner scoped, idempotent, monotonic and persists a matching result only at completion', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const first = await repository.createOrGet(input);
    const replay = await repository.createOrGet(input);
    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(replay.run.id).toBe(first.run.id);
    await expect(
      repository.createOrGet({ ...input, runtime_version: 'sidecar-dev-2' }),
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

  it('claims each durable input once and requires the live lease to transition it', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run } = await repository.createOrGet(input);
    const claims = await Promise.all([
      repository.claimNextQueued({
        worker_id: 'worker-a',
        ...workerVersions,
        lease_duration_ms: 30_000,
      }),
      repository.claimNextQueued({
        worker_id: 'worker-b',
        ...workerVersions,
        lease_duration_ms: 30_000,
      }),
    ]);
    const claimed = claims.filter((entry) => entry !== null);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      run: { id: run.id, status: 'preparing_geometry', attempt_count: 1 },
      input: input.input_snapshot,
    });
    await expect(
      repository.claimNextQueued({
        worker_id: 'worker-c',
        ...workerVersions,
        lease_duration_ms: 30_000,
      }),
    ).resolves.toBeNull();
  });

  it('records cooperative cancellation for queued and leased runs', async () => {
    const queuedRepository = new MemorySpatialSimulationRunRepository();
    const queued = await queuedRepository.createOrGet({
      ...input,
      idempotency_key: 'queued-cancellation-key',
    });
    await expect(
      queuedRepository.requestCancellation(queued.run.id, input.owner_id),
    ).resolves.toMatchObject({
      status: 'cancelled',
      started_at: null,
      cancellation_requested: true,
    });

    const activeRepository = new MemorySpatialSimulationRunRepository();
    const active = await activeRepository.createOrGet({
      ...input,
      idempotency_key: 'active-cancellation-key',
    });
    const claim = await activeRepository.claimNextQueued({
      worker_id: 'worker-cancel',
      ...workerVersions,
      lease_duration_ms: 30_000,
    });
    expect(claim?.run.id).toBe(active.run.id);
    await expect(
      activeRepository.requestCancellation(active.run.id, input.owner_id),
    ).resolves.toMatchObject({
      status: 'preparing_geometry',
      cancellation_requested: true,
    });
    await expect(
      activeRepository.renewClaim({
        run_id: active.run.id,
        owner_id: input.owner_id,
        worker_id: 'worker-cancel',
        lease_token: claim!.leaseToken,
        lease_duration_ms: 30_000,
      }),
    ).resolves.toMatchObject({ cancelRequested: true });
    await expect(
      activeRepository.transitionClaimed({
        run_id: active.run.id,
        owner_id: input.owner_id,
        worker_id: 'worker-cancel',
        lease_token: claim!.leaseToken,
        expected_status: 'preparing_geometry',
        next_status: 'cancelled',
        progress: 5,
      }),
    ).resolves.toMatchObject({
      status: 'cancelled',
      cancellation_requested: true,
    });
  });

  it('requeues a run after an expired lease and rejects the stale worker token', async () => {
    let clock = new Date('2026-09-28T12:00:00.000Z');
    const repository = new MemorySpatialSimulationRunRepository(() => clock);
    const { run } = await repository.createOrGet({
      ...input,
      idempotency_key: 'expired-lease-key',
    });
    const firstClaim = await repository.claimNextQueued({
      worker_id: 'worker-stale',
      ...workerVersions,
      lease_duration_ms: 1_000,
    });
    expect(firstClaim?.run.id).toBe(run.id);
    clock = new Date(clock.getTime() + 1_001);
    const secondClaim = await repository.claimNextQueued({
      worker_id: 'worker-recovery',
      ...workerVersions,
      lease_duration_ms: 30_000,
    });
    expect(secondClaim?.run).toMatchObject({
      id: run.id,
      status: 'preparing_geometry',
      attempt_count: 2,
    });
    await expect(
      repository.renewClaim({
        run_id: run.id,
        owner_id: input.owner_id,
        worker_id: 'worker-stale',
        lease_token: firstClaim!.leaseToken,
        lease_duration_ms: 30_000,
      }),
    ).resolves.toBeNull();
    await expect(
      repository.transitionClaimed({
        run_id: run.id,
        owner_id: input.owner_id,
        worker_id: 'worker-stale',
        lease_token: firstClaim!.leaseToken,
        expected_status: 'preparing_geometry',
        next_status: 'meshing',
        progress: 20,
      }),
    ).rejects.toMatchObject({ code: 'lease_lost' });
  });

  it('creates bounded, idempotent retries as new runs linked to the failed parent', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    const { run: original } = await repository.createOrGet({
      ...input,
      idempotency_key: 'retry-parent-key',
    });
    await repository.transition({
      run_id: original.id,
      owner_id: input.owner_id,
      expected_status: 'queued',
      next_status: 'failed',
      progress: 0,
      failure: { code: 'mesh_failure', message: 'Mesh preparation failed' },
    });
    const retryOne = await repository.retryFailedRun({
      run_id: original.id,
      owner_id: input.owner_id,
      idempotency_key: 'retry-parent-key-1',
    });
    const replay = await repository.retryFailedRun({
      run_id: original.id,
      owner_id: input.owner_id,
      idempotency_key: 'retry-parent-key-1',
    });
    expect(retryOne).toMatchObject({
      created: true,
      run: {
        status: 'queued',
        retry_count: 1,
        retry_of_run_id: original.id,
      },
    });
    expect(replay).toMatchObject({
      created: false,
      run: { id: retryOne.run.id },
    });

    await repository.transition({
      run_id: retryOne.run.id,
      owner_id: input.owner_id,
      expected_status: 'queued',
      next_status: 'failed',
      progress: 0,
      failure: { code: 'mesh_failure', message: 'Mesh preparation failed' },
    });
    const retryTwo = await repository.retryFailedRun({
      run_id: retryOne.run.id,
      owner_id: input.owner_id,
      idempotency_key: 'retry-parent-key-2',
    });
    await repository.transition({
      run_id: retryTwo.run.id,
      owner_id: input.owner_id,
      expected_status: 'queued',
      next_status: 'failed',
      progress: 0,
      failure: { code: 'mesh_failure', message: 'Mesh preparation failed' },
    });
    await expect(
      repository.retryFailedRun({
        run_id: retryTwo.run.id,
        owner_id: input.owner_id,
        idempotency_key: 'retry-parent-key-3',
      }),
    ).rejects.toMatchObject({ code: 'retry_limit_exceeded' });
  });
});
