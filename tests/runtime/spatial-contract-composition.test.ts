import { describe, expect, it } from 'vitest';

import { spatialModelInputSchema } from '@metrev/domain-contracts';
import { resolvePhysicsComposition } from '@metrev/electrochem-models';

const q = (value: number, unit: string) => ({
  value,
  unit,
  source_kind: 'test_fixture' as const,
  source_ref: 'test-fixture://spatial-contract',
});

const input = () => ({
  contract_version: 'spatial-input-v1',
  model_id: 'cell-2d-development-fixture',
  system: 'MFC',
  dimension: 2,
  coordinate_system: 'cartesian',
  axes: ['x', 'y'],
  geometry: {
    kind: 'box',
    extents_m: [q(0.1, 'm'), q(0.05, 'm')],
    regions: [
      { tag: 'liquid', kind: 'bulk_liquid' },
      { tag: 'anode', kind: 'anode', component_id: 'case/anode' },
    ],
    interfaces: [{ from_tag: 'anode', to_tag: 'liquid', normal: [1, 0] }],
  },
  mesh: { kind: 'generate', target_size_m: q(0.001, 'm'), algorithm: 'gmsh' },
  material_fields: [
    {
      parameter_id: 'porosity',
      domain_tag: 'anode',
      field: { kind: 'constant', value: q(0.5, '1') },
    },
  ],
  species: [
    {
      id: 'substrate',
      valence: q(0, '1'),
      diffusivity: { kind: 'constant', value: q(1e-9, 'm2/s') },
    },
  ],
  initial_conditions: [],
  boundary_conditions: [
    {
      kind: 'dirichlet',
      tag: 'liquid',
      variable: 'substrate',
      value: q(1, 'mol/m3'),
    },
  ],
  circuit: { kind: 'external_load', resistance: q(1000, 'ohm') },
  requested_outputs: ['substrate'],
});

describe('versioned spatial input and stack composition boundary', () => {
  it('retains sourced values and 2D region/interface metadata without claiming execution', () => {
    const parsed = spatialModelInputSchema.parse(input());
    expect(parsed.material_fields[0].field).toEqual({
      kind: 'constant',
      value: q(0.5, '1'),
    });
    expect(parsed.geometry.interfaces[0].normal).toEqual([1, 0]);
    const composition = resolvePhysicsComposition({
      modelId: 'biofilm-2d-electrode-research-v1',
      system: 'MFC',
      architecture: 'dual-chamber',
      separator: 'cation exchange membrane',
    });
    expect(composition.status).toBe('not_implemented');
    expect(composition.missingModules).toContain('spatial_geometry_mesh');
    expect(composition.activeModules).toContain('membrane_or_separator');
  });

  it('rejects broken geometry, boundary, units, provenance, and circuit compatibility', () => {
    expect(
      spatialModelInputSchema.safeParse({ ...input(), axes: ['x', 'x'] })
        .success,
    ).toBe(false);
    const invalid = input();
    invalid.geometry.interfaces[0].to_tag = 'not-a-region';
    invalid.geometry.extents_m[0] = q(3, 's');
    invalid.boundary_conditions[0].value = {
      ...q(1, 'mol/m3'),
      source_ref: '',
    };
    invalid.circuit = { kind: 'applied_voltage', voltage: q(1, 'V') } as never;
    expect(spatialModelInputSchema.safeParse(invalid).success).toBe(false);
    expect(
      spatialModelInputSchema.safeParse({
        ...input(),
        mesh: {
          kind: 'generate',
          algorithm: 'gmsh',
          target_size_m: q(0, 'm'),
        },
      }).success,
    ).toBe(false);
  });

  it('enforces the canonical spatial parameter authority across field forms', () => {
    const candidate = input();
    candidate.material_fields[0].parameter_id = 'unknown_property';
    expect(spatialModelInputSchema.safeParse(candidate).success).toBe(false);
    candidate.material_fields[0].parameter_id = 'porosity';
    candidate.material_fields[0].field = {
      kind: 'constant',
      value: q(1.3, '1'),
    };
    expect(spatialModelInputSchema.safeParse(candidate).success).toBe(false);
    candidate.material_fields[0].field = {
      kind: 'constant',
      value: q(0.3, 'S/m'),
    };
    expect(spatialModelInputSchema.safeParse(candidate).success).toBe(false);
    candidate.material_fields[0].parameter_id = 'fluid_density_kg_m3';
    candidate.material_fields[0].field = {
      kind: 'constant',
      value: q(1000, 'kg/m3'),
    };
    expect(spatialModelInputSchema.safeParse(candidate).success).toBe(false);
    candidate.species[0].diffusivity = {
      kind: 'constant',
      value: q(-1e-9, 'm2/s'),
    };
    expect(spatialModelInputSchema.safeParse(candidate).success).toBe(false);
  });

  it('does not claim unsupported architecture or separator selection is simulated', () => {
    expect(
      resolvePhysicsComposition({
        modelId: 'coupled-0d-dae-v1',
        system: 'MFC',
        architecture: 'upflow',
      }).status,
    ).toBe('not_implemented');
    const oneD = resolvePhysicsComposition({
      modelId: 'coupled-cell-1d-restricted-v1',
      system: 'MEC',
      architecture: 'planar',
      separator: 'binary-electroneutral',
    });
    expect(oneD.status).toBe('case_runner_development');
    expect(
      resolvePhysicsComposition({
        modelId: 'coupled-cell-1d-restricted-v1',
        system: 'MFC',
        separator: 'proton exchange membrane',
      }).status,
    ).toBe('not_implemented');
  });
});
