import { describe, expect, it, vi } from 'vitest';

import {
    type EvidenceAuditRepository,
    MemoryResearchRepository,
} from '@metrev/database';
import {
    DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
    getDefaultResearchColumns,
} from '@metrev/research-intelligence';

import { runResearchWorkerCycle } from '../../apps/research-worker/src/worker';

describe('research worker', () => {
  it('drains queued backfills and queued extraction jobs through the shared runtime path', async () => {
    const repository = new MemoryResearchRepository();

    await repository.enqueueResearchBackfill({
      query: 'microbial fuel cell wastewater',
      per_provider_limit: 2,
      max_pages: 2,
    });
    const review = await repository.createResearchReview({
      query: 'microbial fuel cell wastewater',
      limit: 1,
      columns: getDefaultResearchColumns(),
      extractorVersion: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
      actorId: 'worker-test',
    });

    const firstCycle = await runResearchWorkerCycle({
      repository,
      backfillLimit: 1,
      extractionLimit: 100,
    });

    expect(firstCycle.backfillsProcessed).toBe(1);
    expect(firstCycle.extractionJobsProcessed).toBeGreaterThan(0);

    const afterFirstCycle = await repository.listResearchBackfills();
    expect(afterFirstCycle.items[0]).toEqual(
      expect.objectContaining({
        pages_completed: 1,
        records_remaining: expect.any(Number),
        status: 'queued',
        target_records: 4,
      }),
    );

    const secondCycle = await runResearchWorkerCycle({
      repository,
      backfillLimit: 1,
      extractionLimit: 0,
    });

    expect(secondCycle.backfillsProcessed).toBe(1);

    const finalBackfills = await repository.listResearchBackfills();
    expect(finalBackfills.items[0]).toEqual(
      expect.objectContaining({
        completion_ratio: 1,
        pages_completed: 2,
        records_remaining: 0,
        status: 'completed',
      }),
    );

    const updatedReview = await repository.getResearchReview(review.review_id);
    expect(updatedReview?.completed_result_count).toBeGreaterThan(0);
  });

  it('does not auto-create evidence discovery targets unless explicitly enabled', async () => {
    const repository = new MemoryResearchRepository();
    const evidenceAuditRepository = {
      getLatestEvidenceQualityAuditReport: vi.fn(async () => ({
        report_id: 'audit-report-without-targets',
      })),
      listDiscoveryTargets: vi.fn(async () => []),
      getQueuedDiscoveryTargets: vi.fn(async () => []),
      getNeedsFullTextSourceRecords: vi.fn(async () => []),
      createDiscoveryTargets: vi.fn(async () => {
        throw new Error('unexpected auto discovery target creation');
      }),
      createAcquisitionAttempt: vi.fn(async () => {
        throw new Error('unexpected acquisition attempt creation');
      }),
    } as unknown as EvidenceAuditRepository;

    const cycle = await runResearchWorkerCycle({
      repository,
      evidenceAuditRepository,
      evidenceDiscoveryAutoRun: false,
      evidenceDiscoveryLimit: 5,
      extractionLimit: 0,
      backfillLimit: 0,
    });

    expect(cycle.evidenceDiscoveryTargetsCreated).toBe(0);
    expect(cycle.evidenceDiscoveryRecordsStaged).toBe(0);
    expect(evidenceAuditRepository.listDiscoveryTargets).toHaveBeenCalled();
    expect(
      evidenceAuditRepository.createDiscoveryTargets,
    ).not.toHaveBeenCalled();
  });
});
