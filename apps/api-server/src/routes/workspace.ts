import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import { generateEvidenceAssistantBrief } from '@metrev/llm-adapter';
import { withSpan } from '@metrev/telemetry';

import {
  buildEvidenceExplorerAssistantResponse,
  buildCaseHistoryWorkspace,
  buildDashboardWorkspace,
  buildEvidenceExplorerWorkspace,
  buildEvaluationComparison,
  buildEvaluationWorkspace,
  buildEvidenceReviewWorkspace,
  buildPrintableEvaluationReport,
  buildRuntimeVersions,
} from '../presenters/workspace-presenters';
import { parseExternalEvidenceListQuery } from './external-evidence-query';

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

function requireViewer(
  request: FastifyRequest,
  reply: FastifyReply,
): { userId: string; role: string } | undefined {
  try {
    return requireRole(request.actor, 'VIEWER');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      void replyForAuthorizationError(request, reply, error, 'VIEWER');
      return undefined;
    }

    throw error;
  }
}

function buildVersionsFromEvaluation(input?: {
  narrativePromptVersion?: string | null;
  modelVersion?: string | null;
}) {
  return buildRuntimeVersions({
    promptVersion: input?.narrativePromptVersion?.trim() || 'not_applicable',
    modelVersion: input?.modelVersion?.trim() || 'not_applicable',
  });
}

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get('/dashboard', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const [evaluationList, evidenceCatalog] = await withSpan(
      'workspace.dashboard',
      () =>
        Promise.all([
          app.evaluationRepository.listEvaluations(),
          app.evaluationRepository.listExternalEvidenceCatalog(),
        ]),
      {
        actor_id: actor.userId,
      },
    );

    return reply.send(
      buildDashboardWorkspace({
        evaluationList,
        evidenceCatalog,
        versions: buildVersionsFromEvaluation(),
      }),
    );
  });

  app.get('/evaluations/:evaluationId', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const { evaluationId } = request.params as { evaluationId: string };
    const evaluation = await withSpan(
      'workspace.evaluation.get',
      () => app.evaluationRepository.getEvaluation(evaluationId),
      {
        evaluation_id: evaluationId,
        actor_id: actor.userId,
      },
    );

    if (!evaluation) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Evaluation ${evaluationId} was not found.`,
      });
    }

    const history = await app.evaluationRepository.getCaseHistory(
      evaluation.case_id,
    );

    return reply.send(
      buildEvaluationWorkspace({
        evaluation,
        history,
        versions: buildVersionsFromEvaluation({
          narrativePromptVersion: evaluation.narrative_metadata.prompt_version,
          modelVersion:
            evaluation.simulation_enrichment?.model_version ??
            evaluation.narrative_metadata.model,
        }),
      }),
    );
  });

  app.get('/cases/:caseId/history', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const { caseId } = request.params as { caseId: string };
    const history = await withSpan(
      'workspace.case_history.get',
      () => app.evaluationRepository.getCaseHistory(caseId),
      {
        case_id: caseId,
        actor_id: actor.userId,
      },
    );

    if (!history) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Case ${caseId} was not found.`,
      });
    }

    const latestEvaluation = history.evaluations
      .slice()
      .sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      )[0];
    const currentEvaluation = latestEvaluation
      ? await app.evaluationRepository.getEvaluation(
          latestEvaluation.evaluation_id,
        )
      : null;

    return reply.send(
      buildCaseHistoryWorkspace({
        history,
        currentEvaluation,
        currentEvaluationId: currentEvaluation?.evaluation_id,
        versions: buildVersionsFromEvaluation({
          narrativePromptVersion:
            currentEvaluation?.narrative_metadata.prompt_version,
          modelVersion:
            currentEvaluation?.simulation_enrichment?.model_version ??
            currentEvaluation?.narrative_metadata.model,
        }),
      }),
    );
  });

  app.get(
    '/evaluations/:evaluationId/compare/:baselineEvaluationId',
    async (request, reply) => {
      const actor = requireViewer(request, reply);
      if (!actor) {
        return reply;
      }

      const { evaluationId, baselineEvaluationId } = request.params as {
        evaluationId: string;
        baselineEvaluationId: string;
      };

      const [current, baseline] = await withSpan(
        'workspace.evaluation.compare',
        () =>
          Promise.all([
            app.evaluationRepository.getEvaluation(evaluationId),
            app.evaluationRepository.getEvaluation(baselineEvaluationId),
          ]),
        {
          evaluation_id: evaluationId,
          baseline_evaluation_id: baselineEvaluationId,
          actor_id: actor.userId,
        },
      );

      if (!current || !baseline) {
        return reply.code(404).send({
          error: 'not_found',
          message: 'One of the requested evaluations was not found.',
        });
      }

      if (current.case_id !== baseline.case_id) {
        return reply.code(400).send({
          error: 'invalid_comparison',
          message: 'Only evaluations from the same case can be compared.',
        });
      }

      return reply.send(
        buildEvaluationComparison({
          current,
          baseline,
          versions: buildVersionsFromEvaluation({
            narrativePromptVersion: current.narrative_metadata.prompt_version,
            modelVersion:
              current.simulation_enrichment?.model_version ??
              current.narrative_metadata.model,
          }),
        }),
      );
    },
  );

  app.get('/evidence/review', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const query = request.query as {
      status?: string;
      q?: string;
      sourceType?: string;
      page?: string;
      pageSize?: string;
    };
    const parsedQuery = parseExternalEvidenceListQuery(query);

    if (!parsedQuery.success) {
      return reply.code(400).send({
        error: 'invalid_query',
        details: parsedQuery.details,
      });
    }

    const parsed = parsedQuery.value;

    const evidenceCatalog = await withSpan(
      'workspace.evidence_review',
      () =>
        app.evaluationRepository.listExternalEvidenceCatalog({
          reviewStatus: parsed.status,
          searchQuery: parsed.query,
          sourceType: parsed.sourceType,
          page: parsed.page,
          pageSize: parsed.pageSize,
        }),
      {
        actor_id: actor.userId,
        review_status: parsed.status ?? 'all',
        source_type: parsed.sourceType ?? 'all',
      },
    );

    return reply.send(
      buildEvidenceReviewWorkspace({
        evidenceCatalog,
        versions: buildVersionsFromEvaluation(),
        filters: {
          status: parsed.status,
          query: parsed.query,
        },
      }),
    );
  });

  app.get('/evidence/explorer', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const query = request.query as {
      status?: string;
      q?: string;
      sourceType?: string;
      page?: string;
      pageSize?: string;
    };
    const parsedQuery = parseExternalEvidenceListQuery(query);

    if (!parsedQuery.success) {
      return reply.code(400).send({
        error: 'invalid_query',
        details: parsedQuery.details,
      });
    }

    const parsed = parsedQuery.value;
    const evidenceCatalog = await withSpan(
      'workspace.evidence_explorer',
      () =>
        app.evaluationRepository.listExternalEvidenceCatalog({
          reviewStatus: parsed.status,
          searchQuery: parsed.query,
          sourceType: parsed.sourceType,
          page: parsed.page,
          pageSize: parsed.pageSize,
        }),
      {
        actor_id: actor.userId,
        review_status: parsed.status ?? 'all',
        source_type: parsed.sourceType ?? 'all',
      },
    );

    return reply.send(
      buildEvidenceExplorerWorkspace({
        evidenceCatalog,
        versions: buildVersionsFromEvaluation(),
        filters: {
          status: parsed.status,
          query: parsed.query,
          sourceType: parsed.sourceType,
          page: parsed.page,
          pageSize: parsed.pageSize,
        },
      }),
    );
  });

  app.get('/evidence/explorer/assistant', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const query = request.query as {
      status?: string;
      q?: string;
      sourceType?: string;
      page?: string;
      pageSize?: string;
    };
    const parsedQuery = parseExternalEvidenceListQuery(query);

    if (!parsedQuery.success) {
      return reply.code(400).send({
        error: 'invalid_query',
        details: parsedQuery.details,
      });
    }

    const parsed = parsedQuery.value;
    const evidenceCatalog = await withSpan(
      'workspace.evidence_explorer_assistant.catalog',
      () =>
        app.evaluationRepository.listExternalEvidenceCatalog({
          reviewStatus: parsed.status,
          searchQuery: parsed.query,
          sourceType: parsed.sourceType,
          page: parsed.page,
          pageSize: parsed.pageSize,
        }),
      {
        actor_id: actor.userId,
        review_status: parsed.status ?? 'all',
        source_type: parsed.sourceType ?? 'all',
      },
    );

    const assistantResult = await withSpan(
      'workspace.evidence_explorer_assistant.generate',
      () =>
        generateEvidenceAssistantBrief({
          reviewStatus: parsed.status,
          searchQuery: parsed.query,
          sourceType: parsed.sourceType,
          warehouseSnapshot: evidenceCatalog.warehouse_aggregate.snapshot,
          spotlight: evidenceCatalog.items.slice(0, 3),
        }),
      {
        actor_id: actor.userId,
        filtered_total: evidenceCatalog.summary.filtered_total,
      },
    );

    return reply.send(
      buildEvidenceExplorerAssistantResponse({
        evidenceCatalog,
        narrative: assistantResult.narrative,
        narrativeMetadata: assistantResult.narrativeMetadata,
        versions: buildVersionsFromEvaluation({
          narrativePromptVersion:
            assistantResult.narrativeMetadata.prompt_version,
          modelVersion: assistantResult.narrativeMetadata.model,
        }),
        filters: {
          status: parsed.status,
          query: parsed.query,
          sourceType: parsed.sourceType,
          page: parsed.page,
          pageSize: parsed.pageSize,
        },
      }),
    );
  });

  app.get('/evaluations/:evaluationId/report', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const { evaluationId } = request.params as { evaluationId: string };
    const evaluation = await withSpan(
      'workspace.report.get',
      () => app.evaluationRepository.getEvaluation(evaluationId),
      {
        evaluation_id: evaluationId,
        actor_id: actor.userId,
      },
    );

    if (!evaluation) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Evaluation ${evaluationId} was not found.`,
      });
    }

    return reply.send(
      buildPrintableEvaluationReport({
        evaluation,
        versions: buildVersionsFromEvaluation({
          narrativePromptVersion: evaluation.narrative_metadata.prompt_version,
          modelVersion:
            evaluation.simulation_enrichment?.model_version ??
            evaluation.narrative_metadata.model,
        }),
      }),
    );
  });
}
