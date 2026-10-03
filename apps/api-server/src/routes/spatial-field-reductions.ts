import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@metrev/auth';
import {
  structuredCellInputSchema,
  spatialRuntimeInputSha256,
  structuredCellTopology,
  structuredCellFieldReductionRequestSchema,
  deriveStructuredCellFieldReduction,
  validateStructuredCellFieldSamples,
  buildStructuredCellDevelopmentReport,
} from '@metrev/domain-contracts';
import {
  readVerifiedSpatialArtifactBuffer,
  SpatialArtifactDownloadError,
} from '../services/spatial-artifact-download';

const paramsSchema = z
  .object({ runId: z.string().trim().min(1).max(160) })
  .strict();
const maxReductionBytes = 16 * 1024 * 1024;

/** Recomputes bounded modeled observations; it never writes scientific acceptance. */
export async function registerSpatialFieldReductionRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post(
    '/:runId/field-reductions',
    { bodyLimit: 128 * 1024 },
    async (request, reply) => {
      let actor;
      try {
        actor = requireRole(request.actor, 'VIEWER');
      } catch (error) {
        if (error instanceof AuthorizationError)
          return reply.code(error.statusCode).send({ error: error.error });
        throw error;
      }
      const params = paramsSchema.safeParse(request.params);
      const parsed = structuredCellFieldReductionRequestSchema.safeParse(
        request.body,
      );
      if (!params.success || !parsed.success)
        return reply
          .code(400)
          .send({ error: 'invalid_field_reduction_request' });
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
        return reply.code(409).send({ error: 'field_reduction_unavailable' });
      const rawInput = await app.spatialSimulationRunRepository.getOwnedInput(
        run.id,
        actor.userId,
      );
      const input = structuredCellInputSchema.safeParse(rawInput);
      if (
        !input.success ||
        spatialRuntimeInputSha256(input.data) !== run.input_sha256
      )
        return reply.code(409).send({ error: 'input_integrity_failure' });
      const reader = app.spatialFieldArtifactReader;
      if (!reader)
        return reply.code(503).send({ error: 'artifact_store_unavailable' });
      const result = run.result;
      if (
        result.mesh.artifact.bytes +
          result.fields.reduce((sum, field) => sum + field.artifact.bytes, 0) >
        maxReductionBytes
      )
        return reply
          .code(413)
          .send({ error: 'field_reduction_artifact_limit' });
      for (const threshold of parsed.data.thresholds) {
        const field = result.fields.find(
          (f) => f.field_id === threshold.field_id,
        );
        if (
          !field ||
          field.value_type !== 'scalar' ||
          threshold.threshold.unit !== field.unit ||
          (threshold.domain_tag !== null &&
            !field.domain_tags.includes(threshold.domain_tag))
        )
          return reply.code(422).send({
            error: 'threshold_field_domain_or_unit_unavailable',
            threshold_id: threshold.threshold_id,
          });
      }
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
          maxBytes: maxReductionBytes,
          source: (signal) => {
            const lookup = {
              ownerId: actor.userId,
              runId: run.id,
              fieldId,
              uri: artifact.uri,
              datasetPath: artifact.dataset_path,
              signal,
            };
            return reader.readField(lookup);
          },
        });
        return JSON.parse(bytes.toString('utf8')) as unknown;
      };
      try {
        const mesh = await read('_mesh', {
          ...result.mesh.artifact,
          dataset_path: '/mesh',
        });
        const expectedMesh = structuredCellTopology(input.data);
        const equal = (actual: unknown, expected: unknown): boolean => {
          if (Array.isArray(actual) && Array.isArray(expected))
            return (
              actual.length === expected.length &&
              actual.every((value, index) => equal(value, expected[index]))
            );
          return typeof actual === 'number' && typeof expected === 'number'
            ? Number.isFinite(actual) &&
                Math.abs(actual - expected) <=
                  1e-12 * Math.max(Math.abs(actual), Math.abs(expected), 1e-30)
            : actual === expected;
        };
        if (
          typeof mesh !== 'object' ||
          mesh === null ||
          Object.keys(expectedMesh).some(
            (key) =>
              !equal(
                (mesh as Record<string, unknown>)[key],
                expectedMesh[key as keyof typeof expectedMesh],
              ),
          )
        )
          return reply
            .code(502)
            .send({ error: 'mesh_geometry_integrity_failure' });
        const fields = [];
        for (const field of result.fields) {
          if (field.value_type !== 'scalar')
            return reply
              .code(422)
              .send({ error: 'field_reduction_value_type_unsupported' });
          const samples = validateStructuredCellFieldSamples(
            await read(field.field_id, field.artifact),
            input.data,
          );
          if (samples.id !== field.field_id || samples.unit !== field.unit)
            return reply
              .code(502)
              .send({ error: 'field_manifest_integrity_failure' });
          fields.push({ samples, artifact_sha256: field.artifact.sha256 });
        }
        const reduction = deriveStructuredCellFieldReduction({
          input: input.data,
          input_sha256: run.input_sha256,
          mesh_sha256: result.mesh.artifact.sha256,
          geometry_request_sha256: result.mesh.request_sha256,
          numerical_status:
            result.convergence.every((c) => c.status === 'converged') &&
            result.conservation_residuals.every((r) => r.passed)
              ? 'converged'
              : 'not_converged',
          fields,
          thresholds: parsed.data.thresholds,
          threshold_request_sha256: createHash('sha256')
            .update(JSON.stringify(parsed.data))
            .digest('hex'),
        });
        const report = buildStructuredCellDevelopmentReport({
          ...run,
          input_snapshot: input.data,
        });
        reply.header('Cache-Control', 'private, no-store');
        return reply.send({
          reduction,
          report: { ...report, modeled_field_observations: reduction },
        });
      } catch (error) {
        if (error instanceof SpatialArtifactDownloadError)
          return reply
            .code(
              error.code === 'artifact_size_limit'
                ? 413
                : error.code === 'artifact_download_busy'
                  ? 429
                  : error.code === 'artifact_read_timeout'
                    ? 504
                    : 502,
            )
            .send({ error: error.code });
        request.log.warn(
          { err: error, runId: run.id },
          'Verified spatial field reduction failed',
        );
        return reply
          .code(502)
          .send({ error: 'field_reduction_integrity_failure' });
      }
    },
  );
}
