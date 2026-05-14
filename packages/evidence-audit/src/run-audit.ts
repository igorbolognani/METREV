import { randomUUID } from 'node:crypto';

import {
  acceptedEvidenceReadinessRecordSchema,
  evidenceQualityReportSchema,
  type AcceptedEvidenceReadinessCandidate,
  type AcceptedEvidenceReadinessRecord,
  type AcceptedEvidenceReadinessSummary,
  type EvidenceFunnelGroup,
  type EvidenceQualityReport,
  type FunnelStageCount,
  type NormalizedCaseInput,
} from '@metrev/domain-contracts';

import { buildCoverageMatrix, type RawCoverageRow } from './coverage-matrix';
import { detectGaps } from './gap-detector';
import { detectOutliers, type OutlierCandidateRow } from './outlier-detector';
import { scoreReadiness } from './readiness-scorer';

export interface EvidenceAuditRepositoryLike {
  getBenchmarkCoverageMatrix(): Promise<RawCoverageRow[]>;
  getCanonicalFactOutlierCandidates(): Promise<OutlierCandidateRow[]>;
  getEvidenceFunnelCounts(): Promise<FunnelStageCount[]>;
  getEvidenceFunnels?(): Promise<EvidenceFunnelGroup>;
  getAcceptedEvidenceReadinessCandidates(
    limit?: number,
  ): Promise<AcceptedEvidenceReadinessCandidate[]>;
  createEvidenceQualityAuditReport(
    report: EvidenceQualityReport,
  ): Promise<string>;
}

function issueFlagsForAcceptedEvidence(
  candidate: AcceptedEvidenceReadinessCandidate,
) {
  const flags: string[] = [];

  if (!candidate.abstract_available) {
    flags.push('missing_abstract');
  }

  if (!candidate.full_text_available) {
    flags.push('missing_full_text');
  }

  if (candidate.source_text_chunk_count === 0) {
    flags.push('missing_source_text_chunks');
  }

  if (candidate.canonical_fact_count === 0) {
    flags.push('missing_canonical_facts');
  }

  if (candidate.decision_ready_fact_count === 0) {
    flags.push('missing_decision_ready_facts');
  }

  if (candidate.benchmark_record_count === 0) {
    flags.push('missing_benchmark_rows');
  }

  if (candidate.decision_ready_benchmark_count === 0) {
    flags.push('missing_decision_ready_benchmark_rows');
  }

  if (candidate.extraction_status === 'needs_review') {
    flags.push('needs_review');
  }

  if (candidate.extraction_status === 'extraction_failed') {
    flags.push('extraction_failed');
  }

  if (candidate.extraction_status === 'insufficient_source') {
    flags.push('insufficient_source');
  }

  if (candidate.evidence_quality?.toLowerCase() === 'low') {
    flags.push('low_evidence_quality');
  }

  if (!candidate.doi_available && !candidate.source_url_available) {
    flags.push('missing_identifiers');
  }

  return flags;
}

function recommendedActionForAcceptedEvidence(
  candidate: AcceptedEvidenceReadinessCandidate,
  flags: string[],
): AcceptedEvidenceReadinessRecord['recommended_action'] {
  const tableReady =
    candidate.full_text_available &&
    candidate.source_text_chunk_count > 0 &&
    candidate.decision_ready_fact_count > 0 &&
    candidate.decision_ready_benchmark_count > 0;

  if (tableReady) {
    return 'keep';
  }

  const emptyAndUntraceable =
    !candidate.abstract_available &&
    !candidate.full_text_available &&
    candidate.claim_count === 0 &&
    candidate.canonical_fact_count === 0 &&
    candidate.benchmark_record_count === 0 &&
    flags.includes('missing_identifiers');

  if (emptyAndUntraceable) {
    return 'delete_record';
  }

  if (flags.includes('low_evidence_quality')) {
    return 'reject_from_intake';
  }

  if (flags.includes('needs_review')) {
    return 'quarantine_for_review';
  }

  if (
    flags.includes('missing_full_text') ||
    flags.includes('missing_source_text_chunks')
  ) {
    return 'reacquire_full_text';
  }

  return 'rerun_extraction';
}

function rationaleForAcceptedEvidenceAction(
  action: AcceptedEvidenceReadinessRecord['recommended_action'],
) {
  switch (action) {
    case 'keep':
      return 'Traceable full text, decision-ready facts, and benchmark rows are already present.';
    case 'reacquire_full_text':
      return 'The record is accepted but still lacks traceable full text or source chunks for reliable table extraction.';
    case 'rerun_extraction':
      return 'Traceable source material exists, but canonical facts or benchmark rows are still missing and extraction should be rerun.';
    case 'quarantine_for_review':
      return 'The record has technical signal but its extraction state still requires analyst review before reuse.';
    case 'reject_from_intake':
      return 'The accepted record remains low-quality and is not strong enough for table-ready intake.';
    case 'delete_record':
      return 'The accepted record has no usable identifiers, no recoverable full text, and no extracted technical evidence.';
  }
}

