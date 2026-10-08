import type {
  ConfidenceLevel,
  DerivedObservation,
  NormalizedCaseInput,
  SignalSourceKind,
  SimulationEnrichment,
  SimulationSummary,
} from '@metrev/domain-contracts';

import {
  mechanisticModelVersion,
  simulateMechanisticCase,
  type MechanisticRun,
} from './mechanistic';
import {
  solveCoupledCell1d,
  type CoupledCell1dResult,
} from './coupled-cell-1d';
import {
  compileElectrochemicalModel,
  UnsupportedPhysicsCompositionError,
  type ConfiguredElectrochemicalModel,
  type ExecutablePhysicsPlan,
} from './model-composition-runtime';
import { coupledCell1dInputSchema } from '@metrev/domain-contracts';
import {
  CASE_RUNNER_1D_MODEL,
  coupledCell1dEnrichment,
} from './coupled-cell-1d-enrichment';

export const INTERNAL_MODEL_VERSION = mechanisticModelVersion;
export const INTERNAL_MODEL_PROVIDER = 'metrev-coupled-electrochem-models';

export { simulateMechanisticCase };
export { resolvePhysicsComposition } from './physics-composition';
export {
  resolveCaseSpatialComposition,
  RESTRICTED_CELL_PHYSICS,
} from './case-spatial-composition';
export type {
  CaseSpatialComposition,
  CaseSpatialStackSelection,
} from './case-spatial-composition';
export { PHYSICS_MODULES, composeModules } from './physics-modules';
export {
  compileElectrochemicalModel,
  UnsupportedPhysicsCompositionError,
} from './model-composition-runtime';
export type {
  ConfiguredElectrochemicalModel,
  ExecutablePhysicsPlan,
  PhysicsImplementationBinding,
  ReactionLawRuntimeBinding,
} from './model-composition-runtime';
export type {
  PhysicsComposition,
  StackPhysicsSelection,
} from './physics-composition';
export type { MechanisticRun };
export { POROUS_ANODE_1D_SOURCES, solvePorousAnode1d } from './porous-anode-1d';
export type {
  SourcedSpatialValue,
  PorousAnodeCell,
  PorousAnodeInput,
  PorousAnodeCellResult,
  PorousAnodeResult,
} from './porous-anode-1d';
export { MEMBRANE_ION_1D_SOURCE, solveMembraneIon1d } from './membrane-ion-1d';
export { prepareUniformDonnanMembrane1d } from './uniform-donnan-membrane-1d';
export type {
  UniformDonnanBoundary,
  UniformDonnanMembraneInput,
} from './uniform-donnan-membrane-1d';
export type {
  MembraneIonSpecies,
  MembraneIonSegment,
  MembraneIonInput,
  MembraneIonResult,
} from './membrane-ion-1d';
export {
  CHARGED_INTERFACE_REACTION_KERNEL,
  assembleChargedInterfaceFlux,
  assembleDonnanInterface,
  assembleHomogeneousReactions,
  solveDonnanInterface,
} from './charged-interface-reaction';
export type {
  ChargedSpeciesContract,
  UnsupportedChargedEffects,
  DonnanInterfaceInput,
  DonnanInterfaceSolution,
  ChargedInterfaceFluxInput,
  ChargedInterfaceFluxResult,
  HomogeneousReactionContract,
  HomogeneousReactionInput,
  HomogeneousReactionResult,
  LocalResidualJacobian,
} from './charged-interface-reaction';
export { COUPLED_CELL_1D_SOURCES, solveCoupledCell1d } from './coupled-cell-1d';
export type {
  CoupledCell1dInput,
  CoupledCell1dResult,
} from './coupled-cell-1d';
export {
  GATTI_2017_SOURCE,
  GATTI_2017_PARAMETER_EVIDENCE,
  GATTI_2017_MEAN_PARAMETERS,
  GATTI_2017_FITTED_INTERVALS,
  gattiParameterEvidence,
  gattiFittedIntervalEvidence,
  initialGattiBiofilmState,
  simulateGattiBiofilm,
  sweepGattiFittedIntervals,
} from './biofilm-1d-gatti';
export type {
  GattiBiofilmParameters,
  GattiBiofilmState,
  GattiBiofilmObservation,
  GattiLoadSegment,
} from './biofilm-1d-gatti';
export {
  BIOELECTROCHEMICAL_MODEL_PROFILES,
  EXECUTABLE_MODEL_PROFILE_IDS,
  getBioelectrochemicalModelProfile,
} from './model-catalog';
export {
  COMPONENT_MODEL_PARAMETER_GROUPS,
  MODEL_FIDELITY_PROFILES,
  getComponentModelParameterGroup,
  getModelFidelityProfile,
} from './model-fidelity-catalog';
export type {
  BioelectrochemicalModelProfile,
  ModelOperatingRegime,
  ModelProfileStatus,
  ModelSystem,
} from './model-catalog';
export type {
  ComponentModelGroupSpec,
  ComponentModelParameterSpec,
  ModelFidelityProfile,
  ModelFidelityStatus,
  ModelResolutionScale,
  SpatialDimension,
} from './model-fidelity-catalog';
export {
  assessExperimentalComparison,
  compareForModelDevelopment,
} from './experimental-comparison';

