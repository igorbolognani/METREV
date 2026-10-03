import { describe, expect, it } from 'vitest';
import {
  coupledCell1dInputSchema,
  evaluateSpatialField,
  evaluateSpatialMaterialField,
  normalizeCaseInput,
  rawCaseInputSchema,
  spatialFieldSchema,
} from '@metrev/domain-contracts';
import {
  compileElectrochemicalModel,
  evaluateSimulationEnrichment,
  runConfiguredElectrochemicalModel,
} from '@metrev/electrochem-models';
import rawCaseFixture from '../fixtures/raw-case-input.json';
import { fixture, q } from '../fixtures/coupled-cell-1d';

const point = {
  dimension: 1 as const,
  domain_tag: 'anode',
  domain_kind: 'anode',
  position_m: [0.0005],
};
const constant = <U extends string>(value: number, unit: U) => ({
  kind: 'constant' as const,
  value: q(value, unit),
});

function fieldCell() {
  const original = fixture();
  const { cells: _cells, ...anode } = original.anode;
  const { segments: _segments, ...membrane } = original.membrane;
  return {
    ...original,
    anode,
    membrane,
    field_profiles: {
      anode: {
        domain_tag: 'anode',
        cell_count: 12,
        porosity: {
          kind: 'sampled' as const,
          interpolation: 'linear' as const,
          samples: [
            { position_m: [0], value: q(0.4, '1') },
            { position_m: [0.001], value: q(0.6, '1') },
          ],
        },
        tortuosity: constant(2, '1'),
        specificSurfaceArea: constant(1000, 'm2/m3'),
        accessibleAreaFraction: constant(0.5, '1'),
        anodePotential: constant(0.1, 'V'),
      },
      membrane: {
        domain_tag: 'membrane',
        segment_count: 12,
        porosity: {
          kind: 'piecewise' as const,
          regions: [{ tag: 'membrane', value: q(0.5, '1') }],
        },
        tortuosity: constant(2, '1'),
      },
    },
  };
}

