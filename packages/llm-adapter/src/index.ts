import type {
  DecisionOutput,
  EvidenceExplorerWarehouseSnapshot,
  ExternalEvidenceCatalogItemSummary,
  NarrativeMetadata,
  NormalizedCaseInput,
} from '@metrev/domain-contracts';

export interface NarrativeResult {
  narrative: string | null;
  narrativeMetadata: NarrativeMetadata;
}

type SupportedNarrativeMode = 'disabled' | 'stub' | 'ollama';

const supportedNarrativeModes = new Set<SupportedNarrativeMode>([
  'disabled',
  'stub',
  'ollama',
]);

function resolveNarrativeMode() {
  const requestedMode = process.env.METREV_LLM_MODE?.trim() || 'stub';

  if (supportedNarrativeModes.has(requestedMode as SupportedNarrativeMode)) {
    return {
      requestedMode,
      runtimeMode: requestedMode as SupportedNarrativeMode,
      unsupportedMode: null,
    } as const;
  }

  return {
    requestedMode,
    runtimeMode: 'stub',
    unsupportedMode: requestedMode,
  } as const;
}

function configuredModelForMode(mode: SupportedNarrativeMode | 'stub') {
  const configuredModel = process.env.METREV_LLM_MODEL?.trim();

  if (configuredModel) {
    return configuredModel;
  }

  if (mode === 'ollama') {
    return 'llama3.1';
  }

  return null;
}

function getOllamaBaseUrl(): string {
  return (
    process.env.METREV_LLM_BASE_URL?.trim() || 'http://127.0.0.1:11434/v1'
  ).replace(/\/+$/, '');
}

function getOllamaTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.METREV_LLM_TIMEOUT_MS ?? '', 10);

  if (!Number.isFinite(parsed)) {
    return 4000;
  }

  return Math.min(20000, Math.max(500, parsed));
}

function buildDisabledNarrativeResult(
  configuredModel: string | null,
  promptVersion: string,
): NarrativeResult {
  return {
    narrative: null,
    narrativeMetadata: {
      mode: 'disabled',
      provider: null,
      model: configuredModel,
      status: 'disabled',
      fallback_used: false,
      prompt_version: promptVersion,
      error_message: null,
    },
  };
}

function buildStubNarrativeResult(input: {
  narrative: string;
  status: NarrativeMetadata['status'];
  promptVersion: string;
  errorMessage?: string | null;
}): NarrativeResult {
  return {
    narrative: input.narrative,
    narrativeMetadata: {
      mode: 'stub',
      provider: 'internal',
      model: 'deterministic-summary',
      status: input.status,
      fallback_used: input.status === 'fallback',
      prompt_version: input.promptVersion,
      error_message: input.errorMessage ?? null,
    },
  };
}

function extractOllamaMessageContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const message = (choices[0] as { message?: { content?: unknown } }).message;
  return typeof message?.content === 'string' && message.content.trim()
    ? message.content.trim()
    : null;
}