const ruleInputSignalKeys = new Set([
  'current_density_a_m2',
  'power_density_w_m2',
  'internal_resistance_ohm',
  'cod_removal_pct',
  'biosensor_signal_current_a',
]);

type SimulationMode = 'disabled' | 'mechanistic_v1';

export interface ModelProvider {
  evaluate(input: {
    normalizedCase: NormalizedCaseInput;
  }): SimulationEnrichment;
}

export interface SimulationEligibility {
  eligible: boolean;
  missingInputs: string[];
  notes: string[];
}

function emptyEnrichment(input: {
  status: SimulationEnrichment['status'];
  note: string;
  failureDetail?: Record<string, unknown>;
}): SimulationEnrichment {
  return {
    status: input.status,
    model_version: INTERNAL_MODEL_VERSION,
    input_snapshot: {},
    derived_observations: [],
    series: [],
    assumptions: [],
    confidence: {
      level: 'low',
      score: input.status === 'disabled' ? 0 : 20,
      drivers: [input.note],
    },
    provenance: {
      provider: INTERNAL_MODEL_PROVIDER,
      execution_mode: 'internal_model',
      source_version: INTERNAL_MODEL_VERSION,
      generated_at: new Date().toISOString(),
      source_refs: [],
      note: input.note,
    },
    failure_detail: input.failureDetail,
  };
}

function unavailableObservations(
  missingInputs: string[],
  status: 'insufficient_data' | 'not_implemented',
): DerivedObservation[] {
  return [
    ['current_density_a_m2', 'Current density'],
    ['power_density_w_m2', 'Power density / electrical input'],
    ['internal_resistance_ohm', 'Internal resistance'],
    ['cod_removal_pct', 'COD removal'],
    ['biosensor_signal_current_a', 'Biosensor signal'],
  ].map(([key, label]) => ({
    observation_id: `unavailable:${key}`,
    key,
    label,
    value: null,
    unit: null,
    source_kind: 'unavailable' as SignalSourceKind,
    confidence_level: 'low' as ConfidenceLevel,
    decision_relevance: 'informational',
    provenance_note:
      status === 'not_implemented'
        ? 'No output was fabricated; the selected research profile has no executable solver in METREV yet.'
        : 'No output was fabricated; the coupled model requires the missing source-referenced inputs.',
    assumptions: [],
    missing_dependencies: missingInputs,
  }));
}

function toEnrichment(run: MechanisticRun): SimulationEnrichment {
  if (run.status !== 'completed') {
    const failureDetail =
      run.status === 'not_implemented'
        ? { model_blockers: run.missingInputs }
        : { missing_inputs: run.missingInputs };
    return {
      ...emptyEnrichment({
        status: run.status,
        note: run.note,
        failureDetail,
      }),
      input_snapshot: run.inputSnapshot,
      derived_observations: unavailableObservations(
        run.missingInputs,
        run.status,
      ),
    };
  }

  return {
    status: 'completed',
    model_version: INTERNAL_MODEL_VERSION,
    input_snapshot: run.inputSnapshot,
    derived_observations: run.observations,
    series: run.series,
    sensitivity_analysis: run.sensitivityAnalysis,
    assumptions: run.assumptions,
    confidence: {
      level: run.confidenceLevel,
      score: run.confidenceScore,
      drivers: [
        `${run.sourceRefs.length} source references are attached directly to model inputs.`,
        'Mechanistic values are computed from mass balances and electrochemical charge transfer, not technology-wide performance targets.',
        'Supplied uncertainties are tested one input at a time; no joint distribution or prediction interval is calculated.',
      ],
    },
    provenance: {
      provider: INTERNAL_MODEL_PROVIDER,
      execution_mode: 'internal_model',
      source_version: INTERNAL_MODEL_VERSION,
      generated_at: new Date().toISOString(),
      source_refs: run.sourceRefs,
      note: run.note,
    },
  };
}

