import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  MemoryEvaluationRepository,
  MemorySpatialSimulationRunRepository,
} from '@metrev/database';
import {
  spatialRuntimeInputSha256,
  structuredCellGeometrySha256,
  buildStructuredCellDevelopmentReport,
  spatialSimulationResultForInputSchema,
  structuredCellRunViewSchema,
  structuredCellTransportFaces,
  structuredCellTopology,
  compileStructuredCellEquationGraph,
  structuredCellFieldReductionSchema,
} from '@metrev/domain-contracts';
import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';
import {
  parseStructuredCellProcessEnvelope,
  StructuredCellDevelopmentExecutor,
} from '../../packages/spatial-worker/src/structured-cell-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';
import { buildApp } from '../../apps/api-server/src/app';
import {
  readCellMesh,
  readCellField,
} from '../../apps/web-ui/src/lib/spatial-cell-field';
import { structuredCellFixture } from '../fixtures/structured-cell';

// This gate really invokes the native numerical process: numpy/scipy are required.
describe('structured cell native worker and authenticated artifacts', () => {
  it('validates refinement run IDs and scopes lookups to the authenticated owner', async () => {
    const repository = new MemorySpatialSimulationRunRepository();
    let role: 'ANALYST' | 'VIEWER' = 'ANALYST';
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      spatialSimulationRunRepository: repository,
      rateLimit: false,
      sessionResolver: async () => ({
        userId: 'refinement-owner',
        email: 'refinement@example.invalid',
        role,
        sessionId: 'refinement-session',
        sessionToken: 'refinement-token',
      }),
    });
    try {
      const url = '/api/spatial-simulations/medium/refinement-evidence';
      const duplicate = await app.inject({
        method: 'POST',
        url,
        payload: { run_ids: ['coarse', 'medium', 'medium'] },
      });
      expect(duplicate.statusCode).toBe(400);

      const missing = await app.inject({
        method: 'POST',
        url,
        payload: { run_ids: ['coarse', 'medium', 'fine'] },
      });
      expect(missing.statusCode).toBe(404);

      role = 'VIEWER';
      const viewer = await app.inject({
        method: 'POST',
        url,
        payload: { run_ids: ['coarse', 'medium', 'fine'] },
      });
      expect(viewer.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('keeps queued v2 runs on their matching executor and rejects them clearly on v3', async () => {
    const input = structuredCellFixture(2);
    const repository = new MemorySpatialSimulationRunRepository();
    const executor = new StructuredCellDevelopmentExecutor({
      pythonExecutable: 'python3',
      moduleDirectory: resolve('apps/spatial-sidecar'),
      artifactRoot: '/tmp/metrev-structured-cell-version-check',
      timeoutMs: 20000,
      artifactStore: new LocalSpatialFieldArtifactStore({
        rootDirectory: '/tmp/metrev-structured-cell-version-check-fields',
      }),
    });
    const { run } = await repository.createOrGet({
      owner_id: 'legacy-cell-owner',
      evaluation_id: null,
      idempotency_key: 'legacy-v2-cell-run',
      model_id: input.model_id,
      system: input.system,
      dimension: input.dimension,
      input_contract_version: input.contract_version,
      input_sha256: spatialRuntimeInputSha256(input),
      solver_version: executor.solverVersion,
      runtime_version: 'structured-cell-process-v2',
      mesh_request_sha256: structuredCellGeometrySha256(input),
      input_snapshot: input,
    });

    const cycle = await runSpatialSimulationWorkerCycle({
      repository,
      executor,
      workerId: 'cell-worker-v3',
    });
    expect(cycle).toMatchObject({ claimed: 0, completed: 0, failed: 0 });
    expect(
      (await repository.getOwnedRun(run.id, 'legacy-cell-owner'))?.status,
    ).toBe('queued');
    await expect(
      executor.execute({
        ownerId: 'legacy-cell-owner',
        input,
        run,
        signal: new AbortController().signal,
        reportProgress: async () => undefined,
      }),
    ).rejects.toMatchObject({
      code: 'spatial_runtime_version_mismatch',
      message: expect.stringContaining(
        'Queued run requires runtime structured-cell-process-v2; active executor provides structured-cell-process-v8',
      ),
    });
  });

  it('rejects a sidecar envelope with the wrong process or solver version explicitly', () => {
    const envelope = {
      version: 'structured-cell-fv-v1',
      protocol_version: 'structured-cell-process-v2',
    };
    const expected = {
      solverVersion: 'structured-cell-fv-v1',
      runtimeVersion: 'structured-cell-process-v8',
    };
    expect(() =>
      parseStructuredCellProcessEnvelope(envelope, expected),
    ).toThrow(
      'Cell sidecar protocol mismatch: expected structured-cell-process-v8, received structured-cell-process-v2',
    );
    expect(() =>
      parseStructuredCellProcessEnvelope(
        { version: expected.solverVersion },
        expected,
      ),
    ).toThrow(
      'Cell sidecar protocol mismatch: expected structured-cell-process-v8, received missing',
    );
    expect(() =>
      parseStructuredCellProcessEnvelope(
        {
          ...envelope,
          protocol_version: expected.runtimeVersion,
          version: 'structured-cell-fv-v2',
        },
        expected,
      ),
    ).toThrow(
      'Cell solver version mismatch: expected structured-cell-fv-v1, received structured-cell-fv-v2',
    );
  });

  it('accepts a complete active process-v8 sidecar envelope', () => {
    const digest = 'a'.repeat(64);
    const envelope = {
      version: 'structured-cell-fv-v1',
      protocol_version: 'structured-cell-process-v8',
      status: 'prepared',
      dimension: 2,
      request_id: '00000000-0000-4000-8000-000000000001',
      input_sha256: digest,
      geometry_sha256: digest,
      artifacts: [{ id: 'mesh', path: 'mesh.json', sha256: digest, bytes: 1 }],
    };
    expect(
      parseStructuredCellProcessEnvelope(envelope, {
        solverVersion: 'structured-cell-fv-v1',
        runtimeVersion: 'structured-cell-process-v8',
      }),
    ).toMatchObject({ protocol_version: 'structured-cell-process-v8' });
  });

  it.each([
    [2, false, false, false, false],
    [3, false, false, false, false],
    [2, true, false, false, false],
    [2, false, true, false, false],
    [2, false, false, true, false],
    [3, false, false, true, false],
    [2, false, false, false, true],
    [3, false, false, false, true],
  ] as const)(
    'persists %sD fields and diagnostics when nonconverged=%s, prescribed advection=%s, solved Darcy=%s, neutral partition=%s',
    async (dimension, nonconverged, advection, solveDarcy, partition) => {
      const root = await mkdtemp(join(tmpdir(), 'structured-cell-test-'));
      const store = new LocalSpatialFieldArtifactStore({
        rootDirectory: join(root, 'fields'),
      });
      const executor = new StructuredCellDevelopmentExecutor({
        pythonExecutable: 'python3',
        moduleDirectory: resolve('apps/spatial-sidecar'),
        artifactRoot: join(root, 'outputs'),
        timeoutMs: 20000,
        artifactStore: store,
      });
      const input = structuredCellFixture(dimension);
      if (partition) {
        input.interface_partition = {
          version: 'structured-cell-neutral-membrane-partition-v1',
          interfaces: [
            {
              left_domain: 'anode',
              right_domain: 'membrane',
              species: {
                reduced: {
                  value: 2,
                  unit: '1',
                  source_kind: 'test_fixture',
                  source_ref: 'synthetic:worker-neutral-partition',
                },
              },
            },
          ],
        };
      }
      if (advection) {
        input.geometry.layers[1].kind = 'separator';
        const faces = structuredCellTransportFaces(input);
        const velocity = (value: number) => ({
          value,
          unit: 'm/s',
          source_kind: 'test_fixture' as const,
          source_ref: 'synthetic:constant-incompressible-flow',
        });
        input.advection = {
          version: 'structured-cell-prescribed-flow-v1',
          face_normal_velocity: faces.interior.map((face) =>
            velocity(face.axis === 1 ? 1e-6 : 0),
          ),
          boundary_normal_velocity: faces.boundary.map((face) =>
            velocity(face.axis === 1 ? face.sign * 1e-6 : 0),
          ),
          inlet_concentrations: {
            y_min: Object.fromEntries(
              input.species.map((species) => [
                species.id,
                species.reservoir_concentration,
              ]),
            ),
          },
        };
      }
      if (solveDarcy) {
        input.geometry.layers[1].kind = 'separator';
        const sourced = (value: number, unit: string) => ({
          value,
          unit,
          source_kind: 'test_fixture' as const,
          source_ref: 'synthetic:boundary-driven-darcy-pressure-solve',
        });
        input.hydraulics = {
          version: 'structured-cell-darcy-pressure-solve-v1',
          dynamic_viscosity: sourced(1e-3, 'Pa*s'),
          permeability_by_region: Object.fromEntries(
            input.geometry.layers.map((layer) => [
              layer.tag,
              sourced(1e-12, 'm2'),
            ]),
          ),
          boundary_pressure: {
            y_min: sourced(10, 'Pa'),
            y_max: sourced(9, 'Pa'),
          },
          impermeable_faces: dimension === 3 ? ['z_min', 'z_max'] : [],
          inlet_concentrations: {
            y_min: Object.fromEntries(
              input.species.map((species) => [
                species.id,
                species.reservoir_concentration,
              ]),
            ),
          },
        };
      }
      input.temperature.source_locator = 'synthetic fixture temperature';
      input.temperature.conditions = { role: 'mathematical verification' };
      input.temperature.uncertainty = 0.1;
      input.temperature.uncertainty_unit = 'K';
      if (nonconverged) input.numerics.max_evaluations = 1;
      const repository = new MemorySpatialSimulationRunRepository();
      const { run } = await repository.createOrGet({
        owner_id: 'cell-owner',
        evaluation_id: null,
        idempotency_key: 'cell-test',
        model_id: input.model_id,
        system: input.system,
        dimension: input.dimension,
        input_contract_version: input.contract_version,
        input_sha256: spatialRuntimeInputSha256(input),
        solver_version: executor.solverVersion,
        runtime_version: executor.runtimeVersion,
        mesh_request_sha256: structuredCellGeometrySha256(input),
        input_snapshot: input,
      });
      try {
        const cycle = await runSpatialSimulationWorkerCycle({
          repository,
          executor,
          workerId: 'cell-worker',
        });
        const snapshot = await repository.getOwnedRun(run.id, 'cell-owner');
        expect(cycle, JSON.stringify(snapshot?.failure)).toMatchObject({
          claimed: 1,
          completed: nonconverged ? 0 : 1,
          failed: nonconverged ? 1 : 0,
        });
        expect(snapshot?.status).toBe(nonconverged ? 'failed' : 'completed');
        expect(snapshot?.result?.fields).toHaveLength(
          solveDarcy ? (dimension === 2 ? 9 : 10) : 6,
        );
        expect(snapshot?.result?.contract_version).toBe(
          'spatial-simulation-result-v3',
        );
        const view = structuredCellRunViewSchema.parse({
          ...snapshot,
          input_snapshot: input,
        });
        const report = buildStructuredCellDevelopmentReport(view);
        expect(report.decision_eligible).toBe(false);
        expect(report.modeled_field_observations).toMatchObject({
          contract_version: 'structured-cell-field-reduction-v1',
          decision_eligible: false,
          independent_validation: false,
          result_role: nonconverged
            ? 'failed_run_diagnostics'
            : 'modeled_development_result',
        });
        expect(
          report.modeled_field_observations?.fields.find(
            (field) => field.field_id === 'faradaic_current_density',
          )?.domains[0].statistics.physical_integral_unit,
        ).toBe('A');
        expect(
          report.modeled_field_observations?.electrode_overpotentials,
        ).toHaveLength(2);
        expect(report.field_extrema).toMatchObject({
          contract_version: 'structured-cell-field-extrema-v1',
          classification: null,
          thresholds_applied: false,
          decision_eligible: false,
          independent_validation: false,
          algorithm: 'argmin_argmax_lowest_global_cell_index_v1',
          input_sha256: view.input_sha256,
          mesh_sha256: view.result!.mesh.artifact.sha256,
          geometry_request_sha256: view.result!.mesh.request_sha256,
        });
        expect(
          report.field_extrema?.fields.map((field) => field.field_id).sort(),
        ).toEqual(view.result!.fields.map((field) => field.field_id).sort());
        expect(snapshot?.result?.scalar_outputs).toEqual([]);
        expect(report.result_role).toBe(
          nonconverged
            ? 'failed_run_diagnostics'
            : 'modeled_development_result',
        );
        expect(
          report.parameter_provenance.every(
            (p) => p.source_kind === 'test_fixture',
          ),
        ).toBe(true);
        expect(report.convergence[0].termination_reason).toBe(
          nonconverged
            ? 'maximum_evaluations'
            : 'nonlinear_and_conservation_passed',
        );
        expect(
          report.parameter_provenance.find(
            (p) => p.path === 'input.temperature',
          ),
        ).toMatchObject({
          source_locator: 'synthetic fixture temperature',
          conditions: { role: 'mathematical verification' },
          uncertainty: 0.1,
          uncertainty_unit: 'K',
        });
        expect(report.enabled_physics).not.toContain('mass_action_reactions');
        expect(report.enabled_physics).toContain('mfc_external_load');
        expect(
          report.enabled_physics.includes('ideal_neutral_membrane_partition'),
        ).toBe(partition);
        if (partition) {
          expect(report.parameter_provenance).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: 'input.interface_partition.interfaces.0.species.reduced',
                value: 2,
                unit: '1',
                source_ref: 'synthetic:worker-neutral-partition',
              }),
            ]),
          );
          expect(report.equation_graph?.interfaces[0].law).toBe(
            'cell-neutral-membrane-partition-v1',
          );
          expect(report.disabled_physics).toContain('donnan_equilibrium');
          expect(report.limitations).toContain(
            'Continuous potential and default continuous concentration interfaces; optional sourced ideal neutral membrane partition. No charged partition, Donnan equilibrium or fixed membrane charge.',
          );
        }
        expect(
          report.enabled_physics.includes(
            'prescribed_incompressible_upwind_species_advection',
          ),
        ).toBe(advection);
        if (solveDarcy && !nonconverged) {
          const result = snapshot?.result;
          if (
            !result ||
            result.contract_version !== 'spatial-simulation-result-v3' ||
            !result.structured_cell_field_reduction ||
            !result.structured_cell_field_observables
          )
            throw new Error(
              'Expected persisted structured-cell result evidence',
            );
          const solvedPressure = result.fields.find(
            (field) => field.field_id === 'darcy_pressure',
          );
          const solvedHydraulics = input.hydraulics;
          if (
            !solvedPressure ||
            !solvedHydraulics ||
            solvedHydraulics.version !==
              'structured-cell-darcy-pressure-solve-v1'
          )
            throw new Error('Expected a solved Darcy pressure field');
          const legacyInput = structuredCellFixture(dimension);
          legacyInput.geometry.layers[1].kind = 'separator';
          legacyInput.hydraulics = {
            version: 'structured-cell-prescribed-darcy-v1',
            dynamic_viscosity: solvedHydraulics.dynamic_viscosity,
            permeability_by_region: solvedHydraulics.permeability_by_region,
            cell_pressure: structuredCellTopology(legacyInput).centers_m.map(
              (center) => ({
                value: 10 - 1000 * center[1],
                unit: 'Pa',
                source_kind: 'test_fixture',
                source_ref: 'synthetic:legacy-v5-prescribed-pressure',
              }),
            ),
            boundary_pressure: solvedHydraulics.boundary_pressure,
            impermeable_faces: solvedHydraulics.impermeable_faces,
            inlet_concentrations: solvedHydraulics.inlet_concentrations,
          };
          const legacyInputHash = spatialRuntimeInputSha256(legacyInput);
          const legacyResult = {
            ...result,
            runtime_version: 'structured-cell-process-v5',
            input_sha256: legacyInputHash,
            equation_graph: compileStructuredCellEquationGraph(legacyInput),
            structured_cell_field_observables: {
              ...result.structured_cell_field_observables,
              input_sha256: legacyInputHash,
            },
            structured_cell_field_reduction: {
              ...result.structured_cell_field_reduction,
              input_sha256: legacyInputHash,
            },
          };
          expect(
            spatialSimulationResultForInputSchema(legacyInput).safeParse(
              legacyResult,
            ).success,
          ).toBe(true);
        }
        if (solveDarcy) {
          expect(
            snapshot?.result?.fields.map((field) => field.field_id),
          ).toEqual(
            expect.arrayContaining([
              'darcy_pressure',
              'darcy_velocity_x',
              'darcy_velocity_y',
              ...(dimension === 3 ? ['darcy_velocity_z'] : []),
            ]),
          );
          expect(
            snapshot?.result?.conservation_residuals.find(
              (entry) => entry.balance_id === 'darcy_local_volume',
            ),
          ).toMatchObject({ passed: true, kind: 'fluid_volume' });
        }
        expect(report.verification_status.mesh_refinement).toBe('unavailable');
        expect(
          report.verification_status.mesh_refinement_unavailable_reason,
        ).toBe('three_completed_runs_required');
        let actor = 'cell-owner';
        let tamperArtifacts = false;
        const app = await buildApp({
          repository: new MemoryEvaluationRepository(),
          spatialSimulationRunRepository: repository,
          spatialFieldArtifactReader: {
            readField: async (lookup) =>
              tamperArtifacts
                ? Readable.from([Buffer.from('tampered spatial payload')])
                : store.readField(lookup),
          },
          rateLimit: false,
          sessionResolver: async () => ({
            userId: actor,
            email: 'cell@example.invalid',
            role: 'ANALYST',
            sessionId: 'cell-session',
            sessionToken: 'cell-token',
          }),
        });
        try {
          const viewResponse = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}/view`,
          });
          expect(viewResponse.statusCode).toBe(200);
          expect(viewResponse.json().run).toEqual(
            JSON.parse(JSON.stringify(view)),
          );
          expect(() =>
            buildStructuredCellDevelopmentReport({
              ...view,
              input_snapshot: undefined,
            }),
          ).toThrow();
          const wrongUnit = structuredCellFixture(dimension);
          wrongUnit.temperature.unit = 'C';
          expect(() =>
            structuredCellRunViewSchema.parse({
              ...view,
              input_snapshot: wrongUnit,
            }),
          ).toThrow();
          const reportResponse = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}/report`,
          });
          expect(reportResponse.statusCode).toBe(200);
          expect(reportResponse.json()).toEqual(
            JSON.parse(JSON.stringify(report)),
          );
          const markdown = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}/report?format=markdown`,
          });
          expect(markdown.statusCode).toBe(200);
          expect(markdown.body).toContain('Independent validation: false');
          if (partition)
            expect(markdown.body).toContain('ideal_neutral_membrane_partition');
          expect(markdown.body).toContain(
            '## Deterministic modeled field extrema',
          );
          expect(markdown.body).toContain('not hotspot classifications');
          expect(markdown.body).toContain(
            '## Physical volume weighted modeled observations',
          );
          const threshold = {
            threshold_id: 'user_candidate_concentration_bound',
            field_id: 'concentration_reduced',
            domain_tag: 'anode',
            comparison: 'lt',
            threshold: {
              value: 1,
              unit: 'mol/m3',
              source_kind: 'assumption',
              source_ref: 'user:explicit-development-comparison',
            },
          };
          const reduced = await app.inject({
            method: 'POST',
            url: `/api/spatial-simulations/${run.id}/field-reductions`,
            payload: { thresholds: [threshold] },
          });
          expect(reduced.statusCode, reduced.body).toBe(200);
          const reduction = structuredCellFieldReductionSchema.parse(
            reduced.json().reduction,
          );
          expect(reduction.threshold_regions[0].threshold.source_ref).toBe(
            threshold.threshold.source_ref,
          );
          expect(reduction.threshold_regions[0].domain_tag).toBe('anode');
          expect(
            reduction.threshold_regions[0].volume_fraction,
          ).toBeGreaterThanOrEqual(0);
          expect(
            reduction.threshold_regions[0].volume_fraction,
          ).toBeLessThanOrEqual(1);
          expect(reduced.json().report.modeled_field_observations).toEqual(
            JSON.parse(JSON.stringify(reduction)),
          );
          expect(reduction.result_role).toBe(report.result_role);
          const wrongThreshold = await app.inject({
            method: 'POST',
            url: `/api/spatial-simulations/${run.id}/field-reductions`,
            payload: {
              thresholds: [
                {
                  ...threshold,
                  threshold: { ...threshold.threshold, unit: 'g/L' },
                },
              ],
            },
          });
          expect(wrongThreshold.statusCode).toBe(422);
          const missingSource = await app.inject({
            method: 'POST',
            url: `/api/spatial-simulations/${run.id}/field-reductions`,
            payload: {
              thresholds: [
                { ...threshold, threshold: { value: 1, unit: 'mol/m3' } },
              ],
            },
          });
          expect(missingSource.statusCode).toBe(400);
          tamperArtifacts = true;
          const tampered = await app.inject({
            method: 'POST',
            url: `/api/spatial-simulations/${run.id}/field-reductions`,
            payload: { thresholds: [threshold] },
          });
          expect(tampered.statusCode).toBe(502);
          expect(tampered.json().error).toBe('artifact_integrity_failure');
          tamperArtifacts = false;
          const meshResponse = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}/mesh`,
          });
          const mesh = readCellMesh(meshResponse.json(), view);
          for (const entry of report.field_extrema?.fields ?? [])
            for (const point of [entry.minimum, entry.maximum]) {
              expect(point.cell_center_m).toEqual(
                mesh.centers_m[point.cell_index],
              );
              expect(point.cell_size_m).toEqual(mesh.sizes_m[point.cell_index]);
              expect(point.region_index).toBe(
                mesh.region_index[point.cell_index],
              );
            }
          const fieldResponse = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}/fields/liquid_potential`,
          });
          const manifest = view.result!.fields.find(
            (f) => f.field_id === 'liquid_potential',
          )!;
          const data = readCellField(
            fieldResponse.json(),
            mesh,
            manifest,
            view,
          );
          expect(data.values).toHaveLength(mesh.centers_m.length);
          const observationRequest = {
            contract_version: 'spatial-observation-comparison-v1',
            field_id: 'liquid_potential',
            model_input_sha256: view.input_sha256,
            purpose: 'development',
            mapping: {
              method: 'exact_cell_center',
              coordinate_tolerance_m: 0,
              boundary_tie_policy: 'reject_ambiguous',
            },
            dataset: {
              dataset_id: 'synthetic-worker-observations',
              role: 'development',
              review_status: 'pending',
              used_for_model_development: true,
              condition_match: 'matched',
              condition_match_note: 'Synthetic native-worker test only',
              support_kind: 'point_set',
              samples: [
                {
                  observation_id: 'probe-0',
                  value: data.values[0] - 0.001,
                  unit: 'V',
                  source_kind: 'measured',
                  source_ref: 'synthetic:worker-test',
                  source_locator: 'test observation row 0',
                  position: {
                    values: mesh.centers_m[0],
                    unit: 'm',
                    source_ref: 'synthetic:mesh',
                  },
                  domain_tag: 'anode',
                  timestamp_s: null,
                  replicate_id: null,
                  uncertainty: null,
                },
              ],
            },
          };
          const compare = () =>
            app.inject({
              method: 'POST',
              url: `/api/spatial-simulations/${run.id}/observation-comparisons`,
              payload: observationRequest,
            });
          const comparison = await compare();
          expect(comparison.statusCode, comparison.body).toBe(200);
          expect(comparison.json().metrics.rmse).toBeCloseTo(0.001, 12);
          expect(comparison.json().binding.field_artifact_sha256).toBe(
            manifest.artifact.sha256,
          );
          expect(comparison.json().decision_eligible).toBe(false);
          tamperArtifacts = true;
          expect((await compare()).statusCode).toBe(502);
          tamperArtifacts = false;
          actor = 'other-owner';
          expect((await compare()).statusCode).toBe(404);
          actor = 'cell-owner';
          expect(() =>
            readCellMesh({ ...mesh, centers_m: [] }, view),
          ).toThrow();
          expect(() =>
            readCellField(
              { ...data, cells: data.cells.map(() => 0) },
              mesh,
              manifest,
              view,
            ),
          ).toThrow();
          expect(() =>
            readCellField({ ...data, unit: 'Pa' }, mesh, manifest, view),
          ).toThrow();
          expect(() =>
            structuredCellRunViewSchema.parse({
              ...snapshot,
              result: { ...snapshot!.result, input_sha256: 'f'.repeat(64) },
            }),
          ).toThrow();
          if (view.result!.structured_cell_field_observables) {
            const observables = view.result!.structured_cell_field_observables;
            expect(() =>
              structuredCellRunViewSchema.parse({
                ...view,
                result: {
                  ...view.result,
                  structured_cell_field_observables: {
                    ...observables,
                    decision_eligible: true,
                  },
                },
              }),
            ).toThrow();
            expect(() =>
              structuredCellRunViewSchema.parse({
                ...view,
                result: {
                  ...view.result,
                  structured_cell_field_observables: {
                    ...observables,
                    fields: observables.fields.map((field, index) =>
                      index === 0
                        ? {
                            ...field,
                            minimum: {
                              ...field.minimum,
                              cell_center_m: field.minimum.cell_center_m.map(
                                (coordinate) => coordinate + 0.01,
                              ),
                            },
                          }
                        : field,
                    ),
                  },
                },
              }),
            ).toThrow();
            expect(() =>
              structuredCellRunViewSchema.parse({
                ...view,
                result: {
                  ...view.result,
                  structured_cell_field_observables: {
                    ...observables,
                    fields: observables.fields.map((field, index) =>
                      index === 0
                        ? {
                            ...field,
                            field_artifact_sha256: 'f'.repeat(64),
                          }
                        : field,
                    ),
                  },
                },
              }),
            ).toThrow();
          }
          actor = 'different-owner';
          const privateReduction = await app.inject({
            method: 'POST',
            url: `/api/spatial-simulations/${run.id}/field-reductions`,
            payload: { thresholds: [threshold] },
          });
          expect(privateReduction.statusCode).toBe(404);
          const forbidden = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}/report`,
          });
          expect(forbidden.statusCode).toBe(404);
          actor = 'cell-owner';
          for (const suffix of ['mesh', 'fields/liquid_potential']) {
            const response = await app.inject({
              method: 'GET',
              url: `/api/spatial-simulations/${run.id}/${suffix}`,
            });
            expect(response.statusCode).toBe(200);
            expect(() => JSON.parse(response.body)).not.toThrow();
          }
        } finally {
          await app.close();
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    30000,
  );
});
