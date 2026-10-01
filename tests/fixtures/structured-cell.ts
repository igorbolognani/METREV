import type { StructuredCellInput } from '../../packages/domain-contracts/src/structured-cell-schema';

/** Mathematical redox couple only; these values are not a microbial study case. */
export function structuredCellFixture(
  dimension: 2 | 3 = 2,
): StructuredCellInput {
  const v = (value: number, unit: string) => ({
    value,
    unit,
    source_kind: 'test_fixture' as const,
    source_ref: 'synthetic:closed-redox-couple',
  });
  const nu = { reduced: v(-1, '1'), oxidized: v(1, '1') };
  const electrode = (role: 'anode' | 'cathode', potential: number) => ({
    role,
    domain_tag: role,
    electron_count: v(1, '1'),
    equilibrium_potential: v(potential, 'V'),
    exchange_current: v(1, 'A/m3'),
    alpha: v(0.5, '1'),
    stoichiometry: nu,
    forward_orders: { reduced: v(1, '1') },
    reverse_orders: { oxidized: v(1, '1') },
  });
  return {
    contract_version: 'spatial-cell-input-v1',
    model_id: 'structured-cell-supporting-electrolyte-v1',
    system: 'MFC',
    dimension,
    coordinate_system: 'cartesian',
    charge_model: 'fixed-conductivity-supporting-electrolyte',
    geometry: {
      geometry_version: 'structured-layers-v1',
      lengths_m: [
        v(0.0003, 'm'),
        v(0.001, 'm'),
        ...(dimension === 3 ? [v(0.001, 'm')] : []),
      ],
      ...(dimension === 2 ? { out_of_plane_depth: v(0.001, 'm') } : {}),
      transverse_cells: dimension === 2 ? [2] : [2, 2],
      layers: ['anode', 'membrane', 'cathode'].map((tag) => ({
        tag,
        kind: tag as 'anode' | 'membrane' | 'cathode',
        width_m: v(0.0001, 'm'),
        cells: 2,
        electrolyte_conductivity: v(1, 'S/m'),
        solid_conductivity: v(tag === 'membrane' ? 0 : 10, 'S/m'),
        diffusivity: { reduced: v(1e-9, 'm2/s'), oxidized: v(2e-9, 'm2/s') },
      })),
    },
    temperature: v(298.15, 'K'),
    reservoir_faces: ['y_min', 'y_max'],
    species: ['reduced', 'oxidized'].map((id, i) => ({
      id,
      valence: v(i, '1'),
      elements: { C: v(1, '1') },
      initial_concentration: v(1, 'mol/m3'),
      reservoir_concentration: v(1, 'mol/m3'),
      reference_concentration: v(1, 'mol/m3'),
    })),
    reactions: [],
    electrodes: [
      electrode('anode', 0) as StructuredCellInput['electrodes'][0],
      electrode('cathode', 0.3) as StructuredCellInput['electrodes'][1],
    ],
    circuit: { kind: 'external_load', resistance: v(1e7, 'ohm') },
    numerics: {
      max_evaluations: 400,
      nonlinear_tolerance: 1e-7,
      conservation_tolerance: 1e-6,
      concentration_scale: v(1, 'mol/m3'),
      potential_scale: v(1, 'V'),
      species_rate_scale: v(0.0001, 'mol/(m3*s)'),
      charge_rate_scale: v(100, 'A/m3'),
    },
  };
}
