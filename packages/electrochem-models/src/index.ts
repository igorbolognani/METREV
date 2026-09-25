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

export const INTERNAL_MODEL_VERSION = mechanisticModelVersion;
export const INTERNAL_MODEL_PROVIDER = 'metrev-coupled-electrochem-models';

export { simulateMechanisticCase };
export type { MechanisticRun };
export {
  BIOELECTROCHEMICAL_MODEL_PROFILES,
  EXECUTABLE_MODEL_PROFILE_IDS,
  getBioelectrochemicalModelProfile,
} from './model-catalog';
export type {
  BioelectrochemicalModelProfile,
  ModelOperatingRegime,
  ModelProfileStatus,
  ModelSystem,
} from './model-catalog';
export { assessExperimentalComparison } from './experimental-comparison';

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
      'No output was fabricated; the coupled model requires the missing source-referenced inputs.',
    assumptions: [],
    missing_dependencies: missingInputs,
  }));
}

function toEnrichment(run: MechanisticRun): SimulationEnrichment {
  if (run.status !== 'completed') {
    return {
      ...emptyEnrichment({
        status: 'insufficient_data',
        note: run.note,
        failureDetail: { missing_inputs: run.missingInputs },
      }),
      input_snapshot: run.inputSnapshot,
      derived_observations: unavailableObservations(run.missingInputs),
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
