export type BenchmarkEvidenceStratum =
  | 'mathematical_manufactured'
  | 'published_model_reproduction'
  | 'component_experiment'
  | 'condition_matched_full_cell_experiment'
  | 'independent_held_out_validation';

export type BenchmarkEvidenceUse =
  | 'numerical_verification'
  | 'published_model_reproduction'
  | 'component_comparison'
  | 'full_cell_comparison'
  | 'independent_validation';

export interface BenchmarkEvidence {
  evidence_stratum: string;
  source_kind?: string;
  verification_case_kind?: string;
  dataset_role?: string;
  split?: string;
  condition_match_status?: string;
  review_status?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export function classifyBenchmarkEvidence(input: {
  dataset_role?: string;
  record_kind?: string;
}): string;

export function assessBenchmarkEvidenceUse(
  evidence: BenchmarkEvidence | null | undefined,
  requestedUse: string,
): { allowed: boolean; reason_codes: string[] };

export const BENCHMARK_STRATA: readonly BenchmarkEvidenceStratum[];
export const UNCLASSIFIED_AGGREGATE_STRATUM: string;
