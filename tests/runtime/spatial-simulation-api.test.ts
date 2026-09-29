import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import type { SessionActor } from '@metrev/auth';
import {
  MemoryEvaluationRepository,
  MemorySpatialSimulationRunRepository,
} from '@metrev/database';
import {
  spatialSimulationResultSchema,
  type SpatialSimulationRunSnapshot,
} from '@metrev/domain-contracts';
import { describe, expect, it } from 'vitest';
import { LocalSpatialFieldArtifactStore } from '@metrev/spatial-artifact-store';

import { buildApp } from '../../apps/api-server/src/app';
import { validSpatialSimulationResult } from '../fixtures/spatial-simulation-result';
import { createSpatialSimulationRunInput } from '../fixtures/spatial-simulation-run';

const analyst: SessionActor = {
  userId: 'spatial-analyst',
  email: 'analyst@example.invalid',
  role: 'ANALYST',
  sessionId: 'spatial-session',
  sessionToken: 'spatial-token',
};

async function completeRun(
  repository: MemorySpatialSimulationRunRepository,
  key: string,
  fieldBytes?: Buffer,
): Promise<SpatialSimulationRunSnapshot> {
  const input = createSpatialSimulationRunInput({
    ownerId: analyst.userId,
    idempotencyKey: key,
  });
  const { run } = await repository.createOrGet(input);
  const preparing = await repository.transition({
    run_id: run.id,
    owner_id: analyst.userId,
    expected_status: 'queued',
    next_status: 'preparing_geometry',
    progress: 10,
  });
  if (!preparing) throw new Error('missing preparing run');
  const meshing = await repository.transition({
    run_id: run.id,
    owner_id: analyst.userId,
    expected_status: 'preparing_geometry',
    next_status: 'meshing',
    progress: 20,
  });
  if (!meshing) throw new Error('missing meshing run');
  const solving = await repository.transition({
    run_id: run.id,
    owner_id: analyst.userId,
    expected_status: 'meshing',
    next_status: 'solving',
    progress: 30,
    mesh_sha256: 'a'.repeat(64),
  });
  if (!solving) throw new Error('missing solving run');
  const postprocessing = await repository.transition({
    run_id: run.id,
    owner_id: analyst.userId,
    expected_status: 'solving',
    next_status: 'postprocessing',
    progress: 90,
  });
  if (!postprocessing) throw new Error('missing postprocessing run');
  const fixtureResult = validSpatialSimulationResult(postprocessing);
  const fieldDigest = fieldBytes
    ? createHash('sha256').update(fieldBytes).digest('hex')
    : null;
  const fields = fixtureResult.fields.map((field) =>
    fieldDigest && fieldBytes
      ? {
          ...field,
          artifact: {
            ...field.artifact,
            uri: `metrev-artifact://sha256/${fieldDigest}`,
            sha256: fieldDigest,
            bytes: fieldBytes.byteLength,
          },
        }
      : field,
  );
  const result = spatialSimulationResultSchema.parse({
    ...fixtureResult,
    fields,
    artifact_hashes: [
      ...new Set([
        fixtureResult.mesh.artifact.sha256,
        ...fields.map((field) => field.artifact.sha256),
      ]),
    ].sort(),
  });
  const completed = await repository.transition({
    run_id: run.id,
    owner_id: analyst.userId,
    expected_status: 'postprocessing',
    next_status: 'completed',
    progress: 100,
    result,
  });
  if (!completed) throw new Error('missing completed run');
  return completed;
}