describe('source-backed spatial coefficient runtime', () => {
  it('evaluates scalar and domain-owned piecewise coefficients with their provenance', () => {
    expect(
      evaluateSpatialMaterialField('porosity', constant(0.5, '1'), point),
    ).toMatchObject({
      quantity: q(0.5, '1'),
      method: 'constant',
    });
    expect(
      evaluateSpatialMaterialField(
        'porosity',
        {
          kind: 'piecewise',
          regions: [{ tag: 'anode', value: q(0.4, '1') }],
        },
        point,
      ).quantity.value,
    ).toBe(0.4);
    expect(() =>
      evaluateSpatialMaterialField(
        'porosity',
        {
          kind: 'piecewise',
          regions: [{ tag: 'other', value: q(0.4, '1') }],
        },
        point,
      ),
    ).toThrow(/No field value/);
  });

  it.each([1, 2, 3] as const)(
    'reproduces a linear manufactured field in %i dimensions',
    (dimension) => {
      const samples = Array.from({ length: 2 ** dimension }, (_, corner) => {
        const position_m = Array.from(
          { length: dimension },
          (_, axis) => (corner >> axis) & 1,
        );
        return {
          position_m,
          value: {
            ...q(
              1 +
                position_m.reduce(
                  (sum, coordinate, axis) => sum + (axis + 1) * coordinate,
                  0,
                ),
              'Pa',
            ),
            uncertainty: 0.2,
            uncertainty_unit: 'Pa',
          },
        };
      });
      const result = evaluateSpatialMaterialField(
        'pressure_pa',
        {
          kind: 'sampled',
          interpolation: 'linear',
          samples,
        },
        {
          dimension,
          domain_tag: 'liquid',
          domain_kind: 'bulk_liquid',
          position_m: Array(dimension).fill(0.25),
        },
      );
      expect(result.quantity.value).toBeCloseTo(
        1 + (0.25 * dimension * (dimension + 1)) / 2,
        13,
      );
      expect(
        result.contributors.reduce(
          (sum, contributor) => sum + contributor.weight,
          0,
        ),
      ).toBeCloseTo(1, 13);
      expect(result.quantity.source_kind).toBe('assumption');
      expect(result.quantity.source_locator).toContain(
        'test-fixture://coupled-cell-1d',
      );
      expect(result.quantity.uncertainty).toBeCloseTo(0.2, 13);
    },
  );

  it('rejects unit, range, identity, extrapolation, incomplete-grid and ambiguous-nearest requests', () => {
    expect(() =>
      evaluateSpatialMaterialField('porosity', constant(0.5, 'S/m'), point),
    ).toThrow(/unit/);
    expect(() =>
      evaluateSpatialMaterialField('porosity', constant(1.1, '1'), point),
    ).toThrow(/bounds/);
    expect(() =>
      evaluateSpatialMaterialField('unregistered', constant(1, '1'), point),
    ).toThrow(/Unknown/);
    expect(() =>
      evaluateSpatialMaterialField('porosity', constant(0.5, '1'), {
        ...point,
        domain_kind: 'gas',
      }),
    ).toThrow(/incompatible/);
    const sampled = {
      kind: 'sampled' as const,
      interpolation: 'linear' as const,
      samples: [
        { position_m: [0], value: q(0.4, '1') },
        { position_m: [1], value: q(0.6, '1') },
      ],
    };
    expect(() =>
      evaluateSpatialMaterialField('porosity', sampled, {
        ...point,
        position_m: [2],
      }),
    ).toThrow(/extrapolation/);
    expect(() =>
      evaluateSpatialMaterialField(
        'porosity',
        { ...sampled, interpolation: 'nearest' },
        { ...point, position_m: [0.5] },
      ),
    ).toThrow(/ambiguous/);
    expect(() =>
      evaluateSpatialField(
        {
          ...sampled,
          samples: [
            { position_m: [0, 0], value: q(0, 'Pa') },
            { position_m: [1, 1], value: q(1, 'Pa') },
          ],
        },
        { dimension: 2, domain_tag: 'liquid', position_m: [0.5, 0.5] },
        'Pa',
      ),
    ).toThrow(/every tensor-product/);
    expect(() =>
      evaluateSpatialMaterialField('species_valence', constant(0.5, '1'), {
        ...point,
        domain_kind: 'bulk_liquid',
      }),
    ).toThrow(/bounds/);
  });

  it('rejects duplicated sample locations, unit mixtures, and unverified artifacts', () => {
    expect(
      spatialFieldSchema.safeParse({
        kind: 'sampled',
        interpolation: 'linear',
        samples: [
          { position_m: [0], value: q(1, 'Pa') },
          { position_m: [0], value: q(2, 'Pa') },
        ],
      }).success,
    ).toBe(false);
    expect(
      spatialFieldSchema.safeParse({
        kind: 'piecewise',
        regions: [
          { tag: 'a', value: q(1, 'Pa') },
          { tag: 'b', value: q(2, 'K') },
        ],
      }).success,
    ).toBe(false);
    expect(() =>
      evaluateSpatialField(
        {
          kind: 'artifact',
          uri: 'private://field',
          sha256: 'a'.repeat(64),
          unit: 'Pa',
          source_kind: 'test_fixture',
          source_ref: 'test-fixture://artifact',
          format: 'HDF5',
        },
        point,
        'Pa',
      ),
    ).toThrow(/hash-verified/);
  });
});

