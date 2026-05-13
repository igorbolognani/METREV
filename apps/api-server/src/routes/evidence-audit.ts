import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import {
  acquisitionStatusResponseSchema,
  discoveryStatusResponseSchema,
  evidenceQualityAuditRequestSchema,
  evidenceQualityAuditResponseSchema,
  type NormalizedCaseInput,
} from '@metrev/domain-contracts';
import { runEvidenceQualityAudit } from '@metrev/evidence-audit';
import { runEvidenceDiscovery } from '@metrev/evidence-discovery';
import { withSpan } from '@metrev/telemetry';

const rateLimitedRouteOptions = {
  config: {
    rateLimit: {},
  },
};

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

async function collectGoldenCases(
  app: FastifyInstance,
): Promise<NormalizedCaseInput[]> {
  const evaluationList = await app.evaluationRepository.listEvaluations({
    page: 1,
    pageSize: 50,
  });
  const evaluations = await Promise.all(
    evaluationList.items.map((item) =>
      app.evaluationRepository.getEvaluation(item.evaluation_id),
    ),
  );

  return evaluations.flatMap((evaluation) =>
    evaluation ? [evaluation.normalized_case] : [],
  );
}

export async function registerEvidenceAuditRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    '/quality-report',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ANALYST');
        }

        throw error;
      }

      const report =
        await app.evidenceAuditRepository.getLatestEvidenceQualityAuditReport();

      if (!report) {
        return reply.code(404).send({
          error: 'evidence_quality_report_not_found',
          message: 'No evidence quality audit report has been generated yet.',
        });
      }

      return reply.send(evidenceQualityAuditResponseSchema.parse({ report }));
    },
  );

  app.get(
    '/quality-reports',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ANALYST');
        }

        throw error;
      }

      const query = request.query as { limit?: string };
      const limit = parsePositiveInteger(query.limit, 20);
      if (limit === null || limit > 100) {
        return reply.code(400).send({
          error: 'invalid_limit',
          message: 'limit must be a positive integer no greater than 100.',
        });
      }

      const reports =
        await app.evidenceAuditRepository.listEvidenceQualityAuditReports(
          limit,
        );

      return reply.send({ items: reports });
    },
  );

  app.get(
    '/quality-report/:reportId',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ANALYST');
        }

        throw error;
      }

      const params = request.params as { reportId?: string };
      if (!params.reportId?.trim()) {
        return reply.code(400).send({
          error: 'invalid_report_id',
          message: 'reportId is required.',
        });
      }

      const report =
        await app.evidenceAuditRepository.getEvidenceQualityAuditReport(
          params.reportId,
        );

      if (!report) {
        return reply.code(404).send({
          error: 'evidence_quality_report_not_found',
          message: `Evidence quality audit report ${params.reportId} was not found.`,
        });
      }

      return reply.send(evidenceQualityAuditResponseSchema.parse({ report }));
    },
  );

  app.post(
    '/quality-report',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ADMIN');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ADMIN');
        }

        throw error;
      }

      const parsed = evidenceQualityAuditRequestSchema.safeParse(
        request.body ?? {},
      );
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid_input',
          details: parsed.error.flatten(),
        });
      }

      const goldenCases = parsed.data.include_golden_cases
        ? await collectGoldenCases(app)
        : [];
      const report = await withSpan(
        'evidence_intelligence.quality_audit',
        () =>
          runEvidenceQualityAudit({
            repository: app.evidenceAuditRepository,
            triggerMode: parsed.data.trigger_mode,
            goldenCases,
          }),
        {
          trigger_mode: parsed.data.trigger_mode,
          golden_case_count: goldenCases.length,
        },
      );

      return reply
        .code(201)
        .send(evidenceQualityAuditResponseSchema.parse({ report }));
    },
  );

  app.post(
    '/discovery/run',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ADMIN');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ADMIN');
        }

        throw error;
      }

      const query = request.query as {
        maxQueries?: string;
        maxAcquisitionAttempts?: string;
      };
      const maxQueries = parsePositiveInteger(query.maxQueries, 20);
      const maxAcquisitionAttempts = parsePositiveInteger(
        query.maxAcquisitionAttempts,
        50,
      );
      if (
        maxQueries === null ||
        maxQueries > 50 ||
        maxAcquisitionAttempts === null ||
        maxAcquisitionAttempts > 200
      ) {
        return reply.code(400).send({
          error: 'invalid_discovery_limits',
          message:
            'maxQueries must be 1-50 and maxAcquisitionAttempts must be 1-200.',
        });
      }

      const auditReport =
        await app.evidenceAuditRepository.getLatestEvidenceQualityAuditReport();
      if (!auditReport) {
        return reply.code(404).send({
          error: 'evidence_quality_report_not_found',
          message: 'Run an evidence quality audit before discovery.',
        });
      }

      const summary = await withSpan(
        'evidence_intelligence.discovery',
        () =>
          runEvidenceDiscovery({
            repository: app.evidenceAuditRepository,
            researchRepository: app.researchRepository,
            auditReport,
            maxQueries,
            maxAcquisitionAttempts,
          }),
        {
          audit_report_id: auditReport.report_id,
          max_queries: maxQueries,
        },
      );

      return reply.code(202).send({ summary });
    },
  );

  app.get(
    '/discovery/status',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ANALYST');
        }

        throw error;
      }

      const query = request.query as { limit?: string };
      const limit = parsePositiveInteger(query.limit, 25);
      if (limit === null || limit > 100) {
        return reply.code(400).send({
          error: 'invalid_limit',
          message: 'limit must be a positive integer no greater than 100.',
        });
      }

      const status =
        await app.evidenceAuditRepository.getDiscoveryStatusSummary(limit);

      return reply.send(discoveryStatusResponseSchema.parse(status));
    },
  );

  app.get(
    '/discovery/targets',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ANALYST');
        }

        throw error;
      }

      const query = request.query as { limit?: string };
      const limit = parsePositiveInteger(query.limit, 50);
      if (limit === null || limit > 100) {
        return reply.code(400).send({
          error: 'invalid_limit',
          message: 'limit must be a positive integer no greater than 100.',
        });
      }

      const targets =
        await app.evidenceAuditRepository.listDiscoveryTargets(limit);

      return reply.send({ items: targets });
    },
  );

  app.get(
    '/acquisition/status',
    rateLimitedRouteOptions,
    async (request, reply) => {
      try {
        requireRole(request.actor, 'ANALYST');
      } catch (error) {
        if (error instanceof AuthorizationError) {
          return replyForAuthorizationError(request, reply, error, 'ANALYST');
        }

        throw error;
      }

      const query = request.query as { limit?: string };
      const limit = parsePositiveInteger(query.limit, 25);
      if (limit === null || limit > 100) {
        return reply.code(400).send({
          error: 'invalid_limit',
          message: 'limit must be a positive integer no greater than 100.',
        });
      }

      const status =
        await app.evidenceAuditRepository.getAcquisitionStatusSummary(limit);

      return reply.send(acquisitionStatusResponseSchema.parse(status));
    },
  );
}