export function isRuleInputDerivedSignalKey(key: string): boolean {
  return ruleInputSignalKeys.has(key);
}

export function resolveSimulationMode(rawMode?: string): SimulationMode {
  return rawMode?.trim().toLowerCase() === 'disabled'
    ? 'disabled'
    : 'mechanistic_v1';
}

export function isSimulationEligible(
  normalizedCase: NormalizedCaseInput,
): SimulationEligibility {
  const result = simulateMechanisticCase(normalizedCase);
  return {
    eligible: result.status === 'completed',
    missingInputs: result.missingInputs,
    notes: result.status === 'completed' ? [] : [result.note],
  };
}

export const defaultInternalModelProvider: ModelProvider = {
  evaluate({ normalizedCase }) {
    const requested = normalizedCase.mechanistic_model?.model_fidelity_id;
    if (
      (normalizedCase.technology_family === 'microbial_fuel_cell' ||
        normalizedCase.technology_family === 'microbial_electrolysis_cell') &&
      (!requested || requested === 'coupled-0d-dae-v1')
    ) {
      const calculation = runConfiguredElectrochemicalModel({
        model: 'coupled-0d-dae-v1',
        normalizedCase,
      });
      if (calculation.model === 'coupled-0d-dae-v1') return calculation.result;
    }
    return toEnrichment(simulateMechanisticCase(normalizedCase));
  },
};

export function mapArtifactToDerivedObservations(
  artifact: SimulationEnrichment | undefined,
): DerivedObservation[] {
  return artifact?.derived_observations ?? [];
}

export function buildSimulationSummary(
  artifact: SimulationEnrichment | undefined,
): SimulationSummary | undefined {
  if (!artifact) return undefined;
  return {
    status: artifact.status,
    model_version: artifact.model_version,
    confidence_level: artifact.confidence.level,
    derived_observation_count: artifact.derived_observations.length,
    has_series: artifact.series.length > 0,
  };
}

