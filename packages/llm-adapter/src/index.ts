import type {
    DecisionOutput,
    NarrativeMetadata,
    NormalizedCaseInput,
} from '@metrev/domain-contracts';

export interface NarrativeResult {
  narrative: string | null;
  narrativeMetadata: NarrativeMetadata;
}

const supportedNarrativeModes = new Set(['disabled', 'stub']);

function resolveNarrativeMode() {
  const requestedMode = process.env.METREV_LLM_MODE?.trim() || 'stub';

  if (supportedNarrativeModes.has(requestedMode)) {
    return {
      requestedMode,
      runtimeMode: requestedMode,
      unsupportedMode: null,
    } as const;
  }

  return {
    requestedMode,
    runtimeMode: 'stub',
    unsupportedMode: requestedMode,
  } as const;
}

function buildStubNarrative(input: {
  decisionOutput: DecisionOutput;
  normalizedCase: NormalizedCaseInput;
}): string {
  const topRecommendation =
    input.decisionOutput.prioritized_improvement_options[0];
  const confidenceLevel =
    input.decisionOutput.confidence_and_uncertainty_summary.confidence_level;

  if (!topRecommendation) {
    return `Case ${input.normalizedCase.case_id} is currently framed as ${input.normalizedCase.primary_objective} on ${input.normalizedCase.technology_family}. No single deterministic intervention dominated this run, so the result emphasizes baseline validation, evidence quality, and continued monitoring.`;
  }

  if (confidenceLevel === 'low') {
    return `Case ${input.normalizedCase.case_id} is currently framed as ${input.normalizedCase.primary_objective} on ${input.normalizedCase.technology_family}. The recommendation set remains exploratory because confidence is low; the current leading options are ${input.decisionOutput.prioritized_improvement_options
      .slice(0, 2)
      .map((recommendation) => recommendation.recommendation_id)
      .join(' and ')}, pending additional measurements and evidence closure.`;
  }

  return `Case ${input.normalizedCase.case_id} is currently framed as ${input.normalizedCase.primary_objective} on ${input.normalizedCase.technology_family}. The leading recommendation is ${topRecommendation.recommendation_id}, justified by ${topRecommendation.rationale.toLowerCase()}`;
}

export async function generateNarrative(input: {
  decisionOutput: DecisionOutput;
  normalizedCase: NormalizedCaseInput;
}): Promise<NarrativeResult> {
  const { runtimeMode, unsupportedMode } = resolveNarrativeMode();
  const configuredModel = process.env.METREV_LLM_MODEL ?? null;

  if (runtimeMode === 'disabled') {
    return {
      narrative: null,
      narrativeMetadata: {
        mode: 'disabled',
        provider: null,
        model: configuredModel,
        status: 'disabled',
        fallback_used: false,
        prompt_version: 'deterministic-v1',
        error_message: null,
      },
    };
  }

  if (!unsupportedMode) {
    return {
      narrative: buildStubNarrative(input),
      narrativeMetadata: {
        mode: 'stub',
        provider: 'internal',
        model: 'deterministic-summary',
        status: 'generated',
        fallback_used: false,
        prompt_version: 'stub-v1',
        error_message: null,
      },
    };
  }

  return {
    narrative: buildStubNarrative(input),
    narrativeMetadata: {
      mode: 'stub',
      provider: 'internal',
      model: 'deterministic-summary',
      status: 'fallback',
      fallback_used: true,
      prompt_version: 'stub-v1',
      error_message: `Unsupported METREV_LLM_MODE "${unsupportedMode}" requested; this runtime build supports only "disabled" and "stub", so the deterministic stub narrative was used instead.`,
    },
  };
}