describe('spatial simulation API', () => {
  it('serves persisted field bytes through the owner-scoped local provider', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'metrev-api-field-'));
    const fieldBytes = Buffer.from('persisted spatial field fixture');
    const spatialRuns = new MemorySpatialSimulationRunRepository();
    const completed = await completeRun(
      spatialRuns,
      'local-field-provider',
      fieldBytes,
    );
    const sourceFilePath = join(directory, 'field.vtu');
    const store = new LocalSpatialFieldArtifactStore({
      rootDirectory: join(directory, 'store'),
    });
    await writeFile(sourceFilePath, fieldBytes);
    await store.storeField({
      ownerId: analyst.userId,
      runId: completed.id,
      field: completed.result!.fields[0],
      sourceFilePath,
    });
    let actor: SessionActor = analyst;
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      spatialSimulationRunRepository: spatialRuns,
      spatialFieldArtifactReader: store,
      rateLimit: false,
      sessionResolver: async () => actor,
    });
    try {
      const path = `/api/spatial-simulations/${completed.id}/fields/substrate_concentration_final`;
      const response = await app.inject({ method: 'GET', url: path });
      expect(response.statusCode).toBe(200);
      expect(response.rawPayload).toEqual(fieldBytes);
      actor = { ...analyst, userId: 'other-user' };
      expect((await app.inject({ method: 'GET', url: path })).statusCode).toBe(
        404,
      );
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('requires a session, scopes status to its owner, and gives viewers read access', async () => {
    let actor: SessionActor | null = analyst;
    const spatialRuns = new MemorySpatialSimulationRunRepository();
    const { run } = await spatialRuns.createOrGet(
      createSpatialSimulationRunInput({
        ownerId: analyst.userId,
        idempotencyKey: 'read-run',
      }),
    );
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      spatialSimulationRunRepository: spatialRuns,
      rateLimit: false,
      sessionResolver: async () => actor,
    });
    try {
      actor = null;
      expect(
        (
          await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}`,
          })
        ).statusCode,
      ).toBe(401);
      actor = { ...analyst, role: 'VIEWER' };
      const visible = await app.inject({
        method: 'GET',
        url: `/api/spatial-simulations/${run.id}`,
      });
      expect(visible.statusCode).toBe(200);
      expect(visible.json().run).toMatchObject({
        id: run.id,
        status: 'queued',
      });
      expect(visible.json().run).not.toHaveProperty('owner_id');
      actor = { ...analyst, userId: 'another-owner' };
      expect(
        (
          await app.inject({
            method: 'GET',
            url: `/api/spatial-simulations/${run.id}`,
          })
        ).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });

  it('cancels for analysts, blocks viewer writes, and makes retries idempotent', async () => {
    let actor: SessionActor | null = analyst;
    const spatialRuns = new MemorySpatialSimulationRunRepository();
    const queued = await spatialRuns.createOrGet(
      createSpatialSimulationRunInput({
        ownerId: analyst.userId,
        idempotencyKey: 'cancel-run',
      }),
    );
    const failedInput = createSpatialSimulationRunInput({
      ownerId: analyst.userId,
      idempotencyKey: 'failed-run',
    });
    const failed = await spatialRuns.createOrGet(failedInput);
    await spatialRuns.transition({
      run_id: failed.run.id,
      owner_id: analyst.userId,
      expected_status: 'queued',
      next_status: 'preparing_geometry',
      progress: 5,
    });
    await spatialRuns.transition({
      run_id: failed.run.id,
      owner_id: analyst.userId,
      expected_status: 'preparing_geometry',
      next_status: 'failed',
      progress: 5,
      failure: { code: 'fixture', message: 'Controlled test failure' },
    });
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      spatialSimulationRunRepository: spatialRuns,
      spatialSimulationRunAdmission: {
        solverVersion: 'solver-dev-1',
        runtimeVersion: 'sidecar-dev-1',
        supports: () => true,
      },
      rateLimit: false,
      sessionResolver: async () => actor,
    });
    try {
      actor = { ...analyst, role: 'VIEWER' };
      expect(
        (
          await app.inject({
            method: 'DELETE',
            url: `/api/spatial-simulations/${queued.run.id}`,
          })
        ).statusCode,
      ).toBe(403);
      actor = analyst;
      const cancelled = await app.inject({
        method: 'DELETE',
        url: `/api/spatial-simulations/${queued.run.id}`,
      });
      expect(cancelled.statusCode).toBe(200);
      expect(cancelled.json().run).toMatchObject({
        id: queued.run.id,
        status: 'cancelled',
        cancellation_requested: true,
      });

      const retry = (key: string) =>
        app.inject({
          method: 'POST',
          url: `/api/spatial-simulations/${failed.run.id}/retries`,
          headers: { 'idempotency-key': key },
        });
      const first = await retry('retry-once');
      const replay = await retry('retry-once');
      expect(first.statusCode).toBe(202);
      expect(first.json().created).toBe(true);
      expect(replay.statusCode).toBe(200);
      expect(replay.json()).toMatchObject({
        created: false,
        run: {
          retry_of_run_id: failed.run.id,
          retry_count: 1,
        },
      });
      expect((await retry('retry-sibling')).json()).toMatchObject({
        error: 'retry_not_allowed',
      });

      app.spatialSimulationRunAdmission = {
        solverVersion: 'solver-dev-2',
        runtimeVersion: 'sidecar-dev-1',
        supports: () => true,
      };
      expect((await retry('retry-incompatible-version')).statusCode).toBe(409);
      app.spatialSimulationRunAdmission = {
        solverVersion: 'solver-dev-1',
        runtimeVersion: 'sidecar-dev-1',
        supports: () => false,
      };
      expect((await retry('retry-unsupported-input')).statusCode).toBe(422);
      actor = { ...analyst, userId: 'another-owner' };
      expect((await retry('retry-another-owner')).statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it('keeps run creation unavailable without solver admission and fails field reads closed', async () => {
    const spatialRuns = new MemorySpatialSimulationRunRepository();
    const completed = await completeRun(spatialRuns, 'field-run');
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      spatialSimulationRunRepository: spatialRuns,
      rateLimit: false,
      sessionResolver: async () => analyst,
    });
    try {
      const create = await app.inject({
        method: 'POST',
        url: '/api/spatial-simulations',
        headers: { 'idempotency-key': 'create-spatial' },
        payload: {
          input: createSpatialSimulationRunInput({
            ownerId: analyst.userId,
            idempotencyKey: 'template',
          }).input_snapshot,
        },
      });
      expect(create.statusCode).toBe(503);
      expect(create.json().error).toBe('spatial_execution_unavailable');

      const field = await app.inject({
        method: 'GET',
        url: `/api/spatial-simulations/${completed.id}/fields/substrate_concentration_final`,
      });
      expect(field.statusCode).toBe(503);
      expect(field.json().error).toBe('artifact_store_unavailable');
    } finally {
      await app.close();
    }
  });

  it('checks the bytes against the completed field manifest before serving them', async () => {
    const spatialRuns = new MemorySpatialSimulationRunRepository();
    const completed = await completeRun(spatialRuns, 'integrity-field-run');
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      spatialSimulationRunRepository: spatialRuns,
      spatialFieldArtifactReader: {
        readField: async ({ ownerId, runId, fieldId }) => {
          expect(ownerId).toBe(analyst.userId);
          expect(runId).toBe(completed.id);
          expect(fieldId).toBe('substrate_concentration_final');
          return Readable.from([Buffer.from('tampered artifact')]);
        },
      },
      rateLimit: false,
      sessionResolver: async () => analyst,
    });
    try {
      const field = await app.inject({
        method: 'GET',
        url: `/api/spatial-simulations/${completed.id}/fields/substrate_concentration_final`,
      });
      expect(field.statusCode).toBe(502);
      expect(field.json().error).toBe('artifact_integrity_failure');
    } finally {
      await app.close();
    }
  });

  it('streams a field only after the artifact bytes match its owner-scoped manifest', async () => {
    const fieldBytes = Buffer.from('verified scalar field payload');
    const fieldDigest = createHash('sha256').update(fieldBytes).digest('hex');
    const spatialRuns = new MemorySpatialSimulationRunRepository();
    const completed = await completeRun(
      spatialRuns,
      'verified-field-run',
      fieldBytes,
    );
    const app = await buildApp({
      repository: new MemoryEvaluationRepository(),
      spatialSimulationRunRepository: spatialRuns,
      spatialFieldArtifactReader: {
        readField: async (read) => {
          expect(read).toMatchObject({
            ownerId: analyst.userId,
            runId: completed.id,
            fieldId: 'substrate_concentration_final',
            uri: `metrev-artifact://sha256/${fieldDigest}`,
            datasetPath: '/fields/substrate_concentration',
          });
          return Readable.from([fieldBytes]);
        },
      },
      rateLimit: false,
      sessionResolver: async () => analyst,
    });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/spatial-simulations/${completed.id}/fields/substrate_concentration_final`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers.etag).toBe(`"${fieldDigest}"`);
      expect(response.rawPayload).toEqual(fieldBytes);
    } finally {
      await app.close();
    }
  });
});
