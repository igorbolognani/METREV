import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import {
  addResearchColumnRequestSchema,
  createResearchEvidencePackRequestSchema,
  createResearchReviewRequestSchema,
  runResearchExtractionsRequestSchema,
  runResearchExtractionsResponseSchema,
} from '@metrev/domain-contracts';
import {
  DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
  buildDecisionIngestionPreview,
  buildResearchEvidencePack,
  getDefaultResearchColumns,
  runDeterministicResearchExtraction,
} from '@metrev/research-intelligence';
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

function requireAnalyst(
  request: FastifyRequest,
  reply: FastifyReply,
): { userId: string; role: string } | undefined {
  try {
    return requireRole(request.actor, 'ANALYST');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      void replyForAuthorizationError(request, reply, error, 'ANALYST');
      return undefined;
    }

    throw error;
  }
}

export async function registerResearchRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get('/reviews', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const response = await withSpan(
      'research.reviews.list',
      () => app.researchRepository.listResearchReviews(),
      { actor_id: actor.userId },
    );

    return reply.send(response);
  });

  app.post('/reviews', async (request, reply) => {
    const actor = requireAnalyst(request, reply);
    if (!actor) {
      return reply;
    }

    const parsed = createResearchReviewRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    const review = await withSpan(
      'research.reviews.create',
      () =>
        app.researchRepository.createResearchReview({
          ...parsed.data,
          actorId: actor.userId,
          columns: getDefaultResearchColumns(),
          extractorVersion: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
        }),
      {
        actor_id: actor.userId,
        query: parsed.data.query,
      },
    );

    return reply.code(201).send(review);
  });

  app.get('/reviews/:reviewId', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const { reviewId } = request.params as { reviewId: string };
    const review = await withSpan(
      'research.reviews.get',
      () => app.researchRepository.getResearchReview(reviewId),
      {
        actor_id: actor.userId,
        review_id: reviewId,
      },
    );

    if (!review) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Research review ${reviewId} was not found.`,
      });
    }

    return reply.send(review);
  });

  app.post('/reviews/:reviewId/columns', async (request, reply) => {
    const actor = requireAnalyst(request, reply);
    if (!actor) {
      return reply;
    }

    const parsed = addResearchColumnRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    const { reviewId } = request.params as { reviewId: string };
    const review = await withSpan(
      'research.reviews.add_column',
      () =>
        app.researchRepository.addResearchReviewColumn({
          reviewId,
          column: parsed.data,
          extractorVersion: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
        }),
      {
        actor_id: actor.userId,
        review_id: reviewId,
        column_id: parsed.data.column_id,
      },
    );

    if (!review) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Research review ${reviewId} was not found.`,
      });
    }

    return reply.send(review);
  });

  app.post('/reviews/:reviewId/extractions/run', async (request, reply) => {
    const actor = requireAnalyst(request, reply);
    if (!actor) {
      return reply;
    }

    const parsed = runResearchExtractionsRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    const { reviewId } = request.params as { reviewId: string };
    const review = await app.researchRepository.getResearchReview(reviewId);
    if (!review) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Research review ${reviewId} was not found.`,
      });
    }

    const jobs = await withSpan(
      'research.extractions.claim',
      () =>
        app.researchRepository.claimQueuedResearchExtractionJobs({
          reviewId,
          limit: parsed.data.limit,
          columnIds: parsed.data.column_ids,
          paperIds: parsed.data.paper_ids,
        }),
      {
        actor_id: actor.userId,
        review_id: reviewId,
      },
    );
    const results = [];
    let completed = 0;
    let failed = 0;

    for (const job of jobs) {
      const result = runDeterministicResearchExtraction({
        reviewId,
        paper: job.paper,
        column: job.column,
        claims: job.claims,
      });
      const saved = await app.researchRepository.saveResearchExtractionResult({
        jobId: job.job.job_id,
        result,
      });
      results.push(saved);
      if (saved.status === 'valid') {
        completed += 1;
      } else {
        failed += 1;
      }
    }

    return reply.send(
      runResearchExtractionsResponseSchema.parse({
        review_id: reviewId,
        attempted: jobs.length,
        completed,
        failed,
        results,
      }),
    );
  });

  app.post('/reviews/:reviewId/evidence-pack', async (request, reply) => {
    const actor = requireAnalyst(request, reply);
    if (!actor) {
      return reply;
    }

    const parsed = createResearchEvidencePackRequestSchema.safeParse(
      request.body ?? {},
    );
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    const { reviewId } = request.params as { reviewId: string };
    const review = await app.researchRepository.getResearchReview(reviewId);
    if (!review) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Research review ${reviewId} was not found.`,
      });
    }

    const pack = buildResearchEvidencePack({
      packId: randomUUID(),
      review,
      title: parsed.data.title,
      status: parsed.data.status,
    });
    const decisionInput = buildDecisionIngestionPreview(pack);
    const savedPack = await withSpan(
      'research.evidence_pack.create',
      () =>
        app.researchRepository.createResearchEvidencePack({
          pack,
          decisionInput,
        }),
      {
        actor_id: actor.userId,
        review_id: reviewId,
      },
    );

    return reply.code(201).send(savedPack);
  });

  app.get('/evidence-packs/:packId/decision-input', async (request, reply) => {
    const actor = requireViewer(request, reply);
    if (!actor) {
      return reply;
    }

    const { packId } = request.params as { packId: string };
    const decisionInput =
      await app.researchRepository.getResearchEvidencePackDecisionInput(packId);

    if (!decisionInput) {
      return reply.code(404).send({
        error: 'not_found',
        message: `Research evidence pack ${packId} was not found.`,
      });
    }

    return reply.send(decisionInput);
  });
}
