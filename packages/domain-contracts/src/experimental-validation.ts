import { z } from 'zod';

const requiredTextSchema = z.string().trim().min(1);

export const experimentalComparisonCoordinateSchema = z
  .object({
    axis_key: requiredTextSchema,
    value: z.number().finite(),
    unit: requiredTextSchema,
  })
  .strict();

export const experimentalModelPredictionSchema = z
  .object({
    metric_key: requiredTextSchema,
    value: z.number().finite(),
    unit: requiredTextSchema,
    source_kind: z.literal('modeled'),
    model_version: requiredTextSchema,
    model_run_ref: requiredTextSchema,
    source_ref: requiredTextSchema,
    coordinate: experimentalComparisonCoordinateSchema.optional(),
  })
  .strict();

export const experimentalObservationSchema = z
  .object({
    observation_id: requiredTextSchema,
    metric_key: requiredTextSchema,
    value: z.number().finite(),
    unit: requiredTextSchema,
    source_kind: z.enum([
      'measured',
      'literature',
      'default',
      'assumption',
      'test_fixture',
    ]),
    source_ref: requiredTextSchema,
    review_status: z.enum(['pending', 'approved', 'rejected']),
    reviewed_by: requiredTextSchema.optional(),
    reviewed_at: z.string().datetime().optional(),
    dataset_role: z.enum([
      'independent_validation',
      'calibration',
      'training',
      'test_fixture',
      'unknown',
    ]),
    condition_match_status: z.enum([
      'matched',
      'partial',
      'mismatch',
      'unknown',
    ]),
    condition_match_note: requiredTextSchema.optional(),
    coordinate: experimentalComparisonCoordinateSchema.optional(),
  })
  .strict()
  .superRefine((observation, context) => {
    if (
      observation.review_status === 'approved' &&
      (!observation.reviewed_by || !observation.reviewed_at)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reviewed_by'],
        message:
          'An approved observation requires reviewer identity and review time.',
      });
    }

    if (
      observation.condition_match_status === 'matched' &&
      !observation.condition_match_note
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['condition_match_note'],
        message: 'A matched condition assessment requires a review note.',
      });
    }
  });

export const experimentalComparisonRequestSchema = z
  .object({
    prediction: experimentalModelPredictionSchema,
    observation: experimentalObservationSchema,
  })
  .strict();

export const experimentalComparisonReasonSchema = z.enum([
  'invalid_request',
  'invalid_prediction',
  'invalid_observation',
  'observation_not_experimental',
  'test_fixture_data',
  'observation_review_pending',
  'observation_review_rejected',
  'dataset_not_independent',
  'conditions_not_matched',
  'metric_key_mismatch',
  'unit_mismatch',
  'coordinate_presence_mismatch',
  'coordinate_mismatch',
  'non_finite_residual',
]);

const experimentalComparisonResultBaseSchema = z.object({
  assessment_status: z.literal('not_assessed'),
});

export const experimentalComparisonBlockedResultSchema =
  experimentalComparisonResultBaseSchema.extend({
    status: z.literal('blocked'),
    reason_codes: z.array(experimentalComparisonReasonSchema).min(1),
  });

export const experimentalComparisonResidualResultSchema =
  experimentalComparisonResultBaseSchema.extend({
    status: z.literal('residual_computed'),
    reason_codes: z.array(experimentalComparisonReasonSchema).length(0),
    model_version: requiredTextSchema,
    model_run_ref: requiredTextSchema,
    prediction_source_ref: requiredTextSchema,
    observation_id: requiredTextSchema,
    observation_source_ref: requiredTextSchema,
    metric_key: requiredTextSchema,
    unit: requiredTextSchema,
    predicted_value: z.number().finite(),
    observed_value: z.number().finite(),
    signed_residual: z.number().finite(),
    absolute_error: z.number().finite().nonnegative(),
    coordinate: experimentalComparisonCoordinateSchema.optional(),
    interpretation: requiredTextSchema,
  });

export const experimentalComparisonResultSchema = z.discriminatedUnion(
  'status',
  [
    experimentalComparisonBlockedResultSchema,
    experimentalComparisonResidualResultSchema,
  ],
);

export type ExperimentalComparisonCoordinate = z.infer<
  typeof experimentalComparisonCoordinateSchema
>;
export type ExperimentalComparisonRequest = z.infer<
  typeof experimentalComparisonRequestSchema
>;
export type ExperimentalComparisonReason = z.infer<
  typeof experimentalComparisonReasonSchema
>;
export type ExperimentalComparisonResult = z.infer<
  typeof experimentalComparisonResultSchema
>;
