import {
    type EvidenceAuditRepository,
    type ResearchRepository,
} from '@metrev/database';
import { researchExtractionResultSchema } from '@metrev/domain-contracts';
import {
    processQueuedEvidenceDiscovery,
    runEvidenceDiscovery,
} from '@metrev/evidence-discovery';
import {
    RESEARCH_RUNTIME_EXTRACTOR_VERSION,
    executeResearchExtraction,
    hydrateResearchPaperText,
    type HydratedResearchPaperText,
} from '@metrev/research-intelligence';

export interface ResearchWorkerCycleResult {
  backfillsProcessed: number;
  evidenceAcquisitionAttempts: number;
  evidenceDiscoveryRecordsStaged: number;
  evidenceDiscoveryTargetsCreated: number;
  evidenceDiscoveryTargetsProcessed: number;
  extractionFailures: number;
  extractionJobsProcessed: number;
}

function createPaperTextCache() {
  const cache = new Map<string, Promise<HydratedResearchPaperText | null>>();

  return async function getPaperText(
    paperId: string,
    source: Parameters<typeof hydrateResearchPaperText>[0],
  ) {
    let cached = cache.get(paperId);
    if (!cached) {
      cached = hydrateResearchPaperText(source);
      cache.set(paperId, cached);
    }

    return cached;
  };
}

async function processBackfills(
  repository: ResearchRepository,
  limit: number,
): Promise<number> {
  const claimed = await repository.claimQueuedResearchBackfills(limit);
  let processed = 0;

  for (const backfill of claimed) {
    try {
      const search = await repository.searchResearchPapers({
        query: backfill.query,
        limit: backfill.per_provider_limit,
        page: backfill.next_page,
        providers: backfill.providers,
      });
      const staged = await repository.stageResearchPapers({
        query: backfill.query,
        items: search.items,
      });

      await repository.completeResearchBackfillPage({
        runId: backfill.run_id,
        nextPage: backfill.next_page + 1,
        pagesCompleted: backfill.pages_completed + 1,
        recordsFetchedDelta: search.items.length,
        recordsStoredDelta: staged.imported_count,
        failedProviders: search.failed_providers,
        isComplete: backfill.next_page >= backfill.max_pages,
      });
      processed += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown backfill failure';
      await repository.failResearchBackfill({
        runId: backfill.run_id,
        failureMessage: message,
      });
    }
  }

  return processed;
}

async function saveFailureResult(input: {
  errorMessage: string;
  jobId: string;
  repository: ResearchRepository;
  workItem: Awaited<
    ReturnType<ResearchRepository['claimQueuedResearchExtractionJobs']>
  >[number];
}) {
  await input.repository.saveResearchExtractionResult({
    jobId: input.jobId,
    result: researchExtractionResultSchema.parse({
      review_id: input.workItem.job.review_id,
      paper_id: input.workItem.paper.paper_id,
      column_id: input.workItem.column.column_id,
      status: 'invalid',
      answer: null,
      evidence_trace: [],
      confidence: 'low',
      missing_fields: [input.workItem.column.column_id],
      validation_errors: [input.errorMessage],
      normalized_payload: {},
      extractor_version: RESEARCH_RUNTIME_EXTRACTOR_VERSION,
    }),
  });
}

