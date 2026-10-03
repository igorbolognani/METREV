/** Validation-ladder rules for benchmark evidence. No evidence is promoted here. */
/** @typedef {'mathematical_manufactured'|'published_model_reproduction'|'component_experiment'|'condition_matched_full_cell_experiment'|'independent_held_out_validation'} BenchmarkEvidenceStratum */
/** @typedef {'numerical_verification'|'published_model_reproduction'|'component_comparison'|'full_cell_comparison'|'independent_validation'} BenchmarkEvidenceUse */
/** @typedef {{ evidence_stratum: string, source_kind?: string, verification_case_kind?: string, dataset_role?: string, split?: string, condition_match_status?: string, review_status?: string, reviewed_by?: string, reviewed_at?: string }} BenchmarkEvidence */
export const BENCHMARK_STRATA = Object.freeze([
  'mathematical_manufactured',
  'published_model_reproduction',
  'component_experiment',
  'condition_matched_full_cell_experiment',
  'independent_held_out_validation',
]);

export const UNCLASSIFIED_AGGREGATE_STRATUM = 'unclassified_aggregate_claim';

const COMPONENT_DATASET_ROLES = new Set([
  'component_characterization',
  'electrode_characterization',
]);

/** Assigns only a source-declared stratum; unknown roles fail closed. */
/** @param {{dataset_role?: string, record_kind?: string}} input */
export function classifyBenchmarkEvidence({ dataset_role, record_kind }) {
  if (record_kind === 'published_aggregate_or_qualitative_claim') {
    return UNCLASSIFIED_AGGREGATE_STRATUM;
  }
  if (
    typeof dataset_role === 'string' &&
    COMPONENT_DATASET_ROLES.has(dataset_role)
  ) {
    return 'component_experiment';
  }
  throw new Error(
    `Unknown benchmark evidence role: ${dataset_role ?? 'missing'}`,
  );
}

const REQUIRED_STRATUM_BY_USE = Object.freeze({
  numerical_verification: 'mathematical_manufactured',
  published_model_reproduction: 'published_model_reproduction',
  component_comparison: 'component_experiment',
  full_cell_comparison: 'condition_matched_full_cell_experiment',
  independent_validation: 'independent_held_out_validation',
});

/** @param {boolean} allowed @param {string} [reason] */
const result = (allowed, reason) => ({
  allowed,
  reason_codes: reason ? [reason] : [],
});

/** @param {BenchmarkEvidence} evidence */
const hasApprovedReview = (evidence) =>
  evidence.review_status === 'approved' &&
  Boolean(evidence.reviewed_by) &&
  Boolean(evidence.reviewed_at);

/** @param {BenchmarkEvidence} evidence */
const isExperimentalSource = (evidence) =>
  evidence.source_kind === 'measured' || evidence.source_kind === 'literature';

/**
 * Checks whether evidence can support a requested benchmark claim. The
 * evidence stratum is never inferred from a DOI, title, model output, or test
 * fixture; callers must provide it explicitly.
 * @param {BenchmarkEvidence | null | undefined} evidence
 * @param {string} requestedUse
 * @returns {{allowed: boolean, reason_codes: string[]}}
 */
export function assessBenchmarkEvidenceUse(evidence, requestedUse) {
  if (
    typeof requestedUse !== 'string' ||
    !Object.hasOwn(REQUIRED_STRATUM_BY_USE, requestedUse)
  ) {
    return result(false, 'unknown_requested_use');
  }
  const use = /** @type {BenchmarkEvidenceUse} */ (requestedUse);
  const requiredStratum = REQUIRED_STRATUM_BY_USE[use];
  if (!requiredStratum) return result(false, 'unknown_requested_use');
  if (!evidence || !BENCHMARK_STRATA.includes(evidence.evidence_stratum)) {
    return result(false, 'unknown_evidence_stratum');
  }
  const isFixture =
    evidence.source_kind === 'test_fixture' ||
    evidence.dataset_role === 'test_fixture';
  if (isFixture && use !== 'numerical_verification') {
    return result(false, 'test_fixture_is_not_benchmark_evidence');
  }

  const actualRank = BENCHMARK_STRATA.indexOf(evidence.evidence_stratum);
  const requiredRank = BENCHMARK_STRATA.indexOf(requiredStratum);
  if (actualRank < requiredRank) {
    return result(false, 'evidence_stratum_below_claim');
  }

  if (use === 'numerical_verification') {
    if (evidence.evidence_stratum !== requiredStratum) {
      return result(false, 'wrong_verification_evidence_kind');
    }
    return evidence.source_kind === 'test_fixture' &&
      (evidence.verification_case_kind === 'analytical' ||
        evidence.verification_case_kind === 'manufactured')
      ? result(true)
      : result(false, 'verification_source_not_analytical_or_manufactured');
  }
  if (use === 'published_model_reproduction') {
    if (evidence.evidence_stratum !== requiredStratum) {
      return result(false, 'wrong_reproduction_evidence_kind');
    }
    if (evidence.source_kind !== 'literature') {
      return result(false, 'source_not_published_model');
    }
    return hasApprovedReview(evidence)
      ? result(true)
      : result(false, 'source_review_not_approved');
  }
  if (use === 'component_comparison') {
    if (evidence.evidence_stratum !== requiredStratum) {
      return result(false, 'wrong_component_evidence_kind');
    }
    if (!isExperimentalSource(evidence)) {
      return result(false, 'observation_not_experimental');
    }
    if (evidence.condition_match_status !== 'matched') {
      return result(false, 'conditions_not_matched');
    }
    if (!hasApprovedReview(evidence)) {
      return result(false, 'source_review_not_approved');
    }
    return result(true);
  }
  if (use === 'full_cell_comparison') {
    if (evidence.evidence_stratum !== requiredStratum) {
      return result(false, 'wrong_full_cell_evidence_kind');
    }
    if (!isExperimentalSource(evidence)) {
      return result(false, 'observation_not_experimental');
    }
    if (evidence.condition_match_status !== 'matched') {
      return result(false, 'conditions_not_matched');
    }
    if (!hasApprovedReview(evidence)) {
      return result(false, 'source_review_not_approved');
    }
    if (
      evidence.dataset_role === 'calibration' ||
      evidence.dataset_role === 'training'
    ) {
      return result(false, 'development_data_cannot_validate');
    }
    if (
      evidence.dataset_role !== 'development_candidate' &&
      evidence.dataset_role !== 'independent_validation'
    ) {
      return result(
        false,
        'dataset_role_not_eligible_for_full_cell_comparison',
      );
    }
    return result(true);
  }

  // Independent predictive validation additionally requires a declared
  // held-out split, independent role, matched conditions, and source review.
  if (
    evidence.evidence_stratum !== requiredStratum ||
    evidence.dataset_role !== 'independent_validation' ||
    evidence.split !== 'held_out'
  ) {
    return result(false, 'independent_holdout_requirements_missing');
  }
  if (evidence.condition_match_status !== 'matched') {
    return result(false, 'conditions_not_matched');
  }
  if (!hasApprovedReview(evidence)) {
    return result(false, 'source_review_not_approved');
  }
  if (!isExperimentalSource(evidence)) {
    return result(false, 'observation_not_experimental');
  }
  return result(true);
}
