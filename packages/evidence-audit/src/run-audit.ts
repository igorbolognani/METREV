import { randomUUID } from 'node:crypto';

import {
  evidenceQualityReportSchema,
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
  createEvidenceQualityAuditReport(
    report: EvidenceQualityReport,
  ): Promise<string>;
}

export async function runEvidenceQualityAudit(input: {
  repository: EvidenceAuditRepositoryLike;
  triggerMode: EvidenceQualityReport['trigger_mode'];
  goldenCases?: NormalizedCaseInput[];
  currentYear?: number;
}): Promise<EvidenceQualityReport> {
  const [rawCounts, outlierCandidates, funnelMetrics] = await Promise.all([
    input.repository.getBenchmarkCoverageMatrix(),
    input.repository.getCanonicalFactOutlierCandidates(),
    input.repository.getEvidenceFunnelCounts(),
  ]);

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
    funnel_metrics: funnelMetrics,
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
