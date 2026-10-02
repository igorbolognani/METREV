import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  PrismaSpatialSimulationRunRepository,
  PrismaEvaluationRepository,
  getPrismaClient,
  disconnectPrismaClient,
} from '@metrev/database';
import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';
import { StructuredCellDevelopmentExecutor } from '../../packages/spatial-worker/src/structured-cell-executor';
import { runSpatialSimulationWorkerCycle } from '../../packages/spatial-worker/src/worker';
import { buildApp } from '../../apps/api-server/src/app';
import { caseSpatialFixture } from '../fixtures/case-spatial';
import { createPersistedCaseEvaluation } from '../../apps/api-server/src/services/case-evaluation';
import { caseSnapshotSha256 } from '../../apps/api-server/src/services/case-spatial-evaluation';

// Required PostgreSQL gate: native Python solve, durable reload and owner-scoped API.
describe('case-bound PostgreSQL native worker/API roundtrip', () => {
  const prisma = getPrismaClient();
  const keys: string[] = [];
  const caseIds: string[] = [];
  let ownerId: string;
  beforeAll(async () => {
    const owner = await prisma.user.findUnique({
      where: {
        email: (
          process.env.METREV_LOCAL_ANALYST_EMAIL ?? 'analyst@metrev.local'
        ).toLowerCase(),
      },
    });
    if (!owner) throw new Error('Seeded test analyst is required');
    ownerId = owner.id;
  });
  afterAll(async () => {
    if (ownerId)
      await prisma.spatialSimulationRunRecord.deleteMany({
        where: { ownerId, idempotencyKey: { in: keys } },
      });
    await prisma.caseRecord.deleteMany({ where: { id: { in: caseIds } } });
    await disconnectPrismaClient();
  });
  it.each([
    [2, 'MFC', false],
    [3, 'MFC', false],
    [2, 'MEC', false],
    [2, 'MFC', true],
  ] as const)(
    'reloads %sD %s with failure=%s',
    async (dimension, system, failed) => {
      const root = await mkdtemp(join(tmpdir(), 'metrev-cell-pg-'));
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
      const repository = new PrismaSpatialSimulationRunRepository(prisma);
      let actor = ownerId;
      const evaluations = new PrismaEvaluationRepository(prisma);
      const app = await buildApp({
        repository: evaluations,
        spatialSimulationRunRepository: repository,
        spatialSimulationRunAdmission: executor,
        spatialFieldArtifactReader: store,
        rateLimit: false,
        sessionResolver: async () => ({
          userId: actor,
          email: 'pg-cell@example.invalid',
          role: 'ANALYST',
          sessionId: 'pg-cell',
          sessionToken: 'pg-cell',
        }),
      });
      const caseId = `case-cell-pg-${randomUUID()}`;
      caseIds.push(caseId);
      const { rawInput, request } = caseSpatialFixture(
        dimension,
        system,
        caseId,
      );
      const evaluationKey = `evaluation-cell-pg-${randomUUID()}`;
      const actorContext = {
        userId: ownerId,
        email: 'pg-cell@example.invalid',
        role: 'ANALYST' as const,
        sessionId: 'pg-cell',
        sessionToken: 'pg-cell',
      };
      const evaluation = await createPersistedCaseEvaluation({
        rawInput,
        actor: actorContext,
        evaluationRepository: evaluations,
        logger: { warn: vi.fn() },
        simulationMode: 'disabled',
        environment: 'test',
        idempotencyKey: evaluationKey,
      });
      const base = `/api/evaluations/${evaluation.evaluation_id}/spatial-simulations`;
      const input = request.input!;
      if (failed) input.numerics.max_evaluations = 1;
      const key = `cell-pg-${randomUUID()}`;
      keys.push(key);
      try {
        const create = await app.inject({
          method: 'POST',
          url: base,
          headers: { 'idempotency-key': key },
          payload: request,
        });
        expect(create.statusCode).toBe(202);
        const boundInput = create.json().resolution.input;
        expect(boundInput.case_context.normalized_case_sha256).toBe(
          caseSnapshotSha256(evaluation.normalized_case),
        );
        // A subsequent revision of the same case cannot change an earlier evaluation.
        const changedRaw = structuredClone(rawInput);
        changedRaw.feed_and_operation.temperature_c = 35;
        const newer = await createPersistedCaseEvaluation({
          rawInput: changedRaw,
          actor: actorContext,
          evaluationRepository: evaluations,
          logger: { warn: vi.fn() },
          simulationMode: 'disabled',
          environment: 'test',
        });
        const freshEvaluations = new PrismaEvaluationRepository(prisma);
        expect(
          (await freshEvaluations.getEvaluation(evaluation.evaluation_id))
            ?.normalized_case,
        ).toEqual(evaluation.normalized_case);
        expect(
          (await freshEvaluations.getEvaluationByIdempotencyKey(evaluationKey))
            ?.normalized_case,
        ).toEqual(evaluation.normalized_case);
        expect(newer.normalized_case).not.toEqual(evaluation.normalized_case);
        const id = create.json().run.id as string;
        const replay = await app.inject({
          method: 'POST',
          url: base,
          headers: { 'idempotency-key': key },
          payload: request,
        });
        expect(replay.json().run.id).toBe(id);
        const cycle = await runSpatialSimulationWorkerCycle({
          repository,
          executor,
          workerId: 'pg-native-cell',
        });
        expect(cycle).toMatchObject({
          claimed: 1,
          completed: failed ? 0 : 1,
          failed: failed ? 1 : 0,
        });
        const reloaded = await new PrismaSpatialSimulationRunRepository(
          prisma,
        ).getOwnedRun(id, ownerId);
        expect(reloaded?.status).toBe(failed ? 'failed' : 'completed');
        expect(reloaded?.result?.convergence[0].termination_reason).toBe(
          failed ? 'maximum_evaluations' : 'nonlinear_and_conservation_passed',
        );
        const persisted =
          await prisma.spatialSimulationRunRecord.findUniqueOrThrow({
            where: { id },
          });
        expect(persisted.resultManifest).toEqual(reloaded?.result);
        expect(JSON.stringify(persisted.resultManifest)).not.toContain(
          '"values":[',
        );
        expect(persisted.inputSnapshot).toEqual(boundInput);
        expect(persisted.evaluationId).toBe(evaluation.evaluation_id);
        expect(
          (
            await repository.listOwnedEvaluationRuns(
              evaluation.evaluation_id,
              ownerId,
            )
          ).map((r) => r.id),
        ).toEqual([id]);
        expect(reloaded?.result?.equation_graph).toEqual(
          create.json().resolution.equation_graph,
        );
        for (const suffix of [
          'view',
          'mesh',
          'fields/liquid_potential',
          'report',
          'report?format=markdown',
        ]) {
          const response = await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${id}/${suffix}`,
          });
          expect(response.statusCode).toBe(200);
        }
        const report = (
          await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${id}/report`,
          })
        ).json();
        expect(report).toMatchObject({
          case_context: boundInput.case_context,
          decision_eligible: false,
          independent_validation: false,
          result_role: failed
            ? 'failed_run_diagnostics'
            : 'modeled_development_result',
        });
        actor = 'unrelated-owner';
        for (const suffix of [
          'view',
          'mesh',
          'fields/liquid_potential',
          'report',
        ])
          expect(
            (
              await app.inject({
                method: 'GET',
                url: `/api/spatial-simulations/${id}/${suffix}`,
              })
            ).statusCode,
          ).toBe(404);
        actor = ownerId;
        if (failed) {
          const retryKey = key + '-retry';
          keys.push(retryKey);
          const retry = await app.inject({
            method: 'POST',
            url: `/api/spatial-simulations/${id}/retries`,
            headers: { 'idempotency-key': retryKey },
            payload: {},
          });
          expect(retry.statusCode).toBe(202);
          expect(retry.json().run.retry_of_run_id).toBe(id);
          const child = retry.json().run.id as string;
          expect(await repository.getOwnedInput(child, ownerId)).toEqual(
            boundInput,
          );
          const cancelled = await app.inject({
            method: 'DELETE',
            url: `/api/spatial-simulations/${child}`,
          });
          expect(cancelled.json().run.status).toBe('cancelled');
        }
      } finally {
        await app.close();
        await rm(root, { recursive: true, force: true });
      }
    },
    30000,
  );
});
