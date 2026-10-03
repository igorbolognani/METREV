import { describe, expect, it } from 'vitest';
import {
  deriveStructuredCellFieldReduction,
  structuredCellFieldReductionRequestSchema,
  structuredCellFieldReductionSchema,
  structuredCellTopology,
  validateStructuredCellFieldSamples,
  assertStructuredCellFieldReductionBinding,
} from '@metrev/domain-contracts';
import { structuredCellFixture } from '../fixtures/structured-cell';

function fixture(dimension: 2 | 3 = 2) {
  const input = structuredCellFixture(dimension);
  input.geometry.layers.forEach((layer, index) => {
    layer.width_m.value *= index + 1;
  });
  input.geometry.lengths_m[0].value = 0.0006;
  const mesh = structuredCellTopology(input);
  const cells = mesh.centers_m.map((_, index) => index);
  const source = (
    id: string,
    unit: 'mol/m3' | 'V' | 'A/m3',
    values: number[],
    selected = cells,
  ) => ({
    samples: { id, unit, values, cells: selected },
    artifact_sha256: 'c'.repeat(64),
  });
  const fields = [
    source(
      'concentration_reduced',
      'mol/m3',
      cells.map((cell) => mesh.region_index[cell] + 1),
    ),
    source(
      'faradaic_current_density',
      'A/m3',
      cells.map((cell) => [3, 0, -3][mesh.region_index[cell]]),
    ),
    source(
      'liquid_potential',
      'V',
      cells.map(() => 0.1),
    ),
    ...(['anode', 'cathode'] as const).map((role, index) => {
      const selected = cells.filter(
        (cell) => mesh.region_index[cell] === index * 2,
      );
      return source(
        'solid_potential_' + role,
        'V',
        selected.map(() => (index === 0 ? 0.2 : 0.4)),
        selected,
      );
    }),
  ];
  const options = {
    input,
    input_sha256: 'a'.repeat(64),
    mesh_sha256: 'b'.repeat(64),
    geometry_request_sha256: 'd'.repeat(64),
    numerical_status: 'converged' as const,
    fields,
  };
  return { input, mesh, fields, options };
}