async function requestOllamaCompletion(input: {
  promptVersion: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
}): Promise<NarrativeResult> {
  const model = configuredModelForMode('ollama') ?? 'llama3.1';
  const controller = new AbortController();
  const timeoutMs = getOllamaTimeoutMs();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getOllamaBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Ollama request failed with status ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const content = extractOllamaMessageContent(payload);

    if (!content) {
      throw new Error(
        'Ollama response did not include a chat completion message.',
      );
    }

    return {
      narrative: content,
      narrativeMetadata: {
        mode: 'ollama',
        provider: 'ollama',
        model,
        status: 'generated',
        fallback_used: false,
        prompt_version: input.promptVersion,
        error_message: null,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Ollama request timed out after ${timeoutMs} ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function generateNarrativeWithRuntime(input: {
  stubNarrative: string;
  disabledPromptVersion: string;
  stubPromptVersion: string;
  ollamaPromptVersion: string;
  buildOllamaMessages: () => Array<{
    role: 'system' | 'user';
    content: string;
  }>;
}): Promise<NarrativeResult> {
  const { runtimeMode, unsupportedMode } = resolveNarrativeMode();
  const configuredModel = configuredModelForMode(runtimeMode);

  if (runtimeMode === 'disabled') {
    return buildDisabledNarrativeResult(
      configuredModel,
      input.disabledPromptVersion,
    );
  }

  if (runtimeMode === 'stub' && !unsupportedMode) {
    return buildStubNarrativeResult({
      narrative: input.stubNarrative,
      status: 'generated',
      promptVersion: input.stubPromptVersion,
    });
  }

  if (runtimeMode === 'ollama' && !unsupportedMode) {
    try {
      return await requestOllamaCompletion({
        promptVersion: input.ollamaPromptVersion,
        messages: input.buildOllamaMessages(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      return buildStubNarrativeResult({
        narrative: input.stubNarrative,
        status: 'fallback',
        promptVersion: input.stubPromptVersion,
        errorMessage: `METREV_LLM_MODE "ollama" failed while generating this response: ${message}. The deterministic stub summary was used instead.`,
      });
    }
  }

  return buildStubNarrativeResult({
    narrative: input.stubNarrative,
    status: 'fallback',
    promptVersion: input.stubPromptVersion,
    errorMessage: `Unsupported METREV_LLM_MODE "${unsupportedMode}" requested; this runtime build supports "disabled", "stub", and "ollama", so the deterministic stub narrative was used instead.`,
  });
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

function buildCaseNarrativeMessages(input: {
  decisionOutput: DecisionOutput;
  normalizedCase: NormalizedCaseInput;
}) {
  return [
    {
      role: 'system' as const,
      content:
        'You write concise METREV decision-support narratives. Use only the supplied deterministic output. Mention confidence honestly, do not invent evidence, and keep the result to three sentences or fewer.',
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        case_id: input.normalizedCase.case_id,
        technology_family: input.normalizedCase.technology_family,
        primary_objective: input.normalizedCase.primary_objective,
        confidence_level:
          input.decisionOutput.confidence_and_uncertainty_summary
            .confidence_level,
        current_stack_summary:
          input.decisionOutput.current_stack_diagnosis.summary,
        leading_recommendations:
          input.decisionOutput.prioritized_improvement_options
            .slice(0, 3)
            .map((recommendation) => ({
              recommendation_id: recommendation.recommendation_id,
              title: recommendation.expected_benefit,
              rationale: recommendation.rationale,
            })),
        missing_data:
          input.decisionOutput.assumptions_and_defaults_audit.missing_data,
        defaults_used:
          input.decisionOutput.assumptions_and_defaults_audit.defaults_used,
      }),
    },
  ];
}

function buildEvidenceAssistantStubNarrative(input: {
  searchQuery?: string;
  reviewStatus?: string;
  sourceType?: string;
  warehouseSnapshot: EvidenceExplorerWarehouseSnapshot;
  spotlight: ExternalEvidenceCatalogItemSummary[];
}): string {
  const snapshot = input.warehouseSnapshot;

  if (snapshot.filtered_item_count === 0) {
    return 'No evidence records match the current explorer filters, so there is nothing to summarize yet. Widen the search or clear one of the active constraints before drawing conclusions.';
  }

  const citedTitles = input.spotlight.slice(0, 2).map((item) => item.title);
  const scopeTokens = [input.reviewStatus, input.sourceType, input.searchQuery]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join(', ');
  const scopeLabel = scopeTokens ? ` for ${scopeTokens}` : '';
  const citedLabel =
    citedTitles.length > 0
      ? ` Current spotlight citations include ${citedTitles.join(' and ')}.`
      : ' No current-page spotlight citations are available for this brief.';

  return `The active explorer view matches ${snapshot.filtered_item_count} warehouse records${scopeLabel}, covering ${snapshot.claim_count} extracted claims and ${snapshot.reviewed_claim_count} reviewed claims. ${snapshot.returned_item_count} row(s) are visible on the current page, so treat the page detail as a sample of the filtered warehouse rather than the full set.${citedLabel}`;
}

function buildEvidenceAssistantMessages(input: {
  searchQuery?: string;
  reviewStatus?: string;
  sourceType?: string;
  warehouseSnapshot: EvidenceExplorerWarehouseSnapshot;
  spotlight: ExternalEvidenceCatalogItemSummary[];
}) {
  return [
    {
      role: 'system' as const,
      content:
        'You write concise METREV evidence-explorer briefs. Use only the provided warehouse snapshot and spotlight citations. Mention uncertainty explicitly, never imply pending evidence is accepted, and keep the result to four sentences or fewer.',
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        filters: {
          review_status: input.reviewStatus ?? null,
          source_type: input.sourceType ?? null,
          search_query: input.searchQuery ?? null,
        },
        warehouse_snapshot: input.warehouseSnapshot,
        spotlight: input.spotlight.map((item) => ({
          id: item.id,
          title: item.title,
          evidence_type: item.evidence_type,
          review_status: item.review_status,
          source_type: item.source_type,
          publisher: item.publisher,
          doi: item.doi,
          source_url: item.source_url,
          claim_count: item.claim_count,
          reviewed_claim_count: item.reviewed_claim_count,
          provenance_note: item.provenance_note,
        })),
      }),
    },
  ];
}

export async function generateEvidenceAssistantBrief(input: {
  searchQuery?: string;
  reviewStatus?: string;
  sourceType?: string;
  warehouseSnapshot: EvidenceExplorerWarehouseSnapshot;
  spotlight: ExternalEvidenceCatalogItemSummary[];
}): Promise<NarrativeResult> {
  return generateNarrativeWithRuntime({
    stubNarrative: buildEvidenceAssistantStubNarrative(input),
    disabledPromptVersion: 'evidence-assistant-disabled-v1',
    stubPromptVersion: 'evidence-assistant-stub-v1',
    ollamaPromptVersion: 'evidence-assistant-ollama-v1',
    buildOllamaMessages: () => buildEvidenceAssistantMessages(input),
  });
}

export async function generateNarrative(input: {
  decisionOutput: DecisionOutput;
  normalizedCase: NormalizedCaseInput;
}): Promise<NarrativeResult> {
  return generateNarrativeWithRuntime({
    stubNarrative: buildStubNarrative(input),
    disabledPromptVersion: 'deterministic-v1',
    stubPromptVersion: 'stub-v1',
    ollamaPromptVersion: 'ollama-case-v1',
    buildOllamaMessages: () => buildCaseNarrativeMessages(input),
  });
}
