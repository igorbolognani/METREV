import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import {
  externalEvidenceReviewRequestSchema,
  externalEvidenceReviewStatusSchema,
} from '@metrev/domain-contracts';
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

export async function registerExternalEvidenceRoutes(
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

    const query = request.query as { status?: string; q?: string };
    const parsedStatus = query.status
      ? externalEvidenceReviewStatusSchema.safeParse(query.status)
      : null;

    if (parsedStatus && !parsedStatus.success) {
      return reply.code(400).send({
        error: 'invalid_query',
        details: parsedStatus.error.flatten(),
      });
    }

    const response = await withSpan(
      'external_evidence.list',
      () =>
        app.evaluationRepository.listExternalEvidenceCatalog({
          reviewStatus: parsedStatus?.success ? parsedStatus.data : undefined,
          searchQuery: query.q,
        }),
      {
        actor_id: request.actor?.userId ?? 'anonymous',
        review_status: parsedStatus?.success ? parsedStatus.data : 'all',
      },
    );

    return reply.send(response);
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
    const item = await withSpan(
      'external_evidence.get',
      () => app.evaluationRepository.getExternalEvidenceCatalogItem(id),
      {
        actor_id: request.actor?.userId ?? 'anonymous',
        catalog_item_id: id,
      },
    );

    if (!item) {
      return reply.code(404).send({
        error: 'not_found',
        message: `External evidence catalog item ${id} was not found.`,
      });
    }

    return reply.send(item);
  });

  app.post('/:id/review', async (request, reply) => {
    let actor;

    try {
      actor = requireRole(request.actor, 'ANALYST');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'ANALYST');
      }

      throw error;
    }

    const parsed = externalEvidenceReviewRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    const { id } = request.params as { id: string };
    const updated = await withSpan(
      'external_evidence.review',
      () =>
        app.evaluationRepository.reviewExternalEvidenceCatalogItem({
          catalogItemId: id,
          action: parsed.data.action,
          note: parsed.data.note,
          actorRole: actor.role,
          actorId: actor.userId,
        }),
      {
        actor_id: actor.userId,
        catalog_item_id: id,
        review_action: parsed.data.action,
      },
    );

    if (!updated) {
      return reply.code(404).send({
        error: 'not_found',
        message: `External evidence catalog item ${id} was not found.`,
      });
    }

    return reply.send(updated);
  });
}