describe('physical volume weighted modeled field reduction', () => {
  it.each([2, 3] as const)(
    'weights %sD nonuniform cell volumes and exposes signed current with provenance',
    (dimension) => {
      const { input, options } = fixture(dimension);
      const reduction = deriveStructuredCellFieldReduction(options);
      const concentration = reduction.fields.find(
        (f) => f.field_id === 'concentration_reduced',
      )!;
      expect(concentration.global.volume_weighted_mean).toBeCloseTo(14 / 6, 12);
      expect(concentration.global.physical_integral).toBeCloseTo(
        (14 / 6) * 0.0006 * 0.001 * 0.001,
        18,
      );
      expect(concentration.global.physical_integral_unit).toBe('mol');
      expect(
        concentration.domains.map((d) => d.statistics.volume_weighted_mean),
      ).toEqual([1, 2, 3]);
      const current = reduction.fields.find(
        (f) => f.field_id === 'faradaic_current_density',
      )!;
      expect(current.domains[0].statistics.current_rms_uniformity).toBe(1);
      expect(current.domains[1].statistics.current_rms_uniformity).toBeNull();
      expect(current.domains[2].statistics.physical_integral).toBeLessThan(0);
      expect(current.domains[2].statistics.physical_integral_unit).toBe('A');
      expect(
        reduction.electrode_overpotentials[0].statistics.maximum.value,
      ).toBeCloseTo(0.1);
      expect(
        reduction.electrode_overpotentials[0].equilibrium_potential,
      ).toEqual(input.electrodes[0].equilibrium_potential);
      expect(
        reduction.electrode_overpotentials[0].source_fields.map(
          (f) => f.field_id,
        ),
      ).toEqual(['solid_potential_anode', 'liquid_potential']);
      expect(reduction).toMatchObject({
        decision_eligible: false,
        independent_validation: false,
        threshold_regions: [],
      });
      expect(
        reduction.unsupported_observables.map((o) => o.observable),
      ).toContain('pressure_drop');
    },
  );

  it('applies only explicit source-backed thresholds and uses volume fractions with finite-volume positions', () => {
    const { options, mesh } = fixture();
    const threshold = {
      threshold_id: 'explicit_candidate_bound',
      field_id: 'concentration_reduced',
      domain_tag: null,
      comparison: 'lt' as const,
      threshold: {
        value: 2.5,
        unit: 'mol/m3',
        source_kind: 'assumption' as const,
        source_ref: 'user:requested-comparison',
        source_locator: 'Study question; no independent validation',
        conditions: { temperature_K: '298.15' },
      },
    };
    const reduction = deriveStructuredCellFieldReduction({
      ...options,
      thresholds: [threshold],
      threshold_request_sha256: 'e'.repeat(64),
    });
    const region = reduction.threshold_regions[0];
    expect(region.volume_fraction).toBeCloseTo(0.5, 14);
    expect(region.threshold).toEqual(threshold.threshold);
    expect(region.representative_cells[0].cell_center_m).toEqual(
      mesh.centers_m[0],
    );
    expect(region.record_kind).toBe('modeled_threshold_region');
    expect(reduction.threshold_request_sha256).toBe('e'.repeat(64));
    expect(() =>
      deriveStructuredCellFieldReduction({
        ...options,
        thresholds: [threshold],
      }),
    ).toThrow('Explicit thresholds require their request digest');
    expect(() =>
      deriveStructuredCellFieldReduction({
        ...options,
        thresholds: [
          { ...threshold, threshold: { ...threshold.threshold, unit: 'g/L' } },
        ],
        threshold_request_sha256: 'e'.repeat(64),
      }),
    ).toThrow('SI unit');
    expect(() =>
      deriveStructuredCellFieldReduction({
        ...options,
        thresholds: [{ ...threshold, domain_tag: 'missing' }],
        threshold_request_sha256: 'e'.repeat(64),
      }),
    ).toThrow('domain');
    expect(
      structuredCellFieldReductionRequestSchema.safeParse({
        thresholds: [
          { ...threshold, threshold: { value: 2.5, unit: 'mol/m3' } },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects artifact/mesh/field topology tampering and automatic decision promotion', () => {
    const { options, input, fields } = fixture();
    const reduction = deriveStructuredCellFieldReduction(options);
    expect(() =>
      validateStructuredCellFieldSamples(
        { ...fields[0].samples, cells: fields[0].samples.cells.map(() => 0) },
        input,
      ),
    ).toThrow('topology');
    expect(() =>
      validateStructuredCellFieldSamples(
        { ...fields[0].samples, unit: 'V' },
        input,
      ),
    ).toThrow('unit');
    const current = fields[1].samples;
    expect(() =>
      validateStructuredCellFieldSamples(
        { ...current, values: current.values.map(() => 1) },
        input,
      ),
    ).toThrow('topology');
    expect(
      structuredCellFieldReductionSchema.safeParse({
        ...reduction,
        decision_eligible: true,
      }).success,
    ).toBe(false);
    const manifests = reduction.fields.map((f) => ({
      field_id: f.field_id,
      unit: f.unit,
      domain_tags: f.domains.map((d) => d.domain_tag),
      artifact: { sha256: f.field_artifact_sha256, dataset_path: '/values' },
      summary: {
        sample_count: f.global.sample_count,
        minimum: f.global.minimum.value,
        maximum: f.global.maximum.value,
        mean: f.global.volume_weighted_mean,
        integral:
          f.global.physical_integral / input.geometry.out_of_plane_depth!.value,
      },
    }));
    const result = {
      input_sha256: options.input_sha256,
      mesh: {
        artifact: { sha256: options.mesh_sha256 },
        request_sha256: options.geometry_request_sha256,
      },
      fields: manifests,
      convergence: [{ status: 'converged' }],
      conservation_residuals: [{ passed: true }],
    };
    expect(() =>
      assertStructuredCellFieldReductionBinding(reduction, result, input),
    ).not.toThrow();
    expect(() =>
      assertStructuredCellFieldReductionBinding(
        { ...reduction, mesh_sha256: 'f'.repeat(64) },
        result,
        input,
      ),
    ).toThrow('identity');
    expect(() =>
      assertStructuredCellFieldReductionBinding(
        reduction,
        { ...result, convergence: [{ status: 'not_converged' }] },
        input,
      ),
    ).toThrow('numerical role');
    expect(() =>
      assertStructuredCellFieldReductionBinding(
        reduction,
        {
          ...result,
          fields: manifests.map((f, index) =>
            index === 0
              ? { ...f, artifact: { ...f.artifact, sha256: 'f'.repeat(64) } }
              : f,
          ),
        },
        input,
      ),
    ).toThrow('manifest');
  });

  it('retains nonconverged reductions only as failed diagnostics and limits threshold coordinates', () => {
    const { options } = fixture();
    options.input.geometry.transverse_cells = [40];
    const mesh = structuredCellTopology(options.input);
    const samples = {
      id: 'concentration_reduced',
      unit: 'mol/m3' as const,
      cells: mesh.centers_m.map((_, i) => i),
      values: mesh.centers_m.map(() => 1),
    };
    const reduction = deriveStructuredCellFieldReduction({
      ...options,
      numerical_status: 'not_converged',
      fields: [{ samples, artifact_sha256: 'c'.repeat(64) }],
      thresholds: [
        {
          threshold_id: 'all',
          field_id: samples.id,
          domain_tag: null,
          comparison: 'lte',
          threshold: {
            value: 1,
            unit: 'mol/m3',
            source_kind: 'test_fixture',
            source_ref: 'fixture:bound',
          },
        },
      ],
      threshold_request_sha256: 'e'.repeat(64),
    });
    expect(reduction.result_role).toBe('failed_run_diagnostics');
    expect(reduction.threshold_regions[0].volume_fraction).toBe(1);
    expect(reduction.threshold_regions[0].representative_cells).toHaveLength(
      64,
    );
    expect(reduction.threshold_regions[0].omitted_matching_cells).toBe(
      mesh.centers_m.length - 64,
    );
    expect(reduction.electrode_overpotentials).toEqual([]);
  });
});
