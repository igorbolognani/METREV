import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import { confidenceLevelSchema } from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

const evaluationSortKeyValues = [
  'created_at',
  'confidence_level',
  'case_id',
] as const;
const evaluationSortDirectionValues = ['asc', 'desc'] as const;

function parsePositiveInteger(
  value: string | undefined,
): number | null | undefined {
  if (!value?.trim()) {
    return undefined;
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

    const query = request.query as {
      confidence?: string;
      q?: string;
      sort?: string;
      dir?: string;
      page?: string;
      pageSize?: string;
    };
    const parsedConfidence = query.confidence?.trim()
      ? confidenceLevelSchema.safeParse(query.confidence.trim())
      : null;
    const parsedPage = parsePositiveInteger(query.page);
    const parsedPageSize = parsePositiveInteger(query.pageSize);
    const parsedSortKey = query.sort?.trim();
    const parsedSortDirection = query.dir?.trim();

    if (
      (parsedConfidence && !parsedConfidence.success) ||
      (parsedSortKey &&
        !evaluationSortKeyValues.includes(
          parsedSortKey as (typeof evaluationSortKeyValues)[number],
        )) ||
      (parsedSortDirection &&
        !evaluationSortDirectionValues.includes(
          parsedSortDirection as (typeof evaluationSortDirectionValues)[number],
        )) ||
      parsedPage === null ||
      parsedPageSize === null
    ) {
      return reply.code(400).send({
        error: 'invalid_query',
        details: {
          confidence:
            parsedConfidence && !parsedConfidence.success
              ? parsedConfidence.error.flatten()
              : undefined,
          sort:
            parsedSortKey &&
            !evaluationSortKeyValues.includes(
              parsedSortKey as (typeof evaluationSortKeyValues)[number],
            )
              ? [`sort must be one of ${evaluationSortKeyValues.join(', ')}`]
              : [],
          dir:
            parsedSortDirection &&
            !evaluationSortDirectionValues.includes(
              parsedSortDirection as (typeof evaluationSortDirectionValues)[number],
            )
              ? [
                  `dir must be one of ${evaluationSortDirectionValues.join(', ')}`,
                ]
              : [],
          page: parsedPage === null ? ['page must be a positive integer'] : [],
          pageSize:
            parsedPageSize === null
              ? ['pageSize must be a positive integer']
              : [],
        },
      });
    }

    return withSpan(
      'evaluation.list',
      () =>
        app.evaluationRepository.listEvaluations({
          confidenceLevel: parsedConfidence?.success
            ? parsedConfidence.data
            : undefined,
          searchQuery: query.q,
          sortKey: parsedSortKey as
            | 'created_at'
            | 'confidence_level'
            | 'case_id'
            | undefined,
          sortDirection: parsedSortDirection as 'asc' | 'desc' | undefined,
          page: parsedPage ?? undefined,
          pageSize: parsedPageSize ?? undefined,
        }),
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
