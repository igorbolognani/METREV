import { describe, expect, it } from 'vitest';
import {
  compareStructuredCellSpatialObservations,
  spatialObservationComparisonRequestSchema,
  structuredCellTopology,
  type SpatialObservationComparisonRequest,
} from '@metrev/domain-contracts';
import { structuredCellFixture } from '../fixtures/structured-cell';

function fixture(dimension: 2 | 3 = 2) {
  const input = structuredCellFixture(dimension);
  const mesh = structuredCellTopology(input);
  const field = {
    id: 'liquid_potential',
    unit: 'V',
    cells: mesh.centers_m.map((_, index) => index),
    values: mesh.centers_m.map((_, index) => index / 100),
  };
  const request: SpatialObservationComparisonRequest = {
    contract_version: 'spatial-observation-comparison-v1',
    field_id: field.id,
    model_input_sha256: 'a'.repeat(64),
    purpose: 'development',
    mapping: {
      method: 'exact_cell_center',
      coordinate_tolerance_m: 0,
      boundary_tie_policy: 'reject_ambiguous',
    },
    dataset: {
      dataset_id: 'synthetic-observations',
      role: 'development',
      review_status: 'pending',
      used_for_model_development: true,
      condition_match: 'matched',
      condition_match_note: 'Synthetic residual verification only',
      support_kind: 'point_set',
      samples: [0, mesh.centers_m.length - 1].map((cell, index) => ({
        observation_id: `sample-${index}`,
        value: field.values[cell] - [3, -4][index],
        unit: 'V',
        source_kind: 'measured',
        source_ref: 'synthetic:test-only',
        source_locator: `fixture row ${index}`,
        position: {
          values: mesh.centers_m[cell],
          unit: 'm',
          source_ref: 'synthetic:mesh',
        },
        domain_tag: input.geometry.layers[mesh.region_index[cell]].tag,
        timestamp_s: null,
        replicate_id: null,
        uncertainty: {
          value: 2,
          unit: 'V',
          kind: 'standard_uncertainty',
          source_ref: 'synthetic:test-only',
        },
      })),
    },
  };
  const binding = {
    run_id: 'fixture-run',
    input_sha256: 'a'.repeat(64),
    mesh_sha256: 'b'.repeat(64),
    field_artifact_sha256: 'c'.repeat(64),
  };
  return { input, field, request, binding, mesh };
}

describe('explicit spatial observation mapping and residuals', () => {
  it.each([2, 3] as const)(
    'computes known error norms on %sD fields without promoting evidence',
    (dimension) => {
      const result = compareStructuredCellSpatialObservations(
        fixture(dimension),
      );
      expect(result.status).toBe('provisional_residuals_computed');
      expect(result.metrics).toMatchObject({
        mae: 3.5,
        discrete_l2: 5,
        l_infinity: 4,
      });
      expect(result.metrics?.rmse).toBeCloseTo(Math.sqrt(12.5));
      expect(
        result.samples.map((sample) => sample.standardized_residual),
      ).toEqual([1.5, -2]);
      expect(result).toMatchObject({
        decision_eligible: false,
        independent_validation: false,
        assessment_status: 'not_assessed',
      });
    },
  );

  it('maps electrode-only fields by global cell identity rather than local array position', () => {
    const options = fixture(3);
    const cells = options.field.cells.filter(
      (cell) => options.mesh.region_index[cell] === 2,
    );
    options.field = {
      id: 'solid_potential_cathode',
      unit: 'V',
      cells,
      values: cells.map((_, index) => 7 + index),
    };
    options.request.field_id = options.field.id;
    options.request.dataset.samples = [
      {
        ...options.request.dataset.samples[1],
        position: {
          values: options.mesh.centers_m[cells[1]],
          unit: 'm',
          source_ref: 'synthetic:mesh',
        },
        value: 5,
      },
    ];
    const result = compareStructuredCellSpatialObservations(options);
    expect(result.samples[0]).toMatchObject({
      cell_index: cells[1],
      predicted_value: 8,
      signed_residual: 3,
    });
    options.request.dataset.samples[0].domain_tag = 'anode';
    expect(
      compareStructuredCellSpatialObservations(options).reason_codes,
    ).toContain('observation_domain_unavailable');
  });

  it('rejects ambiguity at a cell face unless the caller declares a tie policy', () => {
    const options = fixture();
    const sample = options.request.dataset.samples[0];
    sample.position.values = [...options.mesh.centers_m[0]];
    sample.position.values[1] += options.mesh.sizes_m[0][1] / 2;
    options.request.dataset.samples = [sample];
    options.request.mapping.method = 'containing_cell_constant';
    expect(
      compareStructuredCellSpatialObservations(options).reason_codes,
    ).toContain('ambiguous_cell_mapping');
    options.request.mapping.boundary_tie_policy = 'lowest_cell_index';
    expect(
      compareStructuredCellSpatialObservations(options).samples[0].cell_index,
    ).toBe(0);
    sample.position.values[1] = 1;
    expect(
      compareStructuredCellSpatialObservations(options).reason_codes,
    ).toContain('coordinate_mapping_unavailable');
  });

  it('blocks mismatched hashes, units, conditions, timestamps and holdout leakage', () => {
    for (const [mutate, reason] of [
      [
        (o: ReturnType<typeof fixture>) => {
          o.request.model_input_sha256 = 'd'.repeat(64);
        },
        'model_input_mismatch',
      ],
      [
        (o: ReturnType<typeof fixture>) => {
          o.request.dataset.samples[0].unit = 'Pa';
          o.request.dataset.samples[0].uncertainty = null;
        },
        'unit_mismatch',
      ],
      [
        (o: ReturnType<typeof fixture>) => {
          o.request.dataset.condition_match = 'unknown';
        },
        'conditions_not_matched',
      ],
      [
        (o: ReturnType<typeof fixture>) => {
          o.request.dataset.samples[0].timestamp_s = 1;
        },
        'transient_observation_unsupported',
      ],
      [
        (o: ReturnType<typeof fixture>) => {
          o.request.purpose = 'independent_residual';
        },
        'dataset_not_independent_holdout',
      ],
    ] as const) {
      const options = fixture();
      mutate(options);
      expect(
        compareStructuredCellSpatialObservations(options).reason_codes,
      ).toContain(reason);
    }
    const options = fixture();
    options.request.purpose = 'independent_residual';
    Object.assign(options.request.dataset, {
      role: 'independent_validation',
      review_status: 'approved',
      used_for_model_development: false,
      reviewed_by: 'fixture-reviewer',
      reviewed_at: '2026-10-03T00:00:00Z',
    });
    expect(compareStructuredCellSpatialObservations(options)).toMatchObject({
      status: 'independent_residuals_computed',
      independent_validation: false,
    });
  });

  it('requires locators, unit-consistent uncertainty and unique observation identities', () => {
    const options = fixture();
    options.request.dataset.samples[0].source_locator = '';
    expect(
      spatialObservationComparisonRequestSchema.safeParse(options.request)
        .success,
    ).toBe(false);
    const next = fixture();
    next.request.dataset.samples[1].observation_id =
      next.request.dataset.samples[0].observation_id;
    expect(
      spatialObservationComparisonRequestSchema.safeParse(next.request).success,
    ).toBe(false);
  });
});
