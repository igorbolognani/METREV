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
  coupled_by: 'compartment_state_and_circuit' | 'single_current_cell_closure';
}
export interface ExecutablePhysicsPlan {
  contract_version: 'physics-runtime-plan-v1';
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
const IMPLEMENTATIONS: Record<
  ExecutableCellModelId,
  Record<string, { implementation_id: string; equation_id: string }>
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
    const implementation = implementations[module.id];
    if (
      !implementation ||
      !module.equationRefs.includes(implementation.equation_id)
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
    contract_version: 'physics-runtime-plan-v1',
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
          'no growth, Donnan, thermal or gas-transport field',
        ]
      : [
          'well-mixed isothermal compartments',
          'architecture packaging is not spatially resolved',
          'no pore, spatial-flow, thermal or gas-transport field',
        ],
    decision_eligible: false,
  };
}
