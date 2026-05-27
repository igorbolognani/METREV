import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthorizationError, requireRole, type Role } from '@metrev/auth';
import {
    addResearchColumnRequestSchema,
    createResearchEvidencePackRequestSchema,
    createResearchReviewRequestSchema,
    localSourceImportRequestSchema,
    researchWarehouseEligibilityRequestSchema,
    researchWarehouseProgressResponseSchema,
    runResearchExtractionsRequestSchema,
    runResearchExtractionsResponseSchema,
    searchResearchPapersRequestSchema,
    stageResearchPapersRequestSchema,
} from '@metrev/domain-contracts';
import {
    DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
    buildDecisionIngestionPreview,
    buildResearchEvidencePack,
    executeResearchExtraction,
    getDefaultResearchColumns,
    hydrateResearchPaperText,
    type HydratedResearchPaperText,
} from '@metrev/research-intelligence';
import { withSpan } from '@metrev/telemetry';

import { buildRuntimeVersions } from '../presenters/workspace-presenters';

const rateLimitedRouteOptions = {
  config: {
    rateLimit: {},
  },
};

const RESEARCH_EVIDENCE_PACK_PROMPT_VERSION = 'research-evidence-pack-v1';

function collapseExtractorVersions(
  results: Array<{ extractor_version: string }>,
): string | null {
  const unique = [
    ...new Set(
      results
        .map((result) => result.extractor_version?.trim())
        .filter((version): version is string => Boolean(version)),
    ),
  ];

  if (unique.length === 0) {
    return null;
  }

  if (unique.length === 1) {
    return unique[0];
  }

  return `mixed(${unique.join(',')})`;
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

function countBucketValue(
  buckets: Array<{ count: number; value: string }>,
  value: string,
) {
  return buckets.find((bucket) => bucket.value === value)?.count ?? 0;
}

async function reconcileDefaultColumns(
  app: FastifyInstance,
  review: Awaited<
    ReturnType<FastifyInstance['researchRepository']['getResearchReview']>
  >,
) {
  if (!review) {
    return null;
  }

  const currentColumnIds = new Set(
    review.columns.map((column) => column.column_id),
  );
  const missingDefaults = getDefaultResearchColumns()
    .filter((column) => !currentColumnIds.has(column.column_id))
    .sort((left, right) => left.position - right.position);

  if (missingDefaults.length === 0) {
    return review;
  }

  let currentReview = review;
  for (const column of missingDefaults) {
    const updated = await app.researchRepository.addResearchReviewColumn({
      reviewId: currentReview.review_id,
      column,
      extractorVersion: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
    });

    if (!updated) {
      break;
    }

    currentReview = updated;
  }

  return currentReview;
}

function buildResearchWarehouseProgress(input: {
  backfills: Awaited<
    ReturnType<FastifyInstance['researchRepository']['listResearchBackfills']>
  >['items'];
  warehouse: Awaited<
    ReturnType<
      FastifyInstance['evaluationRepository']['listExternalEvidenceCatalog']
    >
  >;
}) {
  const targetRecords = input.backfills.reduce(
    (total, backfill) => total + backfill.target_records,
    0,
  );
  const fetchedRecords = input.backfills.reduce(
    (total, backfill) => total + backfill.records_fetched,
    0,
  );
  const storedRecords = input.warehouse.summary.total;
  const lastUpdatedAt =
    [...input.backfills]
      .map((backfill) => backfill.updated_at)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

  return researchWarehouseProgressResponseSchema.parse({
    target_records: targetRecords,
    stored_records: storedRecords,
    fetched_records: fetchedRecords,
    records_remaining: Math.max(targetRecords - storedRecords, 0),
    completion_ratio:
      targetRecords > 0 ? Math.min(storedRecords / targetRecords, 1) : 0,
    pending_records: input.warehouse.summary.pending,
    accepted_records: input.warehouse.summary.accepted,
    rejected_records: input.warehouse.summary.rejected,
    high_quality_records: countBucketValue(
      input.warehouse.warehouse_aggregate.facets.metadata_quality_levels,
      'high',
    ),
    linked_document_records:
      input.warehouse.warehouse_aggregate.snapshot.linked_source_count,
    pdf_records: 0,
    xml_records: 0,
    queued_backfills: input.backfills.filter(
      (backfill) => backfill.status === 'queued',
    ).length,
    running_backfills: input.backfills.filter(
      (backfill) => backfill.status === 'running',
    ).length,
    completed_backfills: input.backfills.filter(
      (backfill) => backfill.status === 'completed',
    ).length,
    failed_backfills: input.backfills.filter(
      (backfill) => backfill.status === 'failed',
    ).length,
    source_breakdown:
      input.warehouse.warehouse_aggregate.facets.source_types.map((bucket) => ({
        key: bucket.value,
        label: bucket.label,
        count: bucket.count,
      })),
    metadata_quality_levels:
      input.warehouse.warehouse_aggregate.facets.metadata_quality_levels.map(
        (bucket) => ({
          key: bucket.value,
          label: bucket.label,
          count: bucket.count,
        }),
      ),
    veracity_levels:
      input.warehouse.warehouse_aggregate.facets.veracity_levels.map(
        (bucket) => ({
          key: bucket.value,
          label: bucket.label,
          count: bucket.count,
        }),
      ),
    last_updated_at: lastUpdatedAt,
  });
}

export async function registerResearchRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post('/search', rateLimitedRouteOptions, async (request, reply) => {
    const actor = requireAnalyst(request, reply);
    if (!actor) {
      return reply;
    }

    const parsed = searchResearchPapersRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_input',
        details: parsed.error.flatten(),
      });
    }

    const response = await withSpan(
      'research.search',
      () => app.researchRepository.searchResearchPapers(parsed.data),
      {
        actor_id: actor.userId,
        query: parsed.data.query,
      },
    );

    return reply.send(response);
  });

  app.post(
    '/search/import',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const parsed = stageResearchPapersRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid_input',
          details: parsed.error.flatten(),
        });
      }

      const response = await withSpan(
        'research.search.import',
        () => app.researchRepository.stageResearchPapers(parsed.data),
        {
          actor_id: actor.userId,
          item_count: parsed.data.items.length,
          ...(parsed.data.query ? { query: parsed.data.query } : {}),
        },
      );

      return reply.code(201).send(response);
    },
  );

  app.post(
    '/source-artifacts/import',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const parsed = localSourceImportRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid_input',
          details: parsed.error.flatten(),
        });
      }

      const response = await withSpan(
        'research.source_artifacts.import',
        () => app.researchRepository.importLocalSources(parsed.data),
        {
          actor_id: actor.userId,
          file_count: parsed.data.files.length,
          manifest_path: parsed.data.manifest_path ?? '',
        },
      );

      return reply.code(201).send(response);
    },
  );

  app.get(
    '/source-artifacts/:sourceDocumentId',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const { sourceDocumentId } = request.params as {
        sourceDocumentId: string;
      };
      const artifact = await withSpan(
        'research.source_artifacts.get',
        () => app.researchRepository.getSourceArtifact(sourceDocumentId),
        {
          actor_id: actor.userId,
          source_document_id: sourceDocumentId,
        },
      );

      if (!artifact) {
        return reply.code(404).send({
          error: 'not_found',
          message: `Source artifact for ${sourceDocumentId} was not found.`,
        });
      }

      return reply.send(artifact);
    },
  );

  app.get('/reviews', rateLimitedRouteOptions, async (request, reply) => {
    const actor = requireAnalyst(request, reply);
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

  app.get('/backfills', rateLimitedRouteOptions, async (request, reply) => {
    const actor = requireAnalyst(request, reply);
    if (!actor) {
      return reply;
    }

    const response = await withSpan(
      'research.backfills.list',
      () => app.researchRepository.listResearchBackfills(),
      { actor_id: actor.userId },
    );

    return reply.send(response);
  });

  app.get(
    '/warehouse-progress',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const [backfills, warehouse] = await Promise.all([
        withSpan(
          'research.backfills.list',
          () => app.researchRepository.listResearchBackfills(),
          { actor_id: actor.userId },
        ),
        withSpan(
          'research.warehouse.summary',
          () =>
            app.evaluationRepository.listExternalEvidenceCatalog({
              page: 1,
              pageSize: 1,
            }),
          { actor_id: actor.userId },
        ),
      ]);

      return reply.send(
        buildResearchWarehouseProgress({
          backfills: backfills.items,
          warehouse,
        }),
      );
    },
  );

  app.get(
    '/warehouse-eligibility',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const query = request.query as Record<string, unknown>;
      const parsed = researchWarehouseEligibilityRequestSchema.safeParse({
        ...query,
        dry_run: true,
        include_items: query.include_items !== 'false',
        limit:
          typeof query.limit === 'string' ? Number(query.limit) : query.limit,
      });
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid_input',
          details: parsed.error.flatten(),
        });
      }

      const response = await withSpan(
        'research.warehouse.eligibility',
        () =>
          app.researchRepository.listResearchWarehouseEligibility(parsed.data),
        { actor_id: actor.userId },
      );

      return reply.send(response);
    },
  );

  app.post(
    '/warehouse-eligibility/sweep',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const parsed = researchWarehouseEligibilityRequestSchema.safeParse(
        request.body ?? {},
      );
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid_input',
          details: parsed.error.flatten(),
        });
      }

      const response = await withSpan(
        'research.warehouse.eligibility_sweep',
        () =>
          app.researchRepository.listResearchWarehouseEligibility(parsed.data),
        {
          actor_id: actor.userId,
          dry_run: parsed.data.dry_run,
        },
      );

      return reply.send(response);
    },
  );

  app.post('/backfills', rateLimitedRouteOptions, async (request, reply) => {
    const actor = requireAnalyst(request, reply);
    if (!actor) {
      return reply;
    }

    return reply.code(410).send({
      error: 'research_backfill_removed',
      message:
        'Research warehouse backfill queuing has been removed. Use curated search, staging, and review workflows for evidence intake.',
    });
  });

  app.post(
    '/backfills/presets',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      return reply.code(410).send({
        error: 'research_backfill_removed',
        message:
          'Research warehouse backfill presets have been removed. Use curated search, staging, and review workflows for evidence intake.',
      });
    },
  );

  app.post('/reviews', rateLimitedRouteOptions, async (request, reply) => {
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

  app.get(
    '/reviews/:reviewId',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
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

      const reconciledReview = await withSpan(
        'research.reviews.reconcile_defaults',
        () => reconcileDefaultColumns(app, review),
        {
          actor_id: actor.userId,
          review_id: reviewId,
        },
      );

      return reply.send(reconciledReview ?? review);
    },
  );

  app.post(
    '/reviews/:reviewId/columns',
    rateLimitedRouteOptions,
    async (request, reply) => {
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
    },
  );

  app.post(
    '/reviews/:reviewId/extractions/run',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const parsed = runResearchExtractionsRequestSchema.safeParse(
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
      const paperTextCache = new Map<
        string,
        Promise<HydratedResearchPaperText | null>
      >();

      for (const job of jobs) {
        const result = await executeResearchExtraction({
          reviewId,
          paper: job.paper,
          column: job.column,
          claims: job.claims,
          fetchPaperText: (paper) => {
            let cached = paperTextCache.get(paper.paper_id);
            if (!cached) {
              cached = hydrateResearchPaperText(paper);
              paperTextCache.set(paper.paper_id, cached);
            }

            return cached;
          },
        });
        const saved = await app.researchRepository.saveResearchExtractionResult(
          {
            jobId: job.job.job_id,
            result,
          },
        );
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
    },
  );

  app.post(
    '/reviews/:reviewId/evidence-pack',
    rateLimitedRouteOptions,
    async (request, reply) => {
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

      const packRuntimeVersions = buildRuntimeVersions({
        promptVersion: RESEARCH_EVIDENCE_PACK_PROMPT_VERSION,
        modelVersion: collapseExtractorVersions(review.extraction_results),
      });
      const pack = buildResearchEvidencePack({
        packId: randomUUID(),
        review,
        title: parsed.data.title,
        status: parsed.data.status,
        versions: packRuntimeVersions,
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
    },
  );

  app.get(
    '/evidence-packs/:packId/decision-input',
    rateLimitedRouteOptions,
    async (request, reply) => {
      const actor = requireAnalyst(request, reply);
      if (!actor) {
        return reply;
      }

      const { packId } = request.params as { packId: string };
      const decisionInput =
        await app.researchRepository.getResearchEvidencePackDecisionInput(
          packId,
        );

      if (!decisionInput) {
        return reply.code(404).send({
          error: 'not_found',
          message: `Research evidence pack ${packId} was not found.`,
        });
      }

      return reply.send(decisionInput);
    },
  );
}
