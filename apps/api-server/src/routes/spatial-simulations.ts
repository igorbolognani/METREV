import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AuthorizationError, requireRole } from '@metrev/auth';
import {
  SpatialSimulationRunError,
  type SpatialSimulationRunRepository,
} from '@metrev/database';
import {
  spatialRuntimeInputSchema,
  spatialRuntimeInputSha256,
  spatialRuntimeMeshRequestSha256,
  buildStructuredCellDevelopmentReport,
  renderStructuredCellDevelopmentReport,
  structuredCellRunViewSchema,
  type SpatialRuntimeInput,
} from '@metrev/domain-contracts';

const runParamsSchema = z
  .object({ runId: z.string().trim().min(1).max(160) })
  .strict();
const fieldParamsSchema = runParamsSchema.extend({
  fieldId: z.string().trim().min(1).max(160),
});
const createRequestSchema = z
  .object({
    input: spatialRuntimeInputSchema,
    evaluation_id: z.string().trim().min(1).max(160).nullable().optional(),
  })
  .strict();

export interface SpatialSimulationRunAdmission {
  solverVersion: string;
  runtimeVersion: string;
  supports(input: SpatialRuntimeInput): boolean;
}

export interface SpatialFieldArtifactReader {
  readField(input: {
    ownerId: string;
    runId: string;
    fieldId: string;
    uri: string;
    datasetPath: string;
  }): Promise<Readable>;
}

class FieldArtifactIntegrityError extends Error {
  constructor() {
    super('Spatial field artifact bytes do not match the persisted manifest');
    this.name = 'FieldArtifactIntegrityError';
  }
}

async function stageVerifiedField(input: {
  source: Readable;
  sha256: string;
  bytes: number;
}): Promise<{ directory: string; path: string }> {
  if (!Number.isSafeInteger(input.bytes))
    throw new FieldArtifactIntegrityError();
  const directory = await mkdtemp(join(tmpdir(), 'metrev-spatial-field-'));
  const path = join(directory, 'field.bin');
  const digest = createHash('sha256');
  let byteLength = 0;
  const verifier = new Transform({
    transform(chunk: Buffer | Uint8Array, _encoding, callback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteLength += bytes.byteLength;
      if (byteLength > input.bytes)
        return callback(new FieldArtifactIntegrityError());
      digest.update(bytes);
      callback(null, bytes);
    },
    flush(callback) {
      if (byteLength !== input.bytes || digest.digest('hex') !== input.sha256)
        return callback(new FieldArtifactIntegrityError());
      callback();
    },
  });

  try {
    await pipeline(
      input.source,
      verifier,
      createWriteStream(path, { flags: 'wx', mode: 0o600 }),
    );
    return { directory, path };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    spatialSimulationRunRepository: SpatialSimulationRunRepository;
    spatialSimulationRunAdmission: SpatialSimulationRunAdmission | null;
    spatialFieldArtifactReader: SpatialFieldArtifactReader | null;
  }
}

function authorize(
  request: FastifyRequest,
  reply: FastifyReply,
  role: 'ANALYST' | 'VIEWER',
) {
  try {
    return requireRole(request.actor, role);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      void reply
        .code(error.statusCode)
        .send({ error: error.error, message: error.message });
      return null;
    }
    throw error;
  }
}

function errorResponse(error: unknown, reply: FastifyReply) {
  if (error instanceof z.ZodError)
    return reply.code(400).send({
      error: 'invalid_input',
      details: error.flatten(),
    });
  if (error instanceof SpatialSimulationRunError) {
    const statusCode =
      error.code === 'not_found'
        ? 404
        : error.code === 'input_snapshot_too_large' ||
            error.code === 'result_manifest_too_large'
          ? 413
          : error.code === 'invalid_evaluation_scope'
            ? 422
            : error.code === 'invalid_transition'
              ? 422
              : 409;
    return reply.code(statusCode).send({
      error: error.code,
      message: error.message,
    });
  }
  throw error;
}

function idempotencyKey(request: FastifyRequest): string | null {
  const header = request.headers['idempotency-key'];
  if (typeof header !== 'string') return null;
  const value = header.trim();
  return value.length > 0 && value.length <= 128 ? value : null;
}

