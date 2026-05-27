import {
  evidenceOutlierSchema,
  loadEvidenceQualityAuditPolicy,
  type EvidenceOutlier,
} from '@metrev/domain-contracts';

export interface OutlierCandidateRow {
  factId: string;
  canonicalKey: string | null;
  metricType: string;
  normalizedValue: number;
  aggregateMedian: number;
  zScore: number;
  sourceDocumentId: string;
  title: string;
}

function threshold(): number {
  const policy = loadEvidenceQualityAuditPolicy();
  const value = policy.outlier_policy.z_score_threshold;
  return typeof value === 'number' && Number.isFinite(value) ? value : 3;
}

export function detectOutliers(input: {
  candidates: OutlierCandidateRow[];
  zScoreThreshold?: number;
}): EvidenceOutlier[] {
  const zScoreThreshold = input.zScoreThreshold ?? threshold();

  return input.candidates
    .filter((candidate) => candidate.zScore >= zScoreThreshold)
    .map((candidate) =>
      evidenceOutlierSchema.parse({
        fact_id: candidate.factId,
        canonical_key: candidate.canonicalKey,
        metric_type: candidate.metricType,
        normalized_value: candidate.normalizedValue,
        aggregate_median: candidate.aggregateMedian,
        z_score: candidate.zScore,
        source_document_id: candidate.sourceDocumentId,
        title: candidate.title,
        action: 'flag_for_review',
      }),
    );
}
