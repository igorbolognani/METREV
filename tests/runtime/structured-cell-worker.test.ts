import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MemoryEvaluationRepository,
  MemorySpatialSimulationRunRepository,
} from '@metrev/database';
import {
  spatialRuntimeInputSha256,
  structuredCellGeometrySha256,
  buildStructuredCellDevelopmentReport,
  structuredCellRunViewSchema,
} from '@metrev/domain-contracts';
import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';
import { StructuredCellDevelopmentExecutor } from '../../packages/spatial-worker/src/structured-cell-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';
import { buildApp } from '../../apps/api-server/src/app';
import {
  readCellMesh,
  readCellField,
} from '../../apps/web-ui/src/lib/spatial-cell-field';
import { structuredCellFixture } from '../fixtures/structured-cell';

// This gate really invokes the native numerical process: numpy/scipy are required.
describe('structured cell native worker and authenticated artifacts', () => {
  it.each([
    [2, false],
    [3, false],
    [2, true],
  ] as const)(
    'persists %sD fields and diagnostics when nonconverged=%s',
    async (dimension, nonconverged) => {
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
        expect(cycle).toMatchObject({
          claimed: 1,
          completed: nonconverged ? 0 : 1,
          failed: nonconverged ? 1 : 0,
        });
        const snapshot = await repository.getOwnedRun(run.id, 'cell-owner');
        expect(snapshot?.status).toBe(nonconverged ? 'failed' : 'completed');
        expect(snapshot?.result?.fields).toHaveLength(5);
        expect(snapshot?.result?.contract_version).toBe(
          'spatial-simulation-result-v3',
        );
        const view = structuredCellRunViewSchema.parse({
          ...snapshot,
          input_snapshot: input,
        });
        const report = buildStructuredCellDevelopmentReport(view);
        expect(report.decision_eligible).toBe(false);
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
        expect(report.verification_status.mesh_refinement).toBe(
          'not_assessed_for_this_run',
        );
        let actor = 'cell-owner';
        const app = await buildApp({
          repository: new MemoryEvaluationRepository(),
          spatialSimulationRunRepository: repository,
          spatialFieldArtifactReader: store,
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
          const meshResponse = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}/mesh`,
          });
          const mesh = readCellMesh(meshResponse.json(), view);
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
          actor = 'different-owner';
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