export async function registerSpatialSimulationRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post('/', { bodyLimit: 2 * 1024 * 1024 }, async (request, reply) => {
    const actor = authorize(request, reply, 'ANALYST');
    if (!actor) return reply;
    const parsed = createRequestSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    const requestKey = idempotencyKey(request);
    if (!requestKey)
      return reply.code(400).send({
        error: 'missing_idempotency_key',
        message: 'Supply a 1 to 128 character Idempotency-Key header.',
      });
    const admission = app.spatialSimulationRunAdmission;
    if (!admission)
      return reply.code(503).send({
        error: 'spatial_execution_unavailable',
        message:
          'No validated spatial solver/runtime adapter is registered for this service.',
      });

    const model = parsed.data.input;
    try {
      if (!admission.supports(model))
        return reply.code(422).send({
          error: 'unsupported_spatial_input',
          message:
            'The registered spatial executor does not support this input.',
        });
    } catch {
      return reply.code(503).send({ error: 'spatial_admission_failed' });
    }
    try {
      const created = await app.spatialSimulationRunRepository.createOrGet({
        owner_id: actor.userId,
        evaluation_id: parsed.data.evaluation_id ?? null,
        idempotency_key: requestKey,
        model_id: model.model_id,
        system: model.system,
        dimension: model.dimension,
        input_contract_version: model.contract_version,
        input_sha256: spatialRuntimeInputSha256(model),
        solver_version: admission.solverVersion,
        runtime_version: admission.runtimeVersion,
        mesh_request_sha256: spatialRuntimeMeshRequestSha256(model),
        input_snapshot: model,
      });
      reply.header('Location', `/api/spatial-simulations/${created.run.id}`);
      return reply
        .code(created.created ? 202 : 200)
        .send({ run: created.run, created: created.created });
    } catch (error) {
      return errorResponse(error, reply);
    }
  });

  app.get('/:runId', async (request, reply) => {
    const actor = authorize(request, reply, 'VIEWER');
    if (!actor) return reply;
    const params = runParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({
        error: 'invalid_input',
        details: params.error.flatten(),
      });
    const run = await app.spatialSimulationRunRepository.getOwnedRun(
      params.data.runId,
      actor.userId,
    );
    return run
      ? reply.send({ run })
      : reply.code(404).send({ error: 'not_found' });
  });

  app.get('/:runId/view', async (request, reply) => {
    const actor = authorize(request, reply, 'VIEWER');
    if (!actor) return reply;
    const params = runParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: 'invalid_input' });
    const run = await app.spatialSimulationRunRepository.getOwnedRun(
      params.data.runId,
      actor.userId,
    );
    if (!run) return reply.code(404).send({ error: 'not_found' });
    if (run.model_id !== 'structured-cell-supporting-electrolyte-v1')
      return reply.code(409).send({ error: 'view_unavailable' });
    const input = await app.spatialSimulationRunRepository.getOwnedInput(
      run.id,
      actor.userId,
    );
    if (!input || spatialRuntimeInputSha256(input) !== run.input_sha256)
      return reply.code(409).send({ error: 'input_integrity_failure' });
    reply.header('Cache-Control', 'private, no-store');
    return reply.send({
      run: structuredCellRunViewSchema.parse({ ...run, input_snapshot: input }),
    });
  });

  app.get('/:runId/report', async (request, reply) => {
    const actor = authorize(request, reply, 'VIEWER');
    if (!actor) return reply;
    const params = runParamsSchema.safeParse(request.params);
    const query = z
      .object({ format: z.enum(['json', 'markdown']).default('json') })
      .strict()
      .safeParse(request.query);
    if (!params.success || !query.success)
      return reply.code(400).send({ error: 'invalid_input' });
    const run = await app.spatialSimulationRunRepository.getOwnedRun(
      params.data.runId,
      actor.userId,
    );
    if (!run) return reply.code(404).send({ error: 'not_found' });
    if (
      run.model_id !== 'structured-cell-supporting-electrolyte-v1' ||
      !run.result ||
      !['completed', 'failed'].includes(run.status)
    )
      return reply.code(409).send({ error: 'report_unavailable' });
    const input = await app.spatialSimulationRunRepository.getOwnedInput(
      run.id,
      actor.userId,
    );
    if (!input || spatialRuntimeInputSha256(input) !== run.input_sha256)
      return reply.code(409).send({ error: 'input_integrity_failure' });
    const report = buildStructuredCellDevelopmentReport({
      ...run,
      input_snapshot: input,
    });
    reply.header('Cache-Control', 'private, no-store');
    if (query.data.format === 'markdown')
      return reply
        .type('text/markdown; charset=utf-8')
        .send(renderStructuredCellDevelopmentReport(report));
    return reply.send(report);
  });

  const downloadArtifact = async (
    request: FastifyRequest,
    reply: FastifyReply,
    mesh = false,
  ) => {
    const actor = authorize(request, reply, 'VIEWER');
    if (!actor) return reply;
    const params = mesh
      ? runParamsSchema.safeParse(request.params)
      : fieldParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({
        error: 'invalid_input',
        details: params.error.flatten(),
      });
    const run = await app.spatialSimulationRunRepository.getOwnedRun(
      params.data.runId,
      actor.userId,
    );
    if (!run) return reply.code(404).send({ error: 'not_found' });
    if (!['completed', 'failed'].includes(run.status) || !run.result)
      return reply.code(409).send({ error: 'field_not_available' });
    if (mesh && run.result.contract_version !== 'spatial-simulation-result-v3')
      return reply.code(422).send({ error: 'mesh_download_unsupported' });
    const field = mesh
      ? {
          field_id: '_mesh',
          artifact: { ...run.result.mesh.artifact, dataset_path: '/mesh' },
        }
      : run.result.fields.find(
          (candidate) =>
            candidate.field_id ===
            ('fieldId' in params.data ? params.data.fieldId : null),
        );
    if (!field) return reply.code(404).send({ error: 'not_found' });
    const reader = app.spatialFieldArtifactReader;
    if (!reader)
      return reply.code(503).send({ error: 'artifact_store_unavailable' });
    let stagedDirectory: string | null = null;
    try {
      const source = await reader.readField({
        ownerId: actor.userId,
        runId: run.id,
        fieldId: field.field_id,
        uri: field.artifact.uri,
        datasetPath: field.artifact.dataset_path,
      });
      const staged = await stageVerifiedField({
        source,
        sha256: field.artifact.sha256,
        bytes: field.artifact.bytes,
      });
      stagedDirectory = staged.directory;
      const download = createReadStream(staged.path);
      download.once('close', () => {
        void rm(staged.directory, { recursive: true, force: true }).catch(
          () => undefined,
        );
      });
      reply.header('Content-Type', 'application/octet-stream');
      reply.header('Content-Length', String(field.artifact.bytes));
      reply.header('ETag', `"${field.artifact.sha256}"`);
      reply.header('Cache-Control', 'private, no-store');
      reply.header('Content-Disposition', 'attachment');
      reply.header('X-Content-Type-Options', 'nosniff');
      return reply.send(download);
    } catch (error) {
      if (stagedDirectory)
        await rm(stagedDirectory, { recursive: true, force: true });
      if (error instanceof FieldArtifactIntegrityError)
        return reply.code(502).send({ error: 'artifact_integrity_failure' });
      return reply.code(502).send({ error: 'artifact_store_read_failed' });
    }
  };
  app.get('/:runId/fields/:fieldId', (request, reply) =>
    downloadArtifact(request, reply),
  );
  app.get('/:runId/mesh', (request, reply) =>
    downloadArtifact(request, reply, true),
  );

  app.delete('/:runId', async (request, reply) => {
    const actor = authorize(request, reply, 'ANALYST');
    if (!actor) return reply;
    const params = runParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({
        error: 'invalid_input',
        details: params.error.flatten(),
      });
    try {
      const run = await app.spatialSimulationRunRepository.requestCancellation(
        params.data.runId,
        actor.userId,
      );
      return run
        ? reply.send({ run })
        : reply.code(404).send({ error: 'not_found' });
    } catch (error) {
      return errorResponse(error, reply);
    }
  });

  app.post('/:runId/retries', async (request, reply) => {
    const actor = authorize(request, reply, 'ANALYST');
    if (!actor) return reply;
    const params = runParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({
        error: 'invalid_input',
        details: params.error.flatten(),
      });
    const requestKey = idempotencyKey(request);
    if (!requestKey)
      return reply.code(400).send({
        error: 'missing_idempotency_key',
        message: 'Supply a 1 to 128 character Idempotency-Key header.',
      });
    const admission = app.spatialSimulationRunAdmission;
    if (!admission)
      return reply.code(503).send({
        error: 'spatial_execution_unavailable',
        message:
          'Retries are unavailable until a validated spatial solver/runtime adapter is registered.',
      });
    try {
      const parent = await app.spatialSimulationRunRepository.getOwnedRun(
        params.data.runId,
        actor.userId,
      );
      if (!parent) return reply.code(404).send({ error: 'not_found' });
      if (
        parent.solver_version !== admission.solverVersion ||
        parent.runtime_version !== admission.runtimeVersion
      )
        return reply.code(409).send({
          error: 'incompatible_solver_version',
          message:
            'The original run requires a different solver/runtime version.',
        });
      const originalInput =
        await app.spatialSimulationRunRepository.getOwnedInput(
          parent.id,
          actor.userId,
        );
      if (!originalInput)
        return reply.code(409).send({ error: 'missing_input_snapshot' });
      try {
        if (!admission.supports(originalInput))
          return reply.code(422).send({
            error: 'unsupported_spatial_input',
          });
      } catch {
        return reply.code(503).send({ error: 'spatial_admission_failed' });
      }
      const retried = await app.spatialSimulationRunRepository.retryFailedRun({
        run_id: params.data.runId,
        owner_id: actor.userId,
        idempotency_key: requestKey,
      });
      reply.header('Location', `/api/spatial-simulations/${retried.run.id}`);
      return reply
        .code(retried.created ? 202 : 200)
        .send({ run: retried.run, created: retried.created });
    } catch (error) {
      return errorResponse(error, reply);
    }
  });
}
