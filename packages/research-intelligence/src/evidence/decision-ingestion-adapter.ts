import {
    researchDecisionIngestionPreviewSchema,
    type ResearchDecisionIngestionPreview,
    type ResearchEvidencePack,
} from '@metrev/domain-contracts';

function hasContextReferencePenalty(
  record: ResearchEvidencePack['evidence_items'][number],
): boolean {
  const veracityScore = (record as { veracity_score?: unknown }).veracity_score;

  if (
    !veracityScore ||
    typeof veracityScore !== 'object' ||
    Array.isArray(veracityScore)
  ) {
    return false;
  }

  const penalties = (veracityScore as { confidence_penalties?: unknown })
    .confidence_penalties;

  return (
    Array.isArray(penalties) &&
    penalties.includes('context_reference_not_validated_performance_evidence')
  );
}

export function buildDecisionIngestionPreview(
  pack: ResearchEvidencePack,
): ResearchDecisionIngestionPreview {
  const assumptions = [
    'Research evidence pack values are literature-derived and require case-context applicability review before automatic scoring.',
    pack.missing_fields.length > 0
      ? `Metadata and data readiness gaps remain visible: ${pack.missing_fields
          .slice(0, 6)
          .join(', ')}.`
      : null,
    pack.evidence_items.some((record) => hasContextReferencePenalty(record))
      ? 'Context-oriented references can guide metadata and methodology review but are not validated performance evidence on their own.'
      : null,
  ].filter((value): value is string => Boolean(value));

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
    assumptions,
    ...(pack.runtime_versions
      ? { runtime_versions: pack.runtime_versions }
      : {}),
  });
}
