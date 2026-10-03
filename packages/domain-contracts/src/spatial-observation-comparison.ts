import { z } from 'zod';
import {
  structuredCellInputSchema,
  type StructuredCellInput,
} from './structured-cell-schema';
import { structuredCellTopology } from './structured-cell-topology';
import { validateStructuredCellFieldSamples } from './structured-cell-field-reduction';

const text = z.string().trim().min(1).max(300);
const finite = z.number().finite();
export const spatialObservationComparisonRequestSchema = z
  .object({
    contract_version: z.literal('spatial-observation-comparison-v1'),
    field_id: text,
    model_input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    purpose: z.enum(['development', 'independent_residual']),
    mapping: z
      .object({
        method: z.enum(['exact_cell_center', 'containing_cell_constant']),
        coordinate_tolerance_m: finite.nonnegative().max(1e-6),
        boundary_tie_policy: z.enum(['reject_ambiguous', 'lowest_cell_index']),
      })
      .strict(),
    dataset: z
      .object({
        dataset_id: text,
        role: z.enum(['development', 'calibration', 'independent_validation']),
        review_status: z.enum(['pending', 'approved', 'rejected']),
        reviewed_by: text.optional(),
        reviewed_at: z.string().datetime().optional(),
        used_for_model_development: z.boolean(),
        condition_match: z.enum(['matched', 'partial', 'mismatch', 'unknown']),
        condition_match_note: text,
        support_kind: z.enum([
          'point_set',
          'line_profile',
          'surface_samples',
          'volume_samples',
        ]),
        samples: z
          .array(
            z
              .object({
                observation_id: text,
                value: finite,
                unit: text,
                source_kind: z.enum(['measured', 'literature']),
                source_ref: text,
                source_locator: text,
                position: z
                  .object({
                    values: z.array(finite).min(2).max(3),
                    unit: z.literal('m'),
                    source_ref: text,
                  })
                  .strict(),
                domain_tag: text,
                timestamp_s: finite.nonnegative().nullable(),
                replicate_id: text.nullable(),
                uncertainty: z
                  .object({
                    value: finite.nonnegative(),
                    unit: text,
                    kind: z.enum([
                      'standard_uncertainty',
                      'interval_half_width',
                    ]),
                    source_ref: text,
                  })
                  .strict()
                  .nullable(),
              })
              .strict(),
          )
          .min(1)
          .max(4096),
      })
      .strict(),
  })
  .strict()
  .superRefine((request, ctx) => {
    const data = request.dataset;
    if (
      new Set(data.samples.map((s) => s.observation_id)).size !==
      data.samples.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['dataset', 'samples'],
        message: 'Observation identifiers must be unique',
      });
    if (
      data.review_status === 'approved' &&
      (!data.reviewed_by || !data.reviewed_at)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['dataset', 'reviewed_by'],
        message: 'Approved source review requires reviewer/time metadata',
      });
    data.samples.forEach((s, i) => {
      if (s.uncertainty && s.uncertainty.unit !== s.unit)
        ctx.addIssue({
          code: 'custom',
          path: ['dataset', 'samples', i, 'uncertainty'],
          message: 'Reported uncertainty must use the observation unit',
        });
    });
  });
export type SpatialObservationComparisonRequest = z.infer<
  typeof spatialObservationComparisonRequestSchema
>;

