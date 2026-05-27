import {
  loadEvidenceQualityAuditPolicy,
  readinessScoreSchema,
  type CoverageEntry,
  type NormalizedCaseInput,
  type PrimaryObjective,
  type ReadinessScore,
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

function objectiveMetrics(objective: PrimaryObjective): string[] {
  return (
    loadEvidenceQualityAuditPolicy().primary_metrics_by_objective[objective] ??
    []
  );
}

function matchingEntries(input: {
  coverageMatrix: CoverageEntry[];
  systemType: string;
  metricTypes: string[];
}): CoverageEntry[] {
  return input.coverageMatrix.filter(
    (entry) =>
      input.metricTypes.includes(entry.metric_type) &&
      (!entry.system_type || entry.system_type === input.systemType),
  );
}

function isCovered(entry: CoverageEntry | undefined): boolean {
  return (
    !!entry &&
    (entry.coverage_level === 'strong' ||
      entry.coverage_level === 'sufficient') &&
    entry.recency_status !== 'stale'
  );
}

export function scoreReadiness(input: {
  coverageMatrix: CoverageEntry[];
  goldenCases?: NormalizedCaseInput[];
}): ReadinessScore[] {
  return (input.goldenCases ?? []).map((caseInput) => {
    const systemType = toSystemType(caseInput.technology_family);
    const metricTypes = objectiveMetrics(caseInput.primary_objective);
    const entries = matchingEntries({
      coverageMatrix: input.coverageMatrix,
      systemType,
      metricTypes,
    });
    const coveredMetricCount = metricTypes.filter((metricType) =>
      isCovered(entries.find((entry) => entry.metric_type === metricType)),
    ).length;
    const criticalGaps = metricTypes.filter(
      (metricType) =>
        !isCovered(entries.find((entry) => entry.metric_type === metricType)),
    );
    const materialComparisonCount = new Set(
      entries
        .filter((entry) => isCovered(entry) && entry.material)
        .map((entry) => `${entry.metric_type}:${entry.material}`),
    ).size;
    const operatingWindowCount = entries.filter((entry) =>
      ['conductivity_ms_cm', 'internal_resistance_ohm', 'voltage_v'].includes(
        entry.metric_type,
      ),
    ).length;
    const readinessLevel =
      criticalGaps.length === 0 && materialComparisonCount >= 3
        ? 'ready'
        : coveredMetricCount >= Math.max(1, Math.ceil(metricTypes.length / 2))
          ? 'partial'
          : 'insufficient';

    const recommendation =
      readinessLevel === 'ready'
        ? 'Evidence base is sufficient for decision support with normal uncertainty framing.'
        : readinessLevel === 'partial'
          ? 'Use decision output with explicit evidence-gap notes and prioritize targeted literature review.'
          : 'Treat recommendations as low-confidence until critical benchmark gaps are closed.';

    return readinessScoreSchema.parse({
      case_archetype: caseInput.case_id,
      technology_family: caseInput.technology_family,
      primary_objective: caseInput.primary_objective,
      readiness_level: readinessLevel,
      primary_metrics_coverage: coveredMetricCount,
      material_comparison_count: materialComparisonCount,
      operating_window_count: operatingWindowCount,
      critical_gaps: criticalGaps,
      recommendation,
    });
  });
}
