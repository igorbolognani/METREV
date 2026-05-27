import {
  type DiscoveryTarget,
  type EvidenceQualityReport,
  type ResearchPaperSearchResult,
  type ResearchSearchProvider,
} from '@metrev/domain-contracts';

import {
  resolveFullText,
  type AcquisitionRepositoryLike,
  type SourceRecordForAcquisition,
} from './fulltext-resolver';
import { generateDiscoveryQueries } from './query-generator';

export interface DiscoveryRepositoryLike extends AcquisitionRepositoryLike {
  createDiscoveryTargets(targets: DiscoveryTarget[]): Promise<string[]>;
  getQueuedDiscoveryTargets(limit?: number): Promise<DiscoveryTarget[]>;
  updateDiscoveryTargetStatus(
    targetId: string,
    update: Partial<
      Pick<
        DiscoveryTarget,
        'status' | 'records_found' | 'records_staged' | 'failure_detail'
      >
    >,
  ): Promise<void>;
  getNeedsFullTextSourceRecords(
    limit?: number,
  ): Promise<SourceRecordForAcquisition[]>;
}

export interface ResearchRepositoryLike {
  searchResearchPapers(input: {
    query: string;
    limit: number;
    providers?: ResearchSearchProvider[];
  }): Promise<{ items: ResearchPaperSearchResult[] }>;
  stageResearchPapers(input: {
    query?: string;
    items: ResearchPaperSearchResult[];
  }): Promise<{ imported_count: number }>;
}

export interface DiscoverySummary {
  targets_created: number;
  targets_completed: number;
  records_found: number;
  records_staged: number;
  acquisition_attempts: number;
}

async function processTargets(input: {
  repository: DiscoveryRepositoryLike;
  researchRepository: ResearchRepositoryLike;
  targets: DiscoveryTarget[];
}) {
  let targetsCompleted = 0;
  let recordsFound = 0;
  let recordsStaged = 0;

  for (const target of input.targets) {
    await input.repository.updateDiscoveryTargetStatus(target.target_id, {
      status: 'running',
    });

    try {
      const result = await input.researchRepository.searchResearchPapers({
        query: target.query,
        limit: 25,
        providers: target.providers,
      });
      recordsFound += result.items.length;

      const staged = result.items.length
        ? await input.researchRepository.stageResearchPapers({
            query: target.query,
            items: result.items,
          })
        : { imported_count: 0 };
      recordsStaged += staged.imported_count;
      targetsCompleted += 1;

      await input.repository.updateDiscoveryTargetStatus(target.target_id, {
        status: 'completed',
        records_found: result.items.length,
        records_staged: staged.imported_count,
      });
    } catch (error) {
      await input.repository.updateDiscoveryTargetStatus(target.target_id, {
        status: 'failed',
        failure_detail: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return { targetsCompleted, recordsFound, recordsStaged };
}

async function processAcquisitionCandidates(input: {
  repository: DiscoveryRepositoryLike;
  maxAcquisitionAttempts: number;
}): Promise<number> {
  const acquisitionCandidates =
    await input.repository.getNeedsFullTextSourceRecords(
      input.maxAcquisitionAttempts,
    );
  for (const record of acquisitionCandidates) {
    await resolveFullText({ record, repository: input.repository });
  }

  return acquisitionCandidates.length;
}

export async function processQueuedEvidenceDiscovery(input: {
  repository: DiscoveryRepositoryLike;
  researchRepository: ResearchRepositoryLike;
  maxTargets?: number;
  maxAcquisitionAttempts?: number;
}): Promise<DiscoverySummary> {
  const targets = await input.repository.getQueuedDiscoveryTargets(
    input.maxTargets ?? 20,
  );
  const processed = await processTargets({
    repository: input.repository,
    researchRepository: input.researchRepository,
    targets,
  });
  const acquisitionAttempts = await processAcquisitionCandidates({
    repository: input.repository,
    maxAcquisitionAttempts: input.maxAcquisitionAttempts ?? 50,
  });

  return {
    targets_created: 0,
    targets_completed: processed.targetsCompleted,
    records_found: processed.recordsFound,
    records_staged: processed.recordsStaged,
    acquisition_attempts: acquisitionAttempts,
  };
}

export async function runEvidenceDiscovery(input: {
  repository: DiscoveryRepositoryLike;
  researchRepository: ResearchRepositoryLike;
  auditReport: EvidenceQualityReport;
  maxQueries?: number;
  maxAcquisitionAttempts?: number;
}): Promise<DiscoverySummary> {
  const targets = generateDiscoveryQueries({
    gaps: input.auditReport.gaps,
    maxQueries: input.maxQueries ?? 20,
    auditReportId: input.auditReport.report_id,
  });
  await input.repository.createDiscoveryTargets(targets);
  const processed = await processTargets({
    repository: input.repository,
    researchRepository: input.researchRepository,
    targets,
  });
  const acquisitionAttempts = await processAcquisitionCandidates({
    repository: input.repository,
    maxAcquisitionAttempts: input.maxAcquisitionAttempts ?? 50,
  });

  return {
    targets_created: targets.length,
    targets_completed: processed.targetsCompleted,
    records_found: processed.recordsFound,
    records_staged: processed.recordsStaged,
    acquisition_attempts: acquisitionAttempts,
  };
}