async function processExtractions(
  repository: ResearchRepository,
  limit: number,
): Promise<{ failures: number; processed: number }> {
  const reviews = await repository.listResearchReviews();
  const getPaperText = createPaperTextCache();
  let processed = 0;
  let failures = 0;

  for (const review of reviews.items) {
    if (processed >= limit) {
      break;
    }

    const workItems = await repository.claimQueuedResearchExtractionJobs({
      reviewId: review.review_id,
      limit: limit - processed,
    });

    for (const workItem of workItems) {
      try {
        const result = await executeResearchExtraction({
          reviewId: review.review_id,
          paper: workItem.paper,
          column: workItem.column,
          claims: workItem.claims,
          fetchPaperText: (paper) => getPaperText(paper.paper_id, paper),
        });
        await repository.saveResearchExtractionResult({
          jobId: workItem.job.job_id,
          result,
        });
        processed += 1;
        if (result.status !== 'valid') {
          failures += 1;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown extraction failure';
        await saveFailureResult({
          errorMessage: message,
          jobId: workItem.job.job_id,
          repository,
          workItem,
        });
        processed += 1;
        failures += 1;
      }
    }
  }

  return { failures, processed };
}

async function processEvidenceDiscovery(input: {
  autoRunWithoutTargets: boolean;
  evidenceAuditRepository: EvidenceAuditRepository;
  maxAcquisitionAttempts: number;
  maxTargets: number;
  researchRepository: ResearchRepository;
}) {
  const latestReport =
    await input.evidenceAuditRepository.getLatestEvidenceQualityAuditReport();
  const latestReportTargets = latestReport
    ? (await input.evidenceAuditRepository.listDiscoveryTargets(100)).filter(
        (target) => target.audit_report_id === latestReport.report_id,
      )
    : [];

  if (
    latestReport &&
    latestReportTargets.length === 0 &&
    input.autoRunWithoutTargets
  ) {
    return runEvidenceDiscovery({
      repository: input.evidenceAuditRepository,
      researchRepository: input.researchRepository,
      auditReport: latestReport,
      maxQueries: input.maxTargets,
      maxAcquisitionAttempts: input.maxAcquisitionAttempts,
    });
  }

  return processQueuedEvidenceDiscovery({
    repository: input.evidenceAuditRepository,
    researchRepository: input.researchRepository,
    maxTargets: input.maxTargets,
    maxAcquisitionAttempts: input.maxAcquisitionAttempts,
  });
}

export async function runResearchWorkerCycle(input: {
  backfillLimit?: number;
  evidenceAcquisitionLimit?: number;
  evidenceAuditRepository?: EvidenceAuditRepository;
  evidenceDiscoveryAutoRun?: boolean;
  evidenceDiscoveryLimit?: number;
  extractionLimit?: number;
  repository: ResearchRepository;
}): Promise<ResearchWorkerCycleResult> {
  const backfillsProcessed = await processBackfills(
    input.repository,
    input.backfillLimit ?? 1,
  );
  const extractions = await processExtractions(
    input.repository,
    input.extractionLimit ?? 25,
  );
  const evidenceDiscovery = input.evidenceAuditRepository
    ? await processEvidenceDiscovery({
        autoRunWithoutTargets: input.evidenceDiscoveryAutoRun ?? false,
        evidenceAuditRepository: input.evidenceAuditRepository,
        maxAcquisitionAttempts: input.evidenceAcquisitionLimit ?? 25,
        maxTargets: input.evidenceDiscoveryLimit ?? 5,
        researchRepository: input.repository,
      })
    : {
        acquisition_attempts: 0,
        records_staged: 0,
        targets_completed: 0,
        targets_created: 0,
      };

  return {
    backfillsProcessed,
    evidenceAcquisitionAttempts: evidenceDiscovery.acquisition_attempts,
    evidenceDiscoveryRecordsStaged: evidenceDiscovery.records_staged,
    evidenceDiscoveryTargetsCreated: evidenceDiscovery.targets_created,
    evidenceDiscoveryTargetsProcessed: evidenceDiscovery.targets_completed,
    extractionFailures: extractions.failures,
    extractionJobsProcessed: extractions.processed,
  };
}

export function summarizeWorkerCycle(
  result: ResearchWorkerCycleResult,
): string {
  return `processed ${result.backfillsProcessed} backfill run(s), ${result.extractionJobsProcessed} extraction job(s), ${result.extractionFailures} extraction failure(s), ${result.evidenceDiscoveryTargetsCreated} discovery target(s) created, ${result.evidenceDiscoveryTargetsProcessed} discovery target(s) processed, ${result.evidenceDiscoveryRecordsStaged} evidence record(s) staged, ${result.evidenceAcquisitionAttempts} acquisition attempt(s)`;
}
