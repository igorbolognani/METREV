import {
  coupledCell1dInputSchema,
  mechanisticModelInputSchema,
  type NormalizedCaseInput,
} from '@metrev/domain-contracts';

import type { CoupledCell1dInput } from './coupled-cell-1d';
import {
  resolvePhysicsComposition,
  type PhysicsComposition,
} from './physics-composition';

export type ExecutableCellModelId =
  | 'coupled-0d-dae-v1'
  | 'coupled-cell-1d-restricted-v1';
export type ConfiguredElectrochemicalModel =
  | { model: 'coupled-0d-dae-v1'; normalizedCase: NormalizedCaseInput }
  | {
      model: 'coupled-cell-1d-restricted-v1';
      cell: CoupledCell1dInput;
      requiredModules?: string[];
    };

export interface PhysicsImplementationBinding {
  module_id: string;
  implementation_id: string;
  equation_id: string;
  equation_ids?: string[];
  reaction_law?: ReactionLawRuntimeBinding;
  coupled_by: 'compartment_state_and_circuit' | 'single_current_cell_closure';
}

/** Runtime mapping metadata. It does not imply molecular stoichiometry. */
export interface ReactionLawRuntimeBinding {
  id: string;
  equation_ids: string[];
  rate_observation_key: string;
  rate_series_id: string;
  substrate_basis: 'kgCOD' | 'mol_substrate';
  substrate_rate_unit: 'kgCOD/(m3 s)' | 'mol/(m3 s)';
  electron_equivalent_mapping:
    | 'coulombic_efficiency_times_biofilm_fraction_times_COD_equivalents'
    | 'source_traced_electrons_per_substrate_molecule';
  stoichiometry_status:
    | 'lumped_COD_equivalent_without_molecular_products'
    | 'substrate_electron_equivalent_without_molecular_products';
  source_refs: string[];
  limitations: string[];
}
export interface ExecutablePhysicsPlan {
  contract_version: 'physics-runtime-plan-v2';
  model_id: ExecutableCellModelId;
  dimension: 0 | 1;
  system: 'MFC' | 'MEC' | null;
  status: 'ready' | 'insufficient_data' | 'not_implemented';
  composition: PhysicsComposition;
  bindings: PhysicsImplementationBinding[];
  missing_inputs: string[];
  restrictions: string[];
  decision_eligible: false;
}

export class UnsupportedPhysicsCompositionError extends RangeError {
  constructor(readonly composition: ExecutablePhysicsPlan) {
    super(composition.composition.note);
    this.name = 'UnsupportedPhysicsCompositionError';
  }
}

/**
 * Explicit numerical adapters reuse coupled state equations, never concatenate
 * independent solver outputs. Gatti remains a separate study formulation: its
 * transient fractional-substrate slices are not the steady cell's physical x.
 */
type ImplementationDefinition = Omit<
  PhysicsImplementationBinding,
  'module_id' | 'coupled_by'
>;

const IMPLEMENTATIONS: Record<
  ExecutableCellModelId,
  Record<string, ImplementationDefinition>
