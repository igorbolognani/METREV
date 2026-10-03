import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@metrev/auth';
import {
  structuredCellInputSchema,
  structuredCellTopology,
  spatialRuntimeInputSha256,
  spatialObservationComparisonRequestSchema,
  compareStructuredCellSpatialObservations,
} from '@metrev/domain-contracts';
import {
  readVerifiedSpatialArtifactBuffer,
  SpatialArtifactDownloadError,
} from '../services/spatial-artifact-download';

const paramsSchema = z
  .object({ runId: z.string().trim().min(1).max(160) })
  .strict();
const maxBytes = 16 * 1024 * 1024;

/** Compares observations with persisted hash-verified model fields, never client-supplied predictions. */
export async function registerSpatialFieldComparisonRoutes(
  app: FastifyInstance,
) {
  app.post(
    '/:runId/observation-comparisons',
    { bodyLimit: 2 * 1024 * 1024 },
    async (request, reply) => {
      let actor;
      try {
        actor = requireRole(request.actor, 'VIEWER');
      } catch (error) {
        if (error instanceof AuthorizationError)
          return reply.code(error.statusCode).send({ error: error.error });
        throw error;
      }
      const params = paramsSchema.safeParse(request.params),
        body = spatialObservationComparisonRequestSchema.safeParse(
          request.body,
        );
      if (!params.success || !body.success)
        return reply.code(400).send({ error: 'invalid_comparison_request' });
      const run = await app.spatialSimulationRunRepository.getOwnedRun(
        params.data.runId,
        actor.userId,
      );
      if (!run) return reply.code(404).send({ error: 'not_found' });
      if (
        !run.result ||
        run.model_id !== 'structured-cell-supporting-electrolyte-v1' ||
        !['completed', 'failed'].includes(run.status)
      )
        return reply
          .code(409)
          .send({ error: 'spatial_comparison_unavailable' });
      if (
        body.data.purpose === 'independent_residual' &&
        (run.status !== 'completed' ||
          run.result.conservation_residuals.some((r) => !r.passed) ||
          run.result.convergence.some((c) => c.status !== 'converged'))
      )
        return reply.code(422).send({ error: 'numerical_run_not_converged' });
      const raw = await app.spatialSimulationRunRepository.getOwnedInput(
        run.id,
        actor.userId,
      );
      const parsed = structuredCellInputSchema.safeParse(raw);
      if (
        !parsed.success ||
        spatialRuntimeInputSha256(parsed.data) !== run.input_sha256
      )
        return reply.code(409).send({ error: 'input_integrity_failure' });
      const field = run.result.fields.find(
        (f) => f.field_id === body.data.field_id,
      );
      if (
        !field ||
        field.value_type !== 'scalar' ||
        field.artifact.format !== 'json' ||
        run.result.mesh.artifact.format !== 'json'
      )
        return reply.code(422).send({ error: 'comparison_field_unsupported' });
      const reader = app.spatialFieldArtifactReader;
      if (!reader)
        return reply.code(503).send({ error: 'artifact_store_unavailable' });
      if (field.artifact.bytes + run.result.mesh.artifact.bytes > maxBytes)
        return reply.code(413).send({ error: 'comparison_artifact_limit' });
      const abort = new AbortController();
      const cancel = () => abort.abort();
      request.raw.once('aborted', cancel);
      const read = async (
        fieldId: string,
        artifact: {
          uri: string;
          sha256: string;
          bytes: number;
          dataset_path: string;
        },
      ) => {
        const bytes = await readVerifiedSpatialArtifactBuffer({
          controller: app.spatialArtifactDownloads,
          sha256: artifact.sha256,
          bytes: artifact.bytes,
          maxBytes,
          signal: abort.signal,
          source: (signal) =>
            reader.readField({
              ownerId: actor.userId,
              runId: run.id,
              fieldId,
              uri: artifact.uri,
              datasetPath: artifact.dataset_path,
              ...{ signal },
            }),
        });
        return JSON.parse(bytes.toString('utf8')) as unknown;
      };
      try {
        const mesh = await read('_mesh', {
          ...run.result.mesh.artifact,
          dataset_path: '/mesh',
        });
        const expected = structuredCellTopology(parsed.data);
        const equal = (a: unknown, b: unknown): boolean =>
          Array.isArray(a) && Array.isArray(b)
            ? a.length === b.length && a.every((v, i) => equal(v, b[i]))
            : typeof a === 'number' && typeof b === 'number'
              ? Number.isFinite(a) &&
                Math.abs(a - b) <=
                  1e-12 * Math.max(Math.abs(a), Math.abs(b), 1e-30)
              : a === b;
        if (
          typeof mesh !== 'object' ||
          mesh === null ||
          Object.keys(expected).some(
            (k) =>
              !equal(
                (mesh as Record<string, unknown>)[k],
                expected[k as keyof typeof expected],
              ),
          )
        )
          return reply
            .code(502)
            .send({ error: 'mesh_geometry_integrity_failure' });
        const samples = await read(field.field_id, field.artifact);
        const comparison = compareStructuredCellSpatialObservations({
          request: body.data,
          input: parsed.data,
          field: samples,
          binding: {
            run_id: run.id,
            input_sha256: run.input_sha256,
            mesh_sha256: run.result.mesh.artifact.sha256,
            field_artifact_sha256: field.artifact.sha256,
          },
        });
        reply.header('Cache-Control', 'private, no-store');
        return reply.send({ ...comparison, numerical_run_status: run.status });
      } catch (error) {
        if (error instanceof SpatialArtifactDownloadError) {
          const code =
            error.code === 'artifact_size_limit'
              ? 413
              : error.code === 'artifact_download_busy'
                ? 503
                : error.code === 'artifact_read_timeout'
                  ? 504
                  : 502;
          return reply.code(code).send({ error: error.code });
        }
        return reply
          .code(502)
          .send({ error: 'comparison_artifact_or_binding_failure' });
      } finally {
        request.raw.off('aborted', cancel);
      }
    },
  );
}
