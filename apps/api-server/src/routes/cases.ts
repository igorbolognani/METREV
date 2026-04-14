import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { createAuditRecord } from '@metrev/audit';
import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import {
  evaluationResponseSchema,
  normalizeCaseInput,
  rawCaseInputSchema,
  validateDecisionOutputContract,
} from '@metrev/domain-contracts';
import { generateNarrative } from '@metrev/llm-adapter';
import { runCaseEvaluation } from '@metrev/rule-engine';
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
      actor = requireRole(request.actor, 'ANALYST');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return replyForAuthorizationError(request, reply, error, 'ANALYST');
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

    const evaluation = await withSpan(
      'case.evaluate',
      async () => {
        const normalizedCase = normalizeCaseInput(parsed.data);
        const decisionOutput = runCaseEvaluation(normalizedCase);
        const validation = validateDecisionOutputContract({
          decisionOutput,
          environment: process.env.NODE_ENV,
          logger: (issue) => {
            app.log.warn(
              {
                field: issue.field,
                received_value: issue.received,
                expected: issue.expected,
                source_state: issue.source_state,
                missing_behavior: issue.missing_behavior,
              },
              'decision_output_contract_validation_issue',
            );
          },
        });
        const reviewedDecisionOutput =
          validation.decisionOutput ?? decisionOutput;
        const narrativeResult = await generateNarrative({
          decisionOutput: reviewedDecisionOutput,
          normalizedCase,
        });
        const auditRecord = createAuditRecord({
          actorRole: actor.role,
          actorId: actor.userId,
          decisionOutput: reviewedDecisionOutput,
          normalizedCase,
          rawInput: parsed.data,
        });

        return evaluationResponseSchema.parse({
          evaluation_id: randomUUID(),
          case_id: normalizedCase.case_id,
          normalized_case: normalizedCase,
          decision_output: reviewedDecisionOutput,
          audit_record: auditRecord,
          narrative: narrativeResult.narrative,
          narrative_metadata: narrativeResult.narrativeMetadata,
        });
      },
      {
        actor_id: actor.userId,
        role: actor.role,
        session_id: actor.sessionId,
      },
    );

    await withSpan(
      'case.evaluation.persist',
      () => app.evaluationRepository.saveEvaluation(evaluation),
      {
        case_id: evaluation.case_id,
        evaluation_id: evaluation.evaluation_id,
      },
    );
    return reply.code(201).send(evaluation);
  });
}
