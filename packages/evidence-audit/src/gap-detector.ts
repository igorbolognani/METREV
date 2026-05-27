import {
  evidenceGapSchema,
  loadEvidenceDiscoveryPolicy,
  loadEvidenceQualityAuditPolicy,
  type CoverageEntry,
  type EvidenceGap,
  type NormalizedCaseInput,
  type PrimaryObjective,
} from '@metrev/domain-contracts';

function toSystemType(
  technologyFamily: NormalizedCaseInput['technology_family'],
): string {
  if (technologyFamily === 'microbial_fuel_cell') {
    return 'MFC';
  }

  if (technologyFamily === 'microbial_electrolysis_cell') {
    return 'MEC';
  }

  return 'MET';
}

function policyMetricsByObjective(): Record<string, string[]> {
  return loadEvidenceQualityAuditPolicy().primary_metrics_by_objective;
}

function termsForDimension(
  dimension: 'system_type' | 'component_type' | 'metric_type',
  value: string | null,
): string[] {
  if (!value) {
    return [];
  }

  const discoveryPolicy = loadEvidenceDiscoveryPolicy();
  const queryGeneration = discoveryPolicy.query_generation as {
    dimension_mappings?: Record<string, Record<string, string[]>>;
  };
  return queryGeneration.dimension_mappings?.[dimension]?.[value] ?? [value];
}

function buildRecommendedQuery(gap: {
  system_type: string | null;
  component_type: string | null;
  material: string | null;
  metric_type: string;
}): string {
  const terms = [
    ...termsForDimension('system_type', gap.system_type),
    ...termsForDimension('component_type', gap.component_type),
    gap.material?.replaceAll('_', ' ') ?? '',
    ...termsForDimension('metric_type', gap.metric_type),
  ].filter((term) => term.trim().length > 0);

  return Array.from(new Set(terms)).slice(0, 6).join(' ');
}

function gapId(parts: Array<string | null>): string {
  return parts
    .map((part) => part ?? 'any')
    .join('__')
    .toLowerCase();
}

function findCoverage(input: {
  coverageMatrix: CoverageEntry[];
  systemType: string;
  metricType: string;
}): CoverageEntry | undefined {
  return input.coverageMatrix.find(
    (entry) =>
      entry.metric_type === input.metricType &&
      (!entry.system_type || entry.system_type === input.systemType),
  );
}

function severityForCoverage(
  entry: CoverageEntry | undefined,
): EvidenceGap['severity'] {
  if (!entry || entry.coverage_level === 'absent') {
    return 'critical';
  }

  if (entry.coverage_level === 'sparse' || entry.recency_status === 'stale') {
    return 'moderate';
  }

  return 'minor';
}

export function detectGaps(input: {
  coverageMatrix: CoverageEntry[];
  goldenCases?: NormalizedCaseInput[];
}): EvidenceGap[] {
  const gaps = new Map<string, EvidenceGap>();
  const primaryMetricsByObjective = policyMetricsByObjective();

  for (const caseInput of input.goldenCases ?? []) {
    const systemType = toSystemType(caseInput.technology_family);
    const primaryMetrics =
      primaryMetricsByObjective[
        caseInput.primary_objective as PrimaryObjective
      ] ?? [];

    for (const metricType of primaryMetrics) {
      const coverage = findCoverage({
        coverageMatrix: input.coverageMatrix,
        systemType,
        metricType,
      });

      if (
        coverage &&
        coverage.coverage_level !== 'sparse' &&
        coverage.coverage_level !== 'absent' &&
        coverage.recency_status !== 'stale'
      ) {
        continue;
      }

      const draft = {
        gap_id: gapId([caseInput.case_id, systemType, metricType]),
        system_type: systemType,
        component_type: coverage?.component_type ?? null,
        material: coverage?.material ?? null,
        metric_type: metricType,
        severity: severityForCoverage(coverage),
        affects_golden_cases: [caseInput.case_id],
        recommended_query: buildRecommendedQuery({
          system_type: systemType,
          component_type: coverage?.component_type ?? null,
          material: coverage?.material ?? null,
          metric_type: metricType,
        }),
        priority: coverage ? 30 : 10,
      } satisfies EvidenceGap;

      gaps.set(draft.gap_id, evidenceGapSchema.parse(draft));
    }
  }

  for (const entry of input.coverageMatrix) {
    if (entry.coverage_level !== 'sparse' && entry.recency_status !== 'stale') {
      continue;
    }

    const draft = {
      gap_id: gapId([
        'coverage',
        entry.system_type,
        entry.component_type,
        entry.material,
        entry.metric_type,
      ]),
      system_type: entry.system_type,
      component_type: entry.component_type,
      material: entry.material,
      metric_type: entry.metric_type,
      severity: entry.recency_status === 'stale' ? 'moderate' : 'minor',
      affects_golden_cases: [],
      recommended_query: buildRecommendedQuery({
        system_type: entry.system_type,
        component_type: entry.component_type,
        material: entry.material,
        metric_type: entry.metric_type,
      }),
      priority: entry.recency_status === 'stale' ? 60 : 75,
    } satisfies EvidenceGap;

    gaps.set(draft.gap_id, evidenceGapSchema.parse(draft));
  }

  return Array.from(gaps.values()).sort((a, b) => a.priority - b.priority);
}
