import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import { rawCaseInputSchema } from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

import {
  createPersistedCaseEvaluation,
  InvalidCatalogEvidenceSelectionError,
} from '../services/case-evaluation';

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

export async function registerCaseRoutes(app: FastifyInstance): Promise<void> {
  app.get('/:id/history', async (request, reply) => {
    try {
      requireRole(request.actor, 'VIEWER');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'VIEWER');
      }

      throw error;
    }

    const { id } = request.params as { id: string };
    const history = await withSpan(
      'case.history.get',
      () => app.evaluationRepository.getCaseHistory(id),
      {
        case_id: id,
        actor_id: request.actor?.userId ?? 'anonymous',
      },
    );

    if (!history) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Case ${id} was not found.`,
      });
    }

    return reply.send(history);
  });

  app.post('/evaluate', async (request, reply) => {
    let actor;

    try {
      actor = requireRole(request.actor, 'VIEWER');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'VIEWER');
      }

      throw error;
    }

    const parsed = rawCaseInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    try {
      const evaluation = await createPersistedCaseEvaluation({
        rawInput: parsed.data,
        actor,
        evaluationRepository: app.evaluationRepository,
        logger: app.log,
        environment: process.env.NODE_ENV,
        idempotencyKey:
          typeof request.headers['idempotency-key'] === 'string'
            ? request.headers['idempotency-key']
            : undefined,
        entrypoint: 'api',
      });

      return reply.code(201).send(evaluation);
    } catch (error) {
      if (error instanceof InvalidCatalogEvidenceSelectionError) {
        return reply.code(error.statusCode).send({
          error: error.code,
          message: error.message,
          catalog_item_id: error.catalogItemId,
        });
      }

      throw error;
    }
  });
}
