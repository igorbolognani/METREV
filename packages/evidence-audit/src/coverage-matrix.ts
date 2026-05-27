import {
  coverageEntrySchema,
  loadEvidenceQualityAuditPolicy,
  type CoverageEntry,
} from '@metrev/domain-contracts';

export interface RawCoverageRow {
  systemType: string | null;
  componentType: string | null;
  material: string | null;
  metricType: string;
  scale?: string | null;
  trl?: number | null;
  decisionReadyCount: number;
  newestYear: number | null;
}

interface CoverageThresholds {
  minimum: number;
  strong: number;
  warningYears: number;
  staleYears: number;
}

function numberFromPolicy(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getCoverageThresholds(): CoverageThresholds {
  const policy = loadEvidenceQualityAuditPolicy();
  return {
    minimum: numberFromPolicy(
      policy.coverage_policy.minimum_benchmark_records,
      3,
    ),
    strong: numberFromPolicy(
      policy.coverage_policy.minimum_for_strong_coverage,
      8,
    ),
    warningYears: numberFromPolicy(
      policy.recency_policy.warning_threshold_years,
      4,
    ),
    staleYears: numberFromPolicy(
      policy.recency_policy.stale_threshold_years,
      6,
    ),
  };
}

export function classifyCoverage(
  recordCount: number,
  thresholds: Pick<CoverageThresholds, 'minimum' | 'strong'>,
): CoverageEntry['coverage_level'] {
  if (recordCount >= thresholds.strong) {
    return 'strong';
  }

  if (recordCount >= thresholds.minimum) {
    return 'sufficient';
  }

  if (recordCount > 0) {
    return 'sparse';
  }

  return 'absent';
}

export function classifyRecency(
  newestYear: number | null,
  currentYear: number,
  thresholds: Pick<CoverageThresholds, 'warningYears' | 'staleYears'>,
): CoverageEntry['recency_status'] {
  if (!newestYear) {
    return 'stale';
  }

  const ageYears = currentYear - newestYear;
  if (ageYears >= thresholds.staleYears) {
    return 'stale';
  }

  if (ageYears >= thresholds.warningYears) {
    return 'aging';
  }

  return 'current';
}

export function buildCoverageMatrix(input: {
  rawCounts: RawCoverageRow[];
  currentYear?: number;
}): CoverageEntry[] {
  const thresholds = getCoverageThresholds();
  const currentYear = input.currentYear ?? new Date().getFullYear();

  return input.rawCounts.map((row) =>
    coverageEntrySchema.parse({
      system_type: row.systemType,
      component_type: row.componentType,
      material: row.material,
      metric_type: row.metricType,
      scale: row.scale ?? null,
      trl: row.trl ?? null,
      record_count: row.decisionReadyCount,
      coverage_level: classifyCoverage(row.decisionReadyCount, thresholds),
      newest_publication_year: row.newestYear,
      recency_status: classifyRecency(row.newestYear, currentYear, thresholds),
    }),
  );
}
