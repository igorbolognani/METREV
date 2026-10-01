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
} from '@metrev/domain-contracts';
import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';
import { StructuredCellDevelopmentExecutor } from '../../packages/spatial-worker/src/structured-cell-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';
import { buildApp } from '../../apps/api-server/src/app';
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
        const app = await buildApp({
          repository: new MemoryEvaluationRepository(),
          spatialSimulationRunRepository: repository,
          spatialFieldArtifactReader: store,
          rateLimit: false,
          sessionResolver: async () => ({
            userId: 'cell-owner',
            email: 'cell@example.invalid',
            role: 'ANALYST',
            sessionId: 'cell-session',
            sessionToken: 'cell-token',
          }),
        });
        try {
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
