import { describe, expect, it } from 'vitest';

import { assessExperimentalComparison } from '@metrev/electrochem-models';

const validRequest = {
  prediction: {
    metric_key: 'current_a',
    value: 1.25,
    unit: 'A',
    source_kind: 'modeled',
    model_version: 'coupled-0d-dae-v1',
    model_run_ref: 'run:case-17:revision-2',
    source_ref: 'run:case-17:revision-2#current_a',
  },
  observation: {
    observation_id: 'obs-17-1',
    metric_key: 'current_a',
    value: 1,
    unit: 'A',
    source_kind: 'measured',
    source_ref: 'lab-record:experiment-17#sample-1',
    review_status: 'approved',
    reviewed_by: 'analyst-1',
    reviewed_at: '2026-09-25T12:00:00Z',
    dataset_role: 'independent_validation',
    condition_match_status: 'matched',
    condition_match_note:
      'Reactor and operating conditions reviewed against the run inputs.',
  },
} as const;

describe('experimental comparison assessment', () => {
  it('computes a sourced residual without making a validation conclusion', () => {
    const result = assessExperimentalComparison(validRequest);

    expect(result).toMatchObject({
      status: 'residual_computed',
      assessment_status: 'not_assessed',
      model_version: 'coupled-0d-dae-v1',
      model_run_ref: 'run:case-17:revision-2',
      prediction_source_ref: 'run:case-17:revision-2#current_a',
      observation_id: 'obs-17-1',
      observation_source_ref: 'lab-record:experiment-17#sample-1',
      metric_key: 'current_a',
      unit: 'A',
      predicted_value: 1.25,
      observed_value: 1,
      signed_residual: 0.25,
      absolute_error: 0.25,
    });
    expect(result).not.toHaveProperty('validation_status');
    expect(result).not.toHaveProperty('passed');
  });

  it('blocks fixture, calibration, and partially matched observations', () => {
    const result = assessExperimentalComparison({
      prediction: validRequest.prediction,
      observation: {
        ...validRequest.observation,
        source_kind: 'test_fixture',
        review_status: 'pending',
        reviewed_by: undefined,
        reviewed_at: undefined,
        dataset_role: 'calibration',
        condition_match_status: 'partial',
        condition_match_note: undefined,
      },
    });

    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') return;
    expect(result.reason_codes).toEqual(
      expect.arrayContaining([
        'test_fixture_data',
        'observation_review_pending',
        'dataset_not_independent',
        'conditions_not_matched',
      ]),
    );
    expect(result.assessment_status).toBe('not_assessed');
  });

  it('blocks an unreviewed literature candidate', () => {
    const result = assessExperimentalComparison({
      prediction: validRequest.prediction,
      observation: {
        ...validRequest.observation,
        source_kind: 'literature',
        review_status: 'pending',
        reviewed_by: undefined,
        reviewed_at: undefined,
      },
    });

    expect(result).toMatchObject({
      status: 'blocked',
      reason_codes: ['observation_review_pending'],
      assessment_status: 'not_assessed',
    });
  });

  it('does not accept assumptions or defaults as experimental observations', () => {
    const result = assessExperimentalComparison({
      prediction: validRequest.prediction,
      observation: {
        ...validRequest.observation,
        source_kind: 'assumption',
      },
    });

    expect(result).toMatchObject({
      status: 'blocked',
      reason_codes: ['observation_not_experimental'],
      assessment_status: 'not_assessed',
    });
  });

  it('requires exact metric and unit matches and does not perform conversions', () => {
    const result = assessExperimentalComparison({
      prediction: validRequest.prediction,
      observation: {
        ...validRequest.observation,
        metric_key: 'current_density_a_m2',
        unit: 'mA/cm2',
      },
    });

    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') return;
    expect(result.reason_codes).toEqual(
      expect.arrayContaining(['metric_key_mismatch', 'unit_mismatch']),
    );
  });

  it('requires both coordinates to be present and exactly aligned', () => {
    const withoutCoordinate = assessExperimentalComparison({
      prediction: {
        ...validRequest.prediction,
        coordinate: { axis_key: 'time', value: 2, unit: 'day' },
      },
      observation: validRequest.observation,
    });
    expect(withoutCoordinate).toMatchObject({
      status: 'blocked',
      reason_codes: ['coordinate_presence_mismatch'],
    });

    const mismatchedCoordinate = assessExperimentalComparison({
      prediction: {
        ...validRequest.prediction,
        coordinate: { axis_key: 'time', value: 2, unit: 'day' },
      },
      observation: {
        ...validRequest.observation,
        coordinate: { axis_key: 'time', value: 2.1, unit: 'day' },
      },
    });
    expect(mismatchedCoordinate).toMatchObject({
      status: 'blocked',
      reason_codes: ['coordinate_mismatch'],
    });
  });

  it('requires reviewer and condition-match provenance for approval', () => {
    const result = assessExperimentalComparison({
      prediction: validRequest.prediction,
      observation: {
        ...validRequest.observation,
        reviewed_by: undefined,
        reviewed_at: undefined,
        condition_match_note: undefined,
      },
    });

    expect(result).toMatchObject({
      status: 'blocked',
      reason_codes: ['invalid_observation'],
      assessment_status: 'not_assessed',
    });
  });

  it('blocks malformed and non-finite comparisons', () => {
    expect(assessExperimentalComparison(null)).toMatchObject({
      status: 'blocked',
      reason_codes: ['invalid_request'],
    });

    expect(
      assessExperimentalComparison({
        ...validRequest,
        prediction: { ...validRequest.prediction, value: Number.NaN },
      }),
    ).toMatchObject({
      status: 'blocked',
      reason_codes: ['invalid_prediction'],
    });

    expect(
      assessExperimentalComparison({
        ...validRequest,
        prediction: { ...validRequest.prediction, source_kind: 'measured' },
      }),
    ).toMatchObject({
      status: 'blocked',
      reason_codes: ['invalid_prediction'],
    });

    expect(
      assessExperimentalComparison({
        prediction: { ...validRequest.prediction, value: Number.MAX_VALUE },
        observation: { ...validRequest.observation, value: -Number.MAX_VALUE },
      }),
    ).toMatchObject({
      status: 'blocked',
      reason_codes: ['non_finite_residual'],
    });
  });
});
