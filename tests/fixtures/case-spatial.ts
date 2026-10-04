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
