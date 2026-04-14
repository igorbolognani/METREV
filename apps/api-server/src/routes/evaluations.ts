import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import { withSpan } from '@metrev/telemetry';

function replyForAuthorizationError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: AuthorizationError,
  requiredRole: Role,
) {
  request.log.warn(
    {
      actor_id: request.actor?.userId,
      session_id: request.actor?.sessionId,
      actor_role: request.actor?.role,
      required_role: requiredRole,
      reason: error.error,
    },
    'request rejected by auth',
  );

  return reply.code(error.statusCode).send({
    error: error.error,
    message: error.message,
  });
}

export async function registerEvaluationRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get('/', async (request, reply) => {
    try {
      requireRole(request.actor, 'VIEWER');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'VIEWER');
      }

      throw error;
    }

    return withSpan(
      'evaluation.list',
      () => app.evaluationRepository.listEvaluations(),
      {
        actor_id: request.actor?.userId ?? 'anonymous',
      },
    );
  });

  app.get('/:id', async (request, reply) => {
    try {
      requireRole(request.actor, 'VIEWER');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'VIEWER');
      }

      throw error;
    }

    const { id } = request.params as { id: string };
    const evaluation = await withSpan(
      'evaluation.get',
      () => app.evaluationRepository.getEvaluation(id),
      {
        evaluation_id: id,
        actor_id: request.actor?.userId ?? 'anonymous',
      },
    );

    if (!evaluation) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Evaluation ${id} was not found.`,
      });
    }

    return reply.send(evaluation);
  });
}