function classifyAcceptedEvidence(
  candidate: AcceptedEvidenceReadinessCandidate,
): AcceptedEvidenceReadinessRecord {
  const issueFlags = issueFlagsForAcceptedEvidence(candidate);
  const recommendedAction = recommendedActionForAcceptedEvidence(
    candidate,
    issueFlags,
  );

  return acceptedEvidenceReadinessRecordSchema.parse({
    ...candidate,
    issue_flags: issueFlags,
    table_ready: recommendedAction === 'keep',
    recommended_action: recommendedAction,
    rationale: rationaleForAcceptedEvidenceAction(recommendedAction),
  });
}

function summarizeAcceptedEvidence(
  records: AcceptedEvidenceReadinessRecord[],
): AcceptedEvidenceReadinessSummary {
  const counts = new Map<
    AcceptedEvidenceReadinessRecord['recommended_action'],
    number
  >();

  for (const record of records) {
    counts.set(
      record.recommended_action,
      (counts.get(record.recommended_action) ?? 0) + 1,
    );
  }

  return {
    total_accepted_records: records.length,
    table_ready_records: records.filter((record) => record.table_ready).length,
    keep_count: counts.get('keep') ?? 0,
    reacquire_full_text_count: counts.get('reacquire_full_text') ?? 0,
    rerun_extraction_count: counts.get('rerun_extraction') ?? 0,
    quarantine_for_review_count: counts.get('quarantine_for_review') ?? 0,
    reject_from_intake_count: counts.get('reject_from_intake') ?? 0,
    delete_record_count: counts.get('delete_record') ?? 0,
  };
}

export async function runEvidenceQualityAudit(input: {
  repository: EvidenceAuditRepositoryLike;
  triggerMode: EvidenceQualityReport['trigger_mode'];
  goldenCases?: NormalizedCaseInput[];
  currentYear?: number;
}): Promise<EvidenceQualityReport> {
  const [rawCounts, outlierCandidates, funnelMetrics, acceptedCandidates] =
    await Promise.all([
      input.repository.getBenchmarkCoverageMatrix(),
      input.repository.getCanonicalFactOutlierCandidates(),
      input.repository.getEvidenceFunnelCounts(),
      input.repository.getAcceptedEvidenceReadinessCandidates(),
    ]);

  // Phase 3 / spec 037: 5-funnel split. Additive and gated on whether the
  // repository implements the new method, so legacy repositories continue
  // to work and the existing `funnel_metrics` field is preserved.
  const funnels: EvidenceFunnelGroup | undefined =
    process.env.METREV_AUDIT_FUNNELS_V2 === '0'
      ? undefined
      : typeof input.repository.getEvidenceFunnels === 'function'
        ? await input.repository.getEvidenceFunnels()
        : undefined;

  const coverageMatrix = buildCoverageMatrix({
    rawCounts,
    currentYear: input.currentYear,
  });
  const gaps = detectGaps({
    coverageMatrix,
    goldenCases: input.goldenCases,
  });
  const outliers = detectOutliers({ candidates: outlierCandidates });
  const readinessScores = scoreReadiness({
    coverageMatrix,
    goldenCases: input.goldenCases,
  });
  const acceptedRecordReadiness = acceptedCandidates.map(
    classifyAcceptedEvidence,
  );
  const acceptedRecordSummary = summarizeAcceptedEvidence(
    acceptedRecordReadiness,
  );
  const totalBenchmarkRecords = coverageMatrix.reduce(
    (sum, entry) => sum + entry.record_count,
    0,
  );
  const coveredCells = coverageMatrix.filter(
    (entry) => entry.coverage_level !== 'absent',
  ).length;

  const report = evidenceQualityReportSchema.parse({
    report_id: randomUUID(),
    trigger_mode: input.triggerMode,
    coverage_matrix: coverageMatrix,
    gaps,
    outliers,
    readiness_scores: readinessScores,
    accepted_record_readiness: acceptedRecordReadiness,
    accepted_record_summary: acceptedRecordSummary,
    funnel_metrics: funnelMetrics,
    funnels,
    summary: {
      total_benchmark_records: totalBenchmarkRecords,
      decision_ready_records: totalBenchmarkRecords,
      coverage_ratio:
        coverageMatrix.length === 0 ? 0 : coveredCells / coverageMatrix.length,
      critical_gap_count: gaps.filter((gap) => gap.severity === 'critical')
        .length,
      stale_metric_count: coverageMatrix.filter(
        (entry) => entry.recency_status === 'stale',
      ).length,
      outlier_count: outliers.length,
    },
    created_at: new Date().toISOString(),
  });

  await input.repository.createEvidenceQualityAuditReport(report);
  return report;
}
