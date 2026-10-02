import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireRole, AuthorizationError } from '@metrev/auth';
import { SpatialSimulationRunError } from '@metrev/database';
import { caseSpatialRequestSchema } from '@metrev/domain-contracts';
import {
  createPersistedCaseSpatialEvaluation,
  getOwnedSpatialCaseEvaluation,
  CaseSpatialEvaluationError,
} from '../services/case-spatial-evaluation';

const params = z.object({ id: z.string().trim().min(1).max(160) }).strict();
function errorReply(error: unknown, reply: FastifyReply) {
  if (error instanceof AuthorizationError)
    return reply
      .code(error.statusCode)
      .send({ error: error.error, message: error.message });
  if (error instanceof CaseSpatialEvaluationError)
    return reply
      .code(error.statusCode)
      .send({ error: error.code, message: error.message });
  if (error instanceof z.ZodError || error instanceof RangeError)
    return reply.code(400).send({
      error: 'invalid_input',
      message: 'Case input or component mapping is invalid.',
      ...(error instanceof z.ZodError ? { details: error.flatten() } : {}),
    });
  if (error instanceof SpatialSimulationRunError)
    return reply
      .code(
        error.code === 'invalid_evaluation_scope'
          ? 404
          : error.code === 'input_snapshot_too_large'
            ? 413
            : 409,
      )
      .send({ error: error.code, message: error.message });
  throw error;
}
export async function registerCaseSpatialEvaluationRoutes(
  app: FastifyInstance,
) {
  for (const enqueue of [false, true])
    app.post(
      `/:id/spatial-simulations${enqueue ? '' : '/plan'}`,
      { bodyLimit: 2 * 1024 * 1024 },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const actor = requireRole(request.actor, 'ANALYST');
          const { id } = params.parse(request.params);
          const parsed = caseSpatialRequestSchema.parse(request.body);
          const header = request.headers['idempotency-key'];
          const key = typeof header === 'string' ? header.trim() : '';
          if (enqueue && (!key || key.length > 128))
            return reply.code(400).send({
              error: 'missing_idempotency_key',
              message: 'Supply a 1 to 128 character Idempotency-Key header.',
            });
          const response = await createPersistedCaseSpatialEvaluation(
            app,
            id,
            actor.userId,
            parsed,
            key,
            enqueue,
          );
          reply.header('Cache-Control', 'private, no-store');
          if (response.run)
            reply.header(
              'Location',
              `/api/spatial-simulations/${response.run.id}`,
            );
          return reply
            .code(response.run && response.created ? 202 : 200)
            .send(response);
        } catch (error) {
          return errorReply(error, reply);
        }
      },
    );
  app.get('/:id/spatial-simulations', async (request, reply) => {
    try {
      const actor = requireRole(request.actor, 'VIEWER');
      const { id } = params.parse(request.params);
      await getOwnedSpatialCaseEvaluation(app, id, actor.userId);
      reply.header('Cache-Control', 'private, no-store');
      return reply.send({
        runs: await app.spatialSimulationRunRepository.listOwnedEvaluationRuns(
          id,
          actor.userId,
        ),
        limit: 25,
      });
    } catch (error) {
      return errorReply(error, reply);
    }
  });
}
