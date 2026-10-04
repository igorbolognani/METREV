import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SessionActor } from '@metrev/auth';
import {
  MemoryEvaluationRepository,
  MemorySpatialSimulationRunRepository,
} from '@metrev/database';
import {
  structuredCellRunViewSchema,
  spatialRuntimeInputSha256,
  structuredCellGeometrySha256,
} from '@metrev/domain-contracts';
import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';
import { buildApp } from '../../apps/api-server/src/app';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { caseSnapshotSha256 } from '../../apps/api-server/src/services/case-spatial-evaluation';
import { StructuredCellDevelopmentExecutor } from '../../packages/spatial-worker/src/structured-cell-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';
import { caseSpatialFixture } from '../fixtures/case-spatial';

const owner = {
  userId: 'case-cell-owner',
  email: 'case-cell@example.invalid',
  role: 'ANALYST' as const,
  sessionId: 'case-cell',
  sessionToken: 'case-cell',
};
describe('persisted case spatial execution', () => {
  it.each([
    [2, 'MFC', false],
    [3, 'MFC', false],
    [2, 'MEC', false],
    [2, 'MFC', true],
  ] as const)(
    'queues/reloads %sD %s diagnostics with failure=%s',
    async (dimension, system, failed) => {
      const root = await mkdtemp(join(tmpdir(), 'metrev-case-cell-'));
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
      const repository = new MemoryEvaluationRepository();
      const runs = new MemorySpatialSimulationRunRepository();
      let actor: SessionActor = owner;
      const app = await buildApp({
        repository,
        spatialSimulationRunRepository: runs,
        spatialSimulationRunAdmission: executor,
        spatialFieldArtifactReader: store,
        rateLimit: false,
        sessionResolver: async () => actor,
      });
      try {
        const { rawInput, request } = caseSpatialFixture(dimension, system);
        const evaluation = await createPersistedCaseEvaluation({
          rawInput,
          actor: owner,
          evaluationRepository: repository,
          logger: { warn: vi.fn() },
          environment: 'test',
          simulationMode: 'disabled',
        });
        const base = `/api/evaluations/${evaluation.evaluation_id}/spatial-simulations`;
        if (failed) request.input!.numerics.max_evaluations = 1;
        const plan = await app.inject({
          method: 'POST',
          url: base + '/plan',
          payload: request,
        });
        expect(plan.statusCode).toBe(200);
        expect(plan.json().status).toBe('ready');
        const bound = plan.json().resolution.input;
        expect(plan.json().resolution.stack_selections).toHaveLength(3);
        const reordered = structuredClone(bound);
        for (const layer of reordered.geometry.layers)
          layer.diffusivity = {
            oxidized: layer.diffusivity.oxidized,
            reduced: layer.diffusivity.reduced,
          };
        expect(spatialRuntimeInputSha256(reordered)).toBe(
          spatialRuntimeInputSha256(bound),
        );
        expect(structuredCellGeometrySha256(reordered)).toBe(
          structuredCellGeometrySha256(bound),
        );
        expect(
          (
            await app.inject({
              method: 'POST',
              url: '/api/spatial-simulations',
              headers: { 'idempotency-key': 'forged-case' },
              payload: { input: plan.json().resolution.input },
            })
          ).statusCode,
        ).toBe(400);
        expect(
          await runs.listOwnedEvaluationRuns(
            evaluation.evaluation_id,
            owner.userId,
          ),
        ).toHaveLength(0);
        expect(
          plan.json().resolution.input.case_context.normalized_case_sha256,
        ).toBe(caseSnapshotSha256(evaluation.normalized_case));
        const create = await app.inject({
          method: 'POST',
          url: base,
          headers: { 'idempotency-key': 'case-intent' },
          payload: request,
        });
        expect(create.statusCode).toBe(202);
        const id = create.json().run.id;
        const replay = await app.inject({
          method: 'POST',
          url: base,
          headers: { 'idempotency-key': 'case-intent' },
          payload: request,
        });
        expect(replay.statusCode).toBe(200);
        expect(replay.json().run.id).toBe(id);
        const cycle = await runSpatialSimulationWorkerCycle({
          repository: runs,
          executor,
          workerId: 'case-cell-test',
        });
        expect(cycle).toMatchObject({
          claimed: 1,
          completed: failed ? 0 : 1,
          failed: failed ? 1 : 0,
        });
        const view = await app.inject({
          method: 'GET',
          url: `/api/spatial-simulations/${id}/view`,
        });
        expect(view.statusCode).toBe(200);
        const parsed = structuredCellRunViewSchema.parse(view.json().run);
        expect(parsed.result?.equation_graph).toEqual(
          plan.json().resolution.equation_graph,
        );
        expect(parsed.input_snapshot!.case_context).toMatchObject({
          case_id: evaluation.case_id,
          evaluation_id: evaluation.evaluation_id,
          component_domains: request.component_domains,
        });
        const report = await app.inject({
          method: 'GET',
          url: `/api/spatial-simulations/${id}/report`,
        });
        expect(report.statusCode).toBe(200);
        expect(report.json()).toMatchObject({
          case_context: parsed.input_snapshot!.case_context,
          equation_graph: parsed.result!.equation_graph,
          decision_eligible: false,
          result_role: failed
            ? 'failed_run_diagnostics'
            : 'modeled_development_result',
        });
        const tampered = structuredClone(parsed);
        tampered.result!.equation_graph!.nodes[0].boundary = 'forged';
        expect(() => structuredCellRunViewSchema.parse(tampered)).toThrow();
        const history = await app.inject({ method: 'GET', url: base });
        expect(history.json().runs[0]).not.toHaveProperty('result');
        expect(history.json().runs[0]).not.toHaveProperty('input_snapshot');
        actor = { ...owner, role: 'VIEWER' };
        expect(
          (
            await app.inject({
              method: 'POST',
              url: base + '/plan',
              payload: request,
            })
          ).statusCode,
        ).toBe(403);
        expect(
          (await app.inject({ method: 'GET', url: base })).statusCode,
        ).toBe(200);
        actor = owner;
        expect(history.json().runs.map((r: { id: string }) => r.id)).toEqual([
          id,
        ]);
        request.input!.temperature.value += 1;
        expect(
          (
            await app.inject({
              method: 'POST',
              url: base,
              headers: { 'idempotency-key': 'case-intent' },
              payload: request,
            })
          ).statusCode,
        ).toBe(409);
        actor = { ...owner, userId: 'other-owner' };
        for (const method of ['GET', 'POST'] as const)
          expect(
            (
              await app.inject({
                method,
                url: method === 'GET' ? base : base + '/plan',
                ...(method === 'POST' ? { payload: request } : {}),
              })
            ).statusCode,
          ).toBe(404);
      } finally {
        await app.close();
        await rm(root, { recursive: true, force: true });
      }
    },
    30000,
  );
  it('does not queue missing data, unavailable modules or legacy evaluations without immutable snapshots', async () => {
    const repository = new MemoryEvaluationRepository();
    const runs = new MemorySpatialSimulationRunRepository();
    const { rawInput, request } = caseSpatialFixture();
    const evaluation = await createPersistedCaseEvaluation({
      rawInput,
      actor: owner,
      evaluationRepository: repository,
      logger: { warn: vi.fn() },
      environment: 'test',
      simulationMode: 'disabled',
    });
    const app = await buildApp({
      repository,
      spatialSimulationRunRepository: runs,
      rateLimit: false,
      sessionResolver: async () => owner,
    });
    try {
      const base = `/api/evaluations/${evaluation.evaluation_id}/spatial-simulations`;
      for (const [payload, status] of [
        [{ ...request, input: undefined }, 'insufficient_data'],
        [{ ...request, required_physics: ['hydraulics'] }, 'not_implemented'],
      ] as const) {
        const res = await app.inject({
          method: 'POST',
          url: base,
          headers: { 'idempotency-key': 'missing' },
          payload,
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().status).toBe(status);
      }
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base + '/plan',
            payload: request,
          })
        ).json().status,
      ).toBe('ready');
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers: { 'idempotency-key': 'unavailable' },
            payload: request,
          })
        ).statusCode,
      ).toBe(503);
      delete evaluation.audit_record.normalized_case_snapshot;
      await repository.saveEvaluation(evaluation);
      const legacy = await app.inject({
        method: 'POST',
        url: base + '/plan',
        payload: request,
      });
      expect(legacy.json().status).toBe('insufficient_data');
      expect(legacy.json().resolution.missing_inputs.join(' ')).toContain(
        'immutable',
      );
      expect(
        await runs.listOwnedEvaluationRuns(
          evaluation.evaluation_id,
          owner.userId,
        ),
      ).toHaveLength(0);
    } finally {
      await app.close();
    }
  });
  it('hashes case objects independently of JSONB key order', () => {
    expect(caseSnapshotSha256({ b: { z: 1, a: 2 }, a: [1, 2] })).toBe(
      caseSnapshotSha256({ a: [1, 2], b: { a: 2, z: 1 } }),
    );
    expect(caseSnapshotSha256([1, 2])).not.toBe(caseSnapshotSha256([2, 1]));
  });
  it('canonicalizes component mappings before hashing and persistence', async () => {
    const repository = new MemoryEvaluationRepository();
    const runs = new MemorySpatialSimulationRunRepository();
    const { rawInput, request } = caseSpatialFixture();
    const evaluation = await createPersistedCaseEvaluation({
      rawInput,
      actor: owner,
      evaluationRepository: repository,
      logger: { warn: vi.fn() },
      environment: 'test',
      simulationMode: 'disabled',
    });
    const app = await buildApp({
      repository,
      spatialSimulationRunRepository: runs,
      rateLimit: false,
      sessionResolver: async () => owner,
    });
    try {
      request.component_domains!.reverse();
      const response = await app.inject({
        method: 'POST',
        url: `/api/evaluations/${evaluation.evaluation_id}/spatial-simulations/plan`,
        payload: request,
      });
      expect(response.statusCode).toBe(200);
      expect(
        response.json().resolution.input.case_context.component_domains,
      ).toEqual([
        expect.objectContaining({ domain_tag: 'anode' }),
        expect.objectContaining({ domain_tag: 'membrane' }),
        expect.objectContaining({ domain_tag: 'cathode' }),
      ]);
    } finally {
      await app.close();
    }
  });
});
