import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import { withSpan } from '@metrev/telemetry';

import {
  buildEvaluationWorkspace,
  buildRuntimeVersions,
  serializeEvaluationCsv,
} from '../presenters/workspace-presenters';

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

function buildVersions(input?: {
  promptVersion?: string | null;
  modelVersion?: string | null;
}) {
  return buildRuntimeVersions({
    promptVersion: input?.promptVersion?.trim() || 'not_applicable',
    modelVersion: input?.modelVersion?.trim() || 'not_applicable',
  });
}

export async function registerExportRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get('/evaluations/:evaluationId/json', async (request, reply) => {
    try {
      requireRole(request.actor, 'VIEWER');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'VIEWER');
      }

      throw error;
    }

    const { evaluationId } = request.params as { evaluationId: string };
    const evaluation = await withSpan(
      'export.evaluation.json',
      () => app.evaluationRepository.getEvaluation(evaluationId),
      {
        evaluation_id: evaluationId,
        actor_id: request.actor?.userId ?? 'anonymous',
      },
    );

    if (!evaluation) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Evaluation ${evaluationId} was not found.`,
      });
    }

    const history = await app.evaluationRepository.getCaseHistory(evaluation.case_id);
    const versions = buildVersions({
      promptVersion: evaluation.narrative_metadata.prompt_version,
      modelVersion:
        evaluation.simulation_enrichment?.model_version ??
        evaluation.narrative_metadata.model,
    });
    const workspace = buildEvaluationWorkspace({
      evaluation,
      history,
      versions,
    });

    reply.header(
      'content-disposition',
      `attachment; filename="${evaluation.case_id}-${evaluation.evaluation_id}.json"`,
    );

    return reply.send(workspace);
  });

  app.get('/evaluations/:evaluationId/csv', async (request, reply) => {
    try {
      requireRole(request.actor, 'VIEWER');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'VIEWER');
      }

      throw error;
    }

    const { evaluationId } = request.params as { evaluationId: string };
    const evaluation = await withSpan(
      'export.evaluation.csv',
      () => app.evaluationRepository.getEvaluation(evaluationId),
      {
        evaluation_id: evaluationId,
        actor_id: request.actor?.userId ?? 'anonymous',
      },
    );

    if (!evaluation) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Evaluation ${evaluationId} was not found.`,
      });
    }

    const { metadata, content } = serializeEvaluationCsv({
      evaluation,
      versions: buildVersions({
        promptVersion: evaluation.narrative_metadata.prompt_version,
        modelVersion:
          evaluation.simulation_enrichment?.model_version ??
          evaluation.narrative_metadata.model,
      }),
    });

    reply.header('content-type', metadata.content_type);
    reply.header(
      'content-disposition',
      `attachment; filename="${metadata.file_name}"`,
    );
    reply.header('x-metrev-export-generated-at', metadata.generated_at);
    reply.header(
      'x-metrev-workspace-schema-version',
      metadata.versions.workspace_schema_version,
    );

    return reply.send(content);
  });
}
