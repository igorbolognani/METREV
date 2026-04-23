import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import {
  externalEvidenceBulkReviewRequestSchema,
  externalEvidenceReviewRequestSchema,
  externalEvidenceReviewStatusSchema,
  externalEvidenceSourceTypeSchema,
} from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number | null {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

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

    const query = request.query as {
      status?: string;
      q?: string;
      sourceType?: string;
      page?: string;
      pageSize?: string;
    };
    const parsedStatus = query.status
      ? externalEvidenceReviewStatusSchema.safeParse(query.status)
      : null;
    const parsedSourceType = query.sourceType
      ? externalEvidenceSourceTypeSchema.safeParse(query.sourceType)
      : null;
    const parsedPage = parsePositiveInteger(query.page, 1);
    const parsedPageSize = parsePositiveInteger(query.pageSize, 25);

    if (
      (parsedStatus && !parsedStatus.success) ||
      (parsedSourceType && !parsedSourceType.success) ||
      parsedPage === null ||
      parsedPageSize === null
    ) {
      return reply.code(400).send({
        error: 'invalid_query',
        details: {
          status:
            parsedStatus && !parsedStatus.success
              ? parsedStatus.error.flatten()
              : undefined,
          sourceType:
            parsedSourceType && !parsedSourceType.success
              ? parsedSourceType.error.flatten()
              : undefined,
          page: parsedPage === null ? ['page must be a positive integer'] : [],
          pageSize:
            parsedPageSize === null
              ? ['pageSize must be a positive integer']
              : [],
        },
      });
    }

    const response = await withSpan(
      'external_evidence.list',
      () =>
        app.evaluationRepository.listExternalEvidenceCatalog({
          reviewStatus: parsedStatus?.success ? parsedStatus.data : undefined,
          searchQuery: query.q,
          sourceType: parsedSourceType?.success
            ? parsedSourceType.data
            : undefined,
          page: parsedPage,
          pageSize: parsedPageSize,
        }),
      {
        actor_id: request.actor?.userId ?? 'anonymous',
        review_status: parsedStatus?.success ? parsedStatus.data : 'all',
        source_type: parsedSourceType?.success ? parsedSourceType.data : 'all',
      },
    );

    return reply.send(response);
  });

  app.post('/review/bulk', async (request, reply) => {
    let actor;

    try {
      actor = requireRole(request.actor, 'ANALYST');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'ANALYST');
      }

      throw error;
    }

    const parsed = externalEvidenceBulkReviewRequestSchema.safeParse(
      request.body,
    );

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    const response = await withSpan(
      'external_evidence.review_bulk',
      () =>
        app.evaluationRepository.reviewExternalEvidenceCatalogItems({
          catalogItemIds: parsed.data.ids,
          action: parsed.data.action,
          note: parsed.data.note,
          actorRole: actor.role,
          actorId: actor.userId,
        }),
      {
        actor_id: actor.userId,
        attempted_count: parsed.data.ids.length,
        review_action: parsed.data.action,
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
