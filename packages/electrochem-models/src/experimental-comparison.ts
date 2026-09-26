import {
  developmentComparisonResultSchema,
  experimentalComparisonRequestSchema,
  experimentalComparisonResultSchema,
  type ExperimentalComparisonReason,
} from '@metrev/domain-contracts';

const notAssessedInterpretation =
  'Residual only. No acceptance threshold, pass/fail decision, calibration claim, or validation conclusion was applied.';

function blocked(
  reasonCodes: ExperimentalComparisonReason[],
): ReturnType<typeof experimentalComparisonResultSchema.parse> {
  return experimentalComparisonResultSchema.parse({
    status: 'blocked',
    reason_codes: [...new Set(reasonCodes)],
    assessment_status: 'not_assessed',
  });
}

export function assessExperimentalComparison(
  input: unknown,
): ReturnType<typeof experimentalComparisonResultSchema.parse> {
  const parsed = experimentalComparisonRequestSchema.safeParse(input);
  if (!parsed.success) {
    const reasons = new Set<ExperimentalComparisonReason>();
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === 'prediction') {
        reasons.add('invalid_prediction');
      } else if (issue.path[0] === 'observation') {
        reasons.add('invalid_observation');
      } else {
        reasons.add('invalid_request');
      }
    }
    return blocked([...reasons]);
  }

  const { prediction, observation } = parsed.data;
  const reasons: ExperimentalComparisonReason[] = [];

  if (
    observation.source_kind === 'test_fixture' ||
    observation.dataset_role === 'test_fixture'
  ) {
    reasons.push('test_fixture_data');
  } else if (
    observation.source_kind !== 'measured' &&
    observation.source_kind !== 'literature'
  ) {
    reasons.push('observation_not_experimental');
  }
  if (observation.review_status === 'pending') {
    reasons.push('observation_review_pending');
  } else if (observation.review_status === 'rejected') {
    reasons.push('observation_review_rejected');
  }
  if (observation.dataset_role !== 'independent_validation') {
    reasons.push('dataset_not_independent');
  }
  if (observation.condition_match_status !== 'matched') {
    reasons.push('conditions_not_matched');
  }
  if (prediction.metric_key !== observation.metric_key) {
    reasons.push('metric_key_mismatch');
  }
  if (prediction.unit !== observation.unit) {
    reasons.push('unit_mismatch');
  }

  if (Boolean(prediction.coordinate) !== Boolean(observation.coordinate)) {
    reasons.push('coordinate_presence_mismatch');
  } else if (
    prediction.coordinate &&
    observation.coordinate &&
    (prediction.coordinate.axis_key !== observation.coordinate.axis_key ||
      prediction.coordinate.value !== observation.coordinate.value ||
      prediction.coordinate.unit !== observation.coordinate.unit)
  ) {
    reasons.push('coordinate_mismatch');
  }

  if (reasons.length > 0) {
    return blocked(reasons);
  }

  const signedResidual = prediction.value - observation.value;
  if (!Number.isFinite(signedResidual)) {
    return blocked(['non_finite_residual']);
  }

  return experimentalComparisonResultSchema.parse({
    status: 'residual_computed',
    reason_codes: [],
    assessment_status: 'not_assessed',
    model_version: prediction.model_version,
    model_run_ref: prediction.model_run_ref,
    prediction_source_ref: prediction.source_ref,
    observation_id: observation.observation_id,
    observation_source_ref: observation.source_ref,
    metric_key: prediction.metric_key,
    unit: prediction.unit,
    predicted_value: prediction.value,
    observed_value: observation.value,
    signed_residual: signedResidual,
    absolute_error: Math.abs(signedResidual),
    coordinate: prediction.coordinate,
    interpretation: notAssessedInterpretation,
  });
}

const developmentOnlyInterpretation =
  'Provisional model-development residual only. Source review, parameter calibration, and independent predictive validity are not established by this comparison.';

function developmentBlocked(
  reasonCodes: ExperimentalComparisonReason[],
): ReturnType<typeof developmentComparisonResultSchema.parse> {
  return developmentComparisonResultSchema.parse({
    scope: 'model_development',
    status: 'blocked',
    reason_codes: [...new Set(reasonCodes)],
    assessment_status: 'not_assessed',
  });
}

/**
 * Compares an implemented model with a source-traced development observation
 * even when publication extraction is pending review. This is only a
 * provisional numeric diagnostic; the strict assessExperimentalComparison
 * path remains the path for residuals against reviewed independent data.
 */
export function compareForModelDevelopment(
  input: unknown,
): ReturnType<typeof developmentComparisonResultSchema.parse> {
  const parsed = experimentalComparisonRequestSchema.safeParse(input);
  if (!parsed.success) {
    const reasons = new Set<ExperimentalComparisonReason>();
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === 'prediction') {
        reasons.add('invalid_prediction');
      } else if (issue.path[0] === 'observation') {
        reasons.add('invalid_observation');
      } else {
        reasons.add('invalid_request');
      }
    }
    return developmentBlocked([...reasons]);
  }

  const { prediction, observation } = parsed.data;
  const reasons: ExperimentalComparisonReason[] = [];

  if (
    observation.source_kind === 'test_fixture' ||
    observation.dataset_role === 'test_fixture'
  ) {
    reasons.push('test_fixture_data');
  } else if (
    observation.source_kind !== 'measured' &&
    observation.source_kind !== 'literature'
  ) {
    reasons.push('observation_not_experimental');
  }
  if (observation.review_status === 'rejected') {
    reasons.push('observation_review_rejected');
  }
  if (observation.condition_match_status !== 'matched') {
    reasons.push('conditions_not_matched');
  }
  if (prediction.metric_key !== observation.metric_key) {
    reasons.push('metric_key_mismatch');
  }
  if (prediction.unit !== observation.unit) {
    reasons.push('unit_mismatch');
  }

  if (Boolean(prediction.coordinate) !== Boolean(observation.coordinate)) {
    reasons.push('coordinate_presence_mismatch');
  } else if (
    prediction.coordinate &&
    observation.coordinate &&
    (prediction.coordinate.axis_key !== observation.coordinate.axis_key ||
      prediction.coordinate.value !== observation.coordinate.value ||
      prediction.coordinate.unit !== observation.coordinate.unit)
  ) {
    reasons.push('coordinate_mismatch');
  }

  if (reasons.length > 0) {
    return developmentBlocked(reasons);
  }

  const signedResidual = prediction.value - observation.value;
  if (!Number.isFinite(signedResidual)) {
    return developmentBlocked(['non_finite_residual']);
  }

  return developmentComparisonResultSchema.parse({
    scope: 'model_development',
    status: 'provisional_residual_computed',
    reason_codes: [],
    assessment_status: 'development_only',
    source_review_status: observation.review_status,
    dataset_role: observation.dataset_role,
    model_version: prediction.model_version,
    model_run_ref: prediction.model_run_ref,
    prediction_source_ref: prediction.source_ref,
    observation_id: observation.observation_id,
    observation_source_ref: observation.source_ref,
    metric_key: prediction.metric_key,
    unit: prediction.unit,
    predicted_value: prediction.value,
    observed_value: observation.value,
    signed_residual: signedResidual,
    absolute_error: Math.abs(signedResidual),
    coordinate: prediction.coordinate,
    interpretation: developmentOnlyInterpretation,
  });
}