describe('field-driven cell composition integration', () => {
  it('generates physical-center coefficients, reproduces the cellwise solver and survives reload', () => {
    const compiled = coupledCell1dInputSchema.parse(fieldCell());
    expect(compiled.anode.cells).toHaveLength(12);
    expect(compiled.anode.cells[0].porosity.value).toBeCloseTo(
      0.4 + 0.2 / 24,
      13,
    );
    expect(compiled.anode.cells[11].porosity.value).toBeCloseTo(
      0.6 - 0.2 / 24,
      13,
    );
    expect(compiled.field_profiles).toBeDefined();
    expect(
      coupledCell1dInputSchema.parse(JSON.parse(JSON.stringify(compiled))),
    ).toEqual(compiled);
    const withFields = runConfiguredElectrochemicalModel({
      model: 'coupled-cell-1d-restricted-v1',
      cell: compiled,
    });
    const { field_profiles: _profiles, ...cellwise } = compiled;
    const withCells = runConfiguredElectrochemicalModel({
      model: 'coupled-cell-1d-restricted-v1',
      cell: cellwise,
    });
    expect(withFields.result).toEqual(withCells.result);
    expect(withFields.composition.status).toBe('ready');
    expect(
      withFields.composition.bindings.find(
        (binding) => binding.module_id === 'anode',
      )?.implementation_id,
    ).toBe('porous-anode-1d.local-transport-reaction');
  });

  it('persists source field declarations and compiled cells in the evaluation snapshot', () => {
    const raw = rawCaseInputSchema.parse({
      ...rawCaseFixture,
      mechanistic_model: {
        model_version: 'coupled-cell-1d-restricted-v1',
        model_fidelity_id: 'coupled-cell-1d-restricted-v1',
        system_type: 'MFC',
        cell_1d: fieldCell(),
      },
    });
    const result = evaluateSimulationEnrichment({
      normalizedCase: normalizeCaseInput(raw),
    });
    expect(result.status).toBe('completed');
    expect(result.input_snapshot).toHaveProperty(
      'cell_1d.field_profiles.anode',
    );
    expect(result.input_snapshot).toHaveProperty(
      'physics_composition.bindings',
    );
    expect(result.provenance.source_refs).toContain(
      'test-fixture://coupled-cell-1d',
    );
    expect(
      result.derived_observations.every(
        (observation) => observation.decision_relevance === 'informational',
      ),
    ).toBe(true);
  });

  it('rejects conflicting generated cells, missing fields and coefficient unit/range errors', () => {
    const compiled = coupledCell1dInputSchema.parse(fieldCell());
    compiled.anode.cells[0].porosity.value = 0.7;
    expect(coupledCell1dInputSchema.safeParse(compiled).success).toBe(false);
    const invalid = fieldCell();
    invalid.field_profiles.anode.tortuosity.value.unit = 'm' as '1';
    expect(coupledCell1dInputSchema.safeParse(invalid).success).toBe(false);
    const missing = fieldCell();
    expect(
      coupledCell1dInputSchema.safeParse({
        ...missing,
        field_profiles: undefined,
      }).success,
    ).toBe(false);
  });

  it('uses requested physics to block unsupported modules through persisted 0D and 1D paths', () => {
    const zeroD = normalizeCaseInput(
      rawCaseInputSchema.parse({
        ...rawCaseFixture,
        mechanistic_model: {
          ...rawCaseFixture.mechanistic_model,
          required_physics_modules: ['thermal'],
        },
      }),
    );
    const plan = compileElectrochemicalModel({
      model: 'coupled-0d-dae-v1',
      normalizedCase: zeroD,
    });
    expect(plan.status).toBe('not_implemented');
    expect(plan.composition.missingModules).toContain(
      'implementation_adapter:thermal',
    );
    const result = evaluateSimulationEnrichment({ normalizedCase: zeroD });
    expect(result.status).toBe('not_implemented');
    expect(result.series).toHaveLength(0);
    const oneD = normalizeCaseInput(
      rawCaseInputSchema.parse({
        ...rawCaseFixture,
        mechanistic_model: {
          model_version: 'coupled-cell-1d-restricted-v1',
          model_fidelity_id: 'coupled-cell-1d-restricted-v1',
          system_type: 'MFC',
          required_physics_modules: ['gas'],
          cell_1d: fixture(),
        },
      }),
    );
    expect(
      evaluateSimulationEnrichment({ normalizedCase: oneD }),
    ).toMatchObject({
      status: 'not_implemented',
      failure_detail: {
        missing_modules: expect.arrayContaining(['module_mapping:gas']),
      },
    });
  });
});
