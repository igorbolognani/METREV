import type {
  DecisionOutput,
  NarrativeMetadata,
  NormalizedCaseInput,
} from '@metrev/domain-contracts';

export interface NarrativeResult {
  narrative: string | null;
  narrativeMetadata: NarrativeMetadata;
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
  const mode = process.env.METREV_LLM_MODE ?? 'stub';
  const configuredModel = process.env.METREV_LLM_MODEL ?? null;

  if (mode === 'disabled') {
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

  if (mode === 'stub') {
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
      mode: mode === 'openai' ? 'openai' : 'ollama',
      provider: mode,
      model: configuredModel,
      status: 'fallback',
      fallback_used: true,
      prompt_version: 'stub-v1',
      error_message:
        'Provider-backed narrative generation is not enabled in this runtime build; deterministic fallback used instead.',
    },
  };
}