/** Equal-weight residuals at explicitly mapped observations; no pass/fail or evidence promotion. */
export function compareStructuredCellSpatialObservations(options: {
  request: SpatialObservationComparisonRequest;
  input: StructuredCellInput;
  field: unknown;
  binding: {
    run_id: string;
    input_sha256: string;
    mesh_sha256: string;
    field_artifact_sha256: string;
  };
}) {
  const request = spatialObservationComparisonRequestSchema.parse(
    options.request,
  );
  const input = structuredCellInputSchema.parse(options.input);
  const field = validateStructuredCellFieldSamples(options.field, input);
  const base = {
    contract_version: 'spatial-observation-residual-result-v1',
    assessment_status: 'not_assessed',
    decision_eligible: false,
    independent_validation: false,
    mapping: request.mapping,
    binding: options.binding,
    dataset_id: request.dataset.dataset_id,
    dataset_role: request.dataset.role,
    source_review_status: request.dataset.review_status,
    support_kind: request.dataset.support_kind,
    condition_match_note: request.dataset.condition_match_note,
    model_id: input.model_id,
    dimension: input.dimension,
    field_id: field.id,
    unit: field.unit,
  };
  const reasons: string[] = [];
  if (request.model_input_sha256 !== options.binding.input_sha256)
    reasons.push('model_input_mismatch');
  if (request.field_id !== field.id) reasons.push('field_identity_mismatch');
  if (request.dataset.condition_match !== 'matched')
    reasons.push('conditions_not_matched');
  if (request.dataset.review_status === 'rejected')
    reasons.push('source_review_rejected');
  if (request.purpose === 'independent_residual') {
    if (request.dataset.review_status !== 'approved')
      reasons.push('source_review_pending');
    if (
      request.dataset.role !== 'independent_validation' ||
      request.dataset.used_for_model_development
    )
      reasons.push('dataset_not_independent_holdout');
  }
  if (request.dataset.samples.some((s) => s.timestamp_s !== null))
    reasons.push('transient_observation_unsupported');
  if (request.dataset.samples.some((s) => s.unit !== field.unit))
    reasons.push('unit_mismatch');
  if (
    request.dataset.samples.some(
      (s) => s.position.values.length !== input.dimension,
    )
  )
    reasons.push('coordinate_rank_mismatch');
  const blocked = (codes: string[]) => ({
    ...base,
    status: 'blocked',
    reason_codes: [...new Set(codes)],
    samples: [],
    metrics: null,
  });
  if (reasons.length) return blocked(reasons);
  const mesh = structuredCellTopology(input);
  const [, ny, nz = 1] = mesh.shape;
  const valueByCell = new Map(
    field.cells.map((cell, index) => [cell, field.values[index]]),
  );
  const availableRegions = new Set(
    field.cells.map((cell) => mesh.region_index[cell]),
  );
  const transverseStride = input.dimension === 3 ? nz : 1;
  const axes = Array.from({ length: input.dimension }, (_, axis) =>
    Array.from({ length: mesh.shape[axis] }, (_, i) => {
      const cell =
        axis === 0
          ? i * ny * transverseStride
          : axis === 1
            ? i * transverseStride
            : i;
      return {
        center: mesh.centers_m[cell][axis],
        width: mesh.sizes_m[cell][axis],
      };
    }),
  );
  const regionByTag = new Map(
    input.geometry.layers.map((layer, index) => [layer.tag, index]),
  );
  const axisCandidates = (
    axis: number,
    coordinate: number,
    tolerance: number,
  ) =>
    axes[axis].flatMap((cell, index) => {
      const matches =
        request.mapping.method === 'exact_cell_center'
          ? Math.abs(coordinate - cell.center) <= tolerance
          : Math.abs(coordinate - cell.center) <= cell.width / 2 + tolerance;
      return matches ? [index] : [];
    });
  const samples: {
    observation: SpatialObservationComparisonRequest['dataset']['samples'][number];
    cell_index: number;
    cell_center_m: number[];
    predicted_value: number;
    signed_residual: number;
    absolute_error: number;
    standardized_residual: number | null;
  }[] = [];
  for (const observation of request.dataset.samples) {
    const region = regionByTag.get(observation.domain_tag);
    if (region === undefined || !availableRegions.has(region))
      return blocked(['observation_domain_unavailable']);
    const point = observation.position.values,
      tolerance = request.mapping.coordinate_tolerance_m;
    const axisMatches = point.map((coordinate, axis) =>
      axisCandidates(axis, coordinate, tolerance),
    );
    if (axisMatches.some((matches) => matches.length === 0))
      return blocked(['coordinate_mapping_unavailable']);
    const matching: number[] = [];
    for (const i of axisMatches[0])
      for (const j of axisMatches[1]) {
        if (input.dimension === 2) {
          const cell = i * ny + j;
          if (mesh.region_index[cell] === region) matching.push(cell);
        } else {
          for (const k of axisMatches[2]) {
            const cell = (i * ny + j) * nz + k;
            if (mesh.region_index[cell] === region) matching.push(cell);
          }
        }
      }
    if (!matching.length) return blocked(['coordinate_mapping_unavailable']);
    if (
      matching.length > 1 &&
      request.mapping.boundary_tie_policy === 'reject_ambiguous'
    )
      return blocked(['ambiguous_cell_mapping']);
    const cell = Math.min(...matching),
      predicted = valueByCell.get(cell)!;
    const residual = predicted - observation.value;
    if (!Number.isFinite(residual)) return blocked(['nonfinite_residual']);
    samples.push({
      observation,
      cell_index: cell,
      cell_center_m: mesh.centers_m[cell],
      predicted_value: predicted,
      signed_residual: residual,
      absolute_error: Math.abs(residual),
      standardized_residual:
        observation.uncertainty?.kind === 'standard_uncertainty' &&
        observation.uncertainty.value > 0
          ? residual / observation.uncertainty.value
          : null,
    });
  }
  // Scaling prevents overflow in squares while preserving deterministic equal sample weights.
  const errors = samples.map((s) => s.signed_residual);
  const scale = Math.max(...errors.map(Math.abs));
  const scaledSquareSum =
    scale === 0 ? 0 : errors.reduce((sum, e) => sum + (e / scale) ** 2, 0);
  const rmse = scale * Math.sqrt(scaledSquareSum / errors.length);
  const l2 = scale * Math.sqrt(scaledSquareSum);
  const mae = samples.reduce(
    (sum, s) => sum + s.absolute_error / samples.length,
    0,
  );
  if (![rmse, l2, mae].every(Number.isFinite))
    return blocked(['nonfinite_residual_metrics']);
  const perDomain = input.geometry.layers.flatMap((layer) => {
    const entries = samples.filter(
      (s) => s.observation.domain_tag === layer.tag,
    );
    return entries.length
      ? [
          {
            domain_tag: layer.tag,
            sample_count: entries.length,
            mae: entries.reduce(
              (sum, s) => sum + s.absolute_error / entries.length,
              0,
            ),
            max_error: Math.max(...entries.map((s) => s.absolute_error)),
          },
        ]
      : [];
  });
  return {
    ...base,
    status:
      request.purpose === 'development'
        ? 'provisional_residuals_computed'
        : 'independent_residuals_computed',
    reason_codes: [],
    samples,
    metrics: {
      sample_count: samples.length,
      weighting: 'equal_observation_weights',
      rmse,
      mae,
      discrete_l2: l2,
      l_infinity: scale,
      unit: field.unit,
      by_domain: perDomain,
      integrated_flux_residual: null,
      correlation: null,
    },
    interpretation:
      'Residuals only under the declared mapping and conditions. Source review assertions are retained; validation, threshold acceptance and predictive accuracy have not been assessed.',
    unsupported: [
      'transient_field_mapping',
      'continuous_surface_volume_integrals',
      'implicit_interpolation',
      'automatic_unit_conversion',
    ],
  };
}