> = {
  'coupled-0d-dae-v1': {
    reactor: {
      implementation_id: 'mechanistic.compartment-balance',
      equation_id: 'coupled-0d-dae',
    },
    anode: {
      implementation_id: 'mechanistic.anode-butler-volmer',
      equation_id: 'coupled-0d-dae',
    },
    biofilm: {
      implementation_id: 'mechanistic.lumped-biology',
      equation_id: 'coupled-0d-dae',
    },
    reaction: {
      implementation_id: 'mechanistic.monod-cod-electron-equivalent',
      equation_id: 'EQ-BIO-001',
      equation_ids: ['EQ-BIO-001', 'EQ-RX-002'],
      reaction_law: {
        id: 'lumped-cod-monod-v1',
        equation_ids: ['EQ-BIO-001', 'EQ-RX-002'],
        rate_observation_key: 'cod_uptake_rate_kgcod_m3_s',
        rate_series_id: 'mechanistic:cod_uptake_rate_kgcod_m3_s',
        substrate_basis: 'kgCOD',
        substrate_rate_unit: 'kgCOD/(m3 s)',
        electron_equivalent_mapping:
          'coulombic_efficiency_times_biofilm_fraction_times_COD_equivalents',
        stoichiometry_status:
          'lumped_COD_equivalent_without_molecular_products',
        source_refs: [
          '10.1016/j.biortech.2010.06.156',
          '10.1016/j.jpowsour.2009.06.101',
        ],
        limitations: [
          'COD is a lumped oxygen-equivalent state, not a molecular substrate species.',
          'Products, proton stoichiometry, and competing metabolic pathways are not resolved.',
        ],
      },
    },
    cathode: {
      implementation_id: 'mechanistic.cathode-butler-volmer',
      equation_id: 'coupled-0d-dae',
    },
    circuit: {
      implementation_id: 'mechanistic.circuit-closure',
      equation_id: 'coupled-0d-dae',
    },
    membrane_or_separator: {
      implementation_id: 'mechanistic.membrane-ohmic-reduction',
      equation_id: 'coupled-0d-dae',
    },
    hydrogen_accounting: {
      implementation_id: 'mechanistic.hydrogen-accounting',
      equation_id: 'coupled-0d-dae',
    },
    sensor: {
      implementation_id: 'mechanistic.integrated-sensor',
      equation_id: 'coupled-0d-dae',
    },
  },
  'coupled-cell-1d-restricted-v1': {
    reactor: {
      implementation_id: 'coupled-cell-1d.planar-geometry',
      equation_id: 'coupled-cell-1d',
    },
    anode: {
      implementation_id: 'porous-anode-1d.local-transport-reaction',
      equation_id: 'coupled-cell-1d',
    },
    biofilm: {
      implementation_id: 'porous-anode-1d.accessible-surface-kinetics',
      equation_id: 'coupled-cell-1d',
    },
    reaction: {
      implementation_id: 'porous-anode-1d.nernst-monod-electron-equivalent',
      equation_id: 'EQ-BIO-002',
      equation_ids: ['EQ-BIO-002', 'EQ-RX-002'],
      reaction_law: {
        id: 'porous-anode-nernst-monod-v1',
        equation_ids: ['EQ-BIO-002', 'EQ-RX-002'],
        rate_observation_key: 'anode_substrate_reaction_rate_mol_m3_s',
        rate_series_id: 'development-1d:anode-reaction-rate',
        substrate_basis: 'mol_substrate',
        substrate_rate_unit: 'mol/(m3 s)',
        electron_equivalent_mapping:
          'source_traced_electrons_per_substrate_molecule',
        stoichiometry_status:
          'substrate_electron_equivalent_without_molecular_products',
        source_refs: [
          '10.1051/e3sconf/202233408005',
          '10.1038/s41598-020-65375-5',
        ],
        limitations: [
          'Substrate identity, molecular products, proton stoichiometry, and growth reactions are not resolved.',
          'The material potential is imposed and the reaction remains a steady porous-anode reduction.',
        ],
      },
    },
    membrane_or_separator: {
      implementation_id: 'membrane-ion-1d.binary-electroneutral',
      equation_id: 'membrane-ion-1d',
    },
    cathode: {
      implementation_id: 'coupled-cell-1d.cathode-polarization',
      equation_id: 'coupled-cell-1d',
    },
    circuit: {
      implementation_id: 'coupled-cell-1d.current-root',
      equation_id: 'coupled-cell-1d',
    },
    hydrogen_accounting: {
      implementation_id: 'coupled-cell-1d.hydrogen-accounting',
      equation_id: 'coupled-cell-1d',
    },
  },
};

