import {
    researchDecisionIngestionPreviewSchema,
    type ResearchDecisionIngestionPreview,
    type ResearchEvidencePack,
} from '@metrev/domain-contracts';

export function buildDecisionIngestionPreview(
  pack: ResearchEvidencePack,
): ResearchDecisionIngestionPreview {
  return researchDecisionIngestionPreviewSchema.parse({
    pack_id: pack.pack_id,
    review_id: pack.review_id,
    evidence_records: pack.evidence_items,
    measured_metric_candidates: Object.fromEntries(
      pack.metrics.flatMap((metric) =>
        metric.normalized_value === null
          ? []
          : [[metric.metric_key, metric.normalized_value]],
      ),
    ),
    missing_data: pack.missing_fields,
    assumptions: [
      'Research evidence pack values are literature-derived and require case-context applicability review before automatic scoring.',
    ],
    ...(pack.runtime_versions
      ? { runtime_versions: pack.runtime_versions }
      : {}),
  });
}