export function evaluateSimulationEnrichment(input: {
  normalizedCase: NormalizedCaseInput;
  mode?: string;
  provider?: ModelProvider;
}): SimulationEnrichment {
  if (resolveSimulationMode(input.mode) === 'disabled') {
    return emptyEnrichment({
      status: 'disabled',
      note: 'Simulation enrichment was explicitly disabled for this evaluation.',
    });
  }

  if (
    input.normalizedCase.mechanistic_model?.model_fidelity_id ===
    CASE_RUNNER_1D_MODEL
  ) {
    const model = input.normalizedCase.mechanistic_model;
    const cell = model.cell_1d;
    const expectedSystem =
      input.normalizedCase.technology_family === 'microbial_fuel_cell'
        ? 'MFC'
        : input.normalizedCase.technology_family ===
            'microbial_electrolysis_cell'
          ? 'MEC'
          : null;
    const missing = [
      ...(!cell ? ['mechanistic_model.cell_1d'] : []),
      ...(model.model_version !== CASE_RUNNER_1D_MODEL
        ? ['mechanistic_model.model_version']
        : []),
      ...(!expectedSystem ||
      model.system_type !== expectedSystem ||
      (cell && cell.system !== expectedSystem)
        ? ['mechanistic_model.system_type/cell_1d.system: case mismatch']
        : []),
    ];
    if (missing.length) {
      const incomplete = emptyEnrichment({
        status: 'insufficient_data',
        note: 'Restricted 1D case needs its complete source-backed cell and matching system/version.',
        failureDetail: { missing_inputs: missing },
      });
      return {
        ...incomplete,
        model_version: CASE_RUNNER_1D_MODEL,
        provenance: {
          ...incomplete.provenance,
          source_version: CASE_RUNNER_1D_MODEL,
        },
        derived_observations: unavailableObservations(
          missing,
          'insufficient_data',
        ),
      };
    }
    try {
      const calculation = runConfiguredElectrochemicalModel({
        model: CASE_RUNNER_1D_MODEL,
        cell: cell!,
        requiredModules: model.required_physics_modules,
      });
      if (calculation.model !== CASE_RUNNER_1D_MODEL)
        throw new Error('Wrong fidelity dispatch for restricted 1D case');
      const enriched = coupledCell1dEnrichment(cell!, calculation.result);
      return {
        ...enriched,
        input_snapshot: {
          ...enriched.input_snapshot,
          physics_composition: calculation.composition,
        },
      };
    } catch (error) {
      const failure = emptyEnrichment({
        status:
          error instanceof UnsupportedPhysicsCompositionError
            ? 'not_implemented'
            : error instanceof RangeError
              ? 'insufficient_data'
              : 'failed',
        note: 'Restricted 1D case could not be solved.',
        failureDetail: {
          error: error instanceof Error ? error.message : String(error),
          ...(error instanceof UnsupportedPhysicsCompositionError
            ? {
                missing_modules: error.composition.composition.missingModules,
                unsupported_configuration:
                  error.composition.composition.unsupportedConfiguration,
              }
            : {}),
        },
      });
      return {
        ...failure,
        model_version: CASE_RUNNER_1D_MODEL,
        input_snapshot: { cell_1d: cell },
        provenance: {
          ...failure.provenance,
          source_version: CASE_RUNNER_1D_MODEL,
        },
      };
    }
  }

  try {
    return (input.provider ?? defaultInternalModelProvider).evaluate({
      normalizedCase: input.normalizedCase,
    });
  } catch (error) {
    return emptyEnrichment({
      status: 'failed',
      note: 'Mechanistic model execution failed.',
      failureDetail: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export type ConfiguredElectrochemicalResult =
  | {
      model: 'coupled-0d-dae-v1';
      result: SimulationEnrichment;
      composition: ExecutablePhysicsPlan;
    }
  | {
      model: 'coupled-cell-1d-restricted-v1';
      result: CoupledCell1dResult;
      composition: ExecutablePhysicsPlan;
    };

export function runConfiguredElectrochemicalModel(
  input: ConfiguredElectrochemicalModel,
): ConfiguredElectrochemicalResult {
  const composition = compileElectrochemicalModel(input);
  if (input.model === 'coupled-0d-dae-v1') {
    const selected = input.normalizedCase.mechanistic_model?.model_fidelity_id;
    if (selected && selected !== input.model)
      throw new RangeError(
        `Configured 0D dispatcher cannot execute selected fidelity ${selected}`,
      );
    if (composition.status === 'not_implemented') {
      const unavailable = emptyEnrichment({
        status: 'not_implemented',
        note: composition.composition.note,
        failureDetail: {
          missing_modules: composition.composition.missingModules,
          model_blockers: composition.composition.unsupportedConfiguration,
        },
      });
      return {
        model: input.model,
        composition,
        result: {
          ...unavailable,
          input_snapshot: {
            ...unavailable.input_snapshot,
            physics_composition: composition,
          },
        },
      };
    }
    const result = toEnrichment(simulateMechanisticCase(input.normalizedCase));
    return {
      model: input.model,
      composition,
      result: {
        ...result,
        input_snapshot: {
          ...result.input_snapshot,
          physics_composition: composition,
        },
      },
    };
  }
  if (input.model === 'coupled-cell-1d-restricted-v1') {
    if (composition.status !== 'ready')
      throw composition.status === 'not_implemented'
        ? new UnsupportedPhysicsCompositionError(composition)
        : new RangeError(composition.missing_inputs.join(', '));
    return {
      model: input.model,
      composition,
      result: solveCoupledCell1d(coupledCell1dInputSchema.parse(input.cell)),
    };
  }
  throw new RangeError('Unknown configured electrochemical model');
}

export { solveLinearStackNetwork } from './stack-network';
export { solveStackHydraulicNetwork } from './stack-hydraulic-network';
export { calculateLayeredScaleTransfer } from './scale-transfer';
