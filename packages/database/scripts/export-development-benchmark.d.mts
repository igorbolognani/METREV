interface BenchmarkManifest {
  schema_version: string;
  exports: { file: string; row_count: number; sha256: string }[];
  exclusions: {
    time_series_missing_cells_not_interpolated: number;
    [key: string]: unknown;
  };
  decision_eligible: boolean;
  independent_validation: boolean;
  evidence_strata: {
    tier: string;
    id: string;
    status: string;
    record_count: number;
    record_count_basis: string;
    validated: boolean;
    independent_validation: boolean;
  }[];
  unclassified_aggregate_claim_count: number;
  validation_gates: {
    no_lower_stratum_substitution: boolean;
    [key: string]: unknown;
  };
}

export function buildDevelopmentBenchmark(repoRoot?: string): Promise<{
  observations: string;
  eisPairs: string;
  literatureClaims: string;
  manifest: BenchmarkManifest;
}>;