/** Compile configuration into bindings to actual implemented equation routines. */
export function compileElectrochemicalModel(
  input: ConfiguredElectrochemicalModel,
): ExecutablePhysicsPlan {
  const model = input.model;
  const oneD = model === 'coupled-cell-1d-restricted-v1';
  const caseInput =
    input.model === 'coupled-0d-dae-v1' ? input.normalizedCase : null;
  const cell =
    input.model === 'coupled-cell-1d-restricted-v1' ? input.cell : null;
  const modelInput = caseInput?.mechanistic_model;
  const system =
    cell?.system ??
    (caseInput?.technology_family === 'microbial_fuel_cell'
      ? 'MFC'
      : caseInput?.technology_family === 'microbial_electrolysis_cell'
        ? 'MEC'
        : null);
  const requestedArchitecture =
    caseInput?.stack_blocks.reactor_architecture.architecture_type;
  // Packaging labels do not create resolved hydraulics in the well-mixed model.
  const architecture = oneD
    ? 'planar'
    : ['flow-through', 'upflow'].includes(requestedArchitecture ?? '')
      ? requestedArchitecture
      : 'unspecified';
  const composition = resolvePhysicsComposition({
    modelId: model,
    system: system ?? 'MFC',
    architecture,
    separator: oneD ? 'binary-electroneutral' : 'unspecified',
    requiredModules:
      input.model === 'coupled-cell-1d-restricted-v1'
        ? input.requiredModules
        : modelInput?.required_physics_modules,
    integratedSensor: Boolean(
      caseInput?.stack_blocks.sensors_and_analytics.biosensor,
    ),
  });
  if (
    !oneD &&
    modelInput?.geometry?.membrane_present &&
    !composition.activeModules.includes('membrane_or_separator')
  ) {
    // The exact supplied geometry activates the lumped ohmic membrane reduction.
    const withMembrane = resolvePhysicsComposition({
      modelId: model,
      system: system ?? 'MFC',
      architecture,
      requiredModules: [
        'membrane_or_separator',
        ...(modelInput.required_physics_modules ?? []),
      ],
      integratedSensor: Boolean(
        caseInput?.stack_blocks.sensors_and_analytics.biosensor,
      ),
    });
    Object.assign(composition, withMembrane);
  }
  const missingInputs: string[] = [];
  if (!system) missingInputs.push('technology_family: explicit MFC or MEC');
  if (caseInput && modelInput?.system_type !== system)
    missingInputs.push('mechanistic_model.system_type: case system mismatch');
  const parsed = oneD
    ? coupledCell1dInputSchema.safeParse(cell)
    : mechanisticModelInputSchema.safeParse(modelInput);
  if (!parsed.success)
    missingInputs.push(
      ...parsed.error.issues.map(
        (issue) =>
          `${oneD ? 'cell_1d' : 'mechanistic_model'}.${issue.path.join('.')}`,
      ),
    );
  if (
    caseInput &&
    modelInput?.model_fidelity_id &&
    modelInput.model_fidelity_id !== model
  )
    composition.missingModules.push(
      `requested_fidelity:${modelInput.model_fidelity_id}`,
    );
  const implementations = IMPLEMENTATIONS[model];
  const bindings = composition.modulePlan.flatMap((module) => {
    const implementation =
      oneD && cell?.membrane.donnan && module.id === 'membrane_or_separator'
        ? {
            implementation_id:
              'uniform-donnan-membrane-1d.electroneutral-current',
            equation_id: 'EQ-MEM-1D-002',
            equation_ids: ['membrane-ion-1d', 'EQ-MEM-1D-002'],
          }
        : implementations[module.id];
    const mappedEquations =
      implementation?.equation_ids ??
      (implementation ? [implementation.equation_id] : []);
    if (
      !implementation ||
      mappedEquations.some(
        (equationId) => !module.equationRefs.includes(equationId),
      )
    ) {
      composition.missingModules.push(`implementation_adapter:${module.id}`);
      return [];
    }
    return [
      {
        module_id: module.id,
        ...implementation,
        coupled_by: oneD
          ? ('single_current_cell_closure' as const)
          : ('compartment_state_and_circuit' as const),
      },
    ];
  });
  if (composition.missingModules.length) composition.status = 'not_implemented';
  return {
    contract_version: 'physics-runtime-plan-v2',
    model_id: model,
    dimension: oneD ? 1 : 0,
    system,
    status:
      composition.status === 'not_implemented'
        ? 'not_implemented'
        : missingInputs.length
          ? 'insufficient_data'
          : 'ready',
    composition,
    bindings,
    missing_inputs: [...new Set(missingInputs)],
    restrictions: oneD
      ? [
          'steady planar through-thickness cell',
          'imposed anode material potential',
          'binary electroneutral membrane',
          ...(cell?.membrane.donnan
            ? [
                'uniform fixed-charge ideal Donnan with identical monovalent solution reservoirs; no concentration polarization',
              ]
            : [
                'uncharged binary membrane with equal concentrations and diffusivities',
              ]),
          'no growth, thermal or gas-transport field',
        ]
      : [
          'well-mixed isothermal compartments',
          'architecture packaging is not spatially resolved',
          'no pore, spatial-flow, thermal or gas-transport field',
        ],
    decision_eligible: false,
  };
}
