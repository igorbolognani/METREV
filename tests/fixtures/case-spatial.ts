import raw from './raw-case-input.json';
import {
  normalizeCaseInput,
  rawCaseInputSchema,
  type CaseSpatialRequest,
} from '@metrev/domain-contracts';
import { structuredCellFixture } from './structured-cell';

/** Explicit declarations for software verification; not a measured microbial cell. */
export function caseSpatialFixture(
  dimension: 2 | 3 = 2,
  system: 'MFC' | 'MEC' = 'MFC',
  caseId = 'CASE-SPATIAL-TEST',
) {
  const rawInput = rawCaseInputSchema.parse({
    ...raw,
    case_id: caseId,
    technology_family:
      system === 'MFC' ? 'microbial_fuel_cell' : 'microbial_electrolysis_cell',
    mechanistic_model: undefined,
    stack_blocks: {
      ...raw.stack_blocks,
      reactor_architecture: {
        architecture_type: 'planar',
        membrane_presence: 'present',
      },
      anode_biofilm_support: {
        ...raw.stack_blocks.anode_biofilm_support,
        material_family: 'carbon felt',
      },
      cathode_catalyst_support: {
        ...raw.stack_blocks.cathode_catalyst_support,
        catalyst_family: 'platinum test catalyst',
      },
      membrane_or_separator: {
        ...raw.stack_blocks.membrane_or_separator,
        type: 'cation exchange membrane test article',
      },
    },
  });
  const input = structuredCellFixture(dimension);
  if (system === 'MEC') {
    input.system = system;
    input.circuit = {
      kind: 'applied_voltage',
      voltage: { ...input.electrodes[1].equilibrium_potential, value: 0.1 },
    };
  }
  const request: CaseSpatialRequest = {
    model_id: input.model_id,
    dimension,
    required_physics: [
      'trace_species_transport',
      'liquid_charge',
      'solid_charge',
      'electrode_reactions',
      'circuit',
      'continuous_interfaces',
    ],
    input,
    component_domains: [
      { domain_tag: 'anode', stack_block: 'anode_biofilm_support' },
      { domain_tag: 'membrane', stack_block: 'membrane_or_separator' },
      { domain_tag: 'cathode', stack_block: 'cathode_catalyst_support' },
    ],
  };
  return { rawInput, normalized: normalizeCaseInput(rawInput), request };
}

/** Explicit, synthetic Darcy input for case-composition and worker integration tests. */
export function configureCaseSpatialDarcy(request: CaseSpatialRequest) {
  const input = request.input;
  if (!input) throw new Error('Case fixture requires a spatial-cell input');
  input.geometry.layers[1]!.kind = 'separator';
  const sourced = (value: number, unit: string) => ({
    value,
    unit,
    source_kind: 'test_fixture' as const,
    source_ref: 'synthetic:case-spatial-boundary-darcy',
  });
  input.hydraulics = {
    version: 'structured-cell-darcy-pressure-solve-v1',
    dynamic_viscosity: sourced(1e-3, 'Pa*s'),
    permeability_by_region: Object.fromEntries(
      input.geometry.layers.map((layer) => [layer.tag, sourced(1e-12, 'm2')]),
    ),
    boundary_pressure: {
      y_min: sourced(100, 'Pa'),
      y_max: sourced(99, 'Pa'),
    },
    impermeable_faces: input.dimension === 3 ? ['z_min', 'z_max'] : [],
    inlet_concentrations: {
      y_min: Object.fromEntries(
        input.species.map((species) => [
          species.id,
          structuredClone(species.reservoir_concentration),
        ]),
      ),
    },
  };
  if (!request.required_physics.includes('hydraulics'))
    request.required_physics.push('hydraulics');
  return request;
}
