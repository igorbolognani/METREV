import type {
  ConfidenceLevel,
  DecisionOutput,
  EvidenceExplorerWarehouseSnapshot,
  ExternalEvidenceCatalogItemSummary,
  NarrativeMetadata,
  NormalizedCaseInput,
  PrintableEvaluationReportResponse,
  ReportConversationCitation,
  ReportConversationGrounding,
  ResearchColumnDefinition,
  ResearchEvidenceTrace,
  ResearchPaperMetadata,
} from '@metrev/domain-contracts';

export interface NarrativeResult {
  narrative: string | null;
  narrativeMetadata: NarrativeMetadata;
}

export interface ReportConversationRecentTurnContext {
  actor: 'user' | 'assistant' | 'system';
  message: string;
  selectedSection?: string | null;
}

export interface ReportConversationBoundedContextSummary {
  normalizedCase: {
    caseId: string;
    technologyFamily: string;
    architectureFamily: string;
    primaryObjective: string;
    evidenceRefs: string[];
  };
  decisionOutput: {
    stackDiagnosis: string;
    topRecommendations: string[];
    confidenceLevel: ConfidenceLevel;
  };
  defaultsAndMissingData: {
    defaultsUsed: string[];
    missingData: string[];
    assumptions: string[];
    nextTests: string[];
  };
  simulation: {
    status: string;
    modelVersion: string | null;
    confidenceLevel: ConfidenceLevel | null;
    derivedObservationCount: number;
    assumptionCount: number;
  };
  suppliers: string[];
  lineageCounts: {
    sourceUsageCount: number;
    claimUsageCount: number;
    snapshotCount: number;
  };
}

export interface ReportConversationContextPackage {
  report: PrintableEvaluationReportResponse;
  normalizedCase: NormalizedCaseInput;
  decisionOutput: DecisionOutput;
  grounding: ReportConversationGrounding;
  citations: ReportConversationCitation[];
  selectedSection?: string | null;
  recentTurns: ReportConversationRecentTurnContext[];
  boundedSummary: ReportConversationBoundedContextSummary;
}

export interface ReportConversationAnswerResult extends NarrativeResult {
  refusalReason: string | null;
}

export interface StructuredResearchExtractionResult {
  answer: unknown;
  confidence: ConfidenceLevel;
  evidenceTrace: ResearchEvidenceTrace[];
  metadata: NarrativeMetadata;
  missingFields: string[];
}

type SupportedNarrativeMode = 'disabled' | 'stub' | 'ollama';
type CompletionProvider = 'ollama';

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

function completionProviderForMode(
  mode: SupportedNarrativeMode,
): CompletionProvider | null {
  if (mode === 'ollama') {
    return mode;
  }

  return null;
}

function baseUrlForProvider(_provider: CompletionProvider): string {
  return getOllamaBaseUrl();
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

function extractCompletionMessageContent(payload: unknown): string | null {
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

async function requestChatCompletion(input: {
  provider: CompletionProvider;
  promptVersion: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
}): Promise<NarrativeResult> {
  const model = configuredModelForMode(input.provider) ?? 'llama3.1';
  const controller = new AbortController();
  const timeoutMs = getOllamaTimeoutMs();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${baseUrlForProvider(input.provider)}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: input.messages,
          temperature: 0,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `${input.provider} request failed with status ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const content = extractCompletionMessageContent(payload);

    if (!content) {
      throw new Error(
        `${input.provider} response did not include a chat completion message.`,
      );
    }

    return {
      narrative: content,
      narrativeMetadata: {
        mode: input.provider,
        provider: input.provider,
        model,
        status: 'generated',
        fallback_used: false,
        prompt_version: input.promptVersion,
        error_message: null,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `${input.provider} request timed out after ${timeoutMs} ms.`,
      );
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
  providerPromptVersions: {
    ollama: string;
  };
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

  const provider = completionProviderForMode(runtimeMode);
  if (provider && !unsupportedMode) {
    try {
      return await requestChatCompletion({
        provider,
        promptVersion: input.providerPromptVersions.ollama,
        messages: input.buildOllamaMessages(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      return buildStubNarrativeResult({
        narrative: input.stubNarrative,
        status: 'fallback',
        promptVersion: input.stubPromptVersion,
        errorMessage: `METREV_LLM_MODE "${runtimeMode}" failed while generating this response: ${message}. The deterministic stub summary was used instead.`,
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

function truncateForPrompt(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function stripJsonCodeFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function isResearchEvidenceTrace(
  value: unknown,
): value is ResearchEvidenceTrace {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { source?: unknown }).source === 'string' &&
    typeof (value as { source_document_id?: unknown }).source_document_id ===
      'string' &&
    typeof (value as { text_span?: unknown }).text_span === 'string',
  );
}

function parseStructuredExtractionPayload(
  value: string,
): Omit<StructuredResearchExtractionResult, 'metadata'> {
  const parsed = JSON.parse(stripJsonCodeFence(value)) as {
    answer?: unknown;
    confidence?: unknown;
    evidence_trace?: unknown;
    missing_fields?: unknown;
  };
  const confidence =
    parsed.confidence === 'high' ||
    parsed.confidence === 'medium' ||
    parsed.confidence === 'low'
      ? parsed.confidence
      : ('low' as const);

  return {
    answer: parsed.answer ?? null,
    confidence,
    evidenceTrace: Array.isArray(parsed.evidence_trace)
      ? parsed.evidence_trace.filter(isResearchEvidenceTrace)
      : [],
    missingFields: Array.isArray(parsed.missing_fields)
      ? parsed.missing_fields.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [],
  };
}

function buildStructuredResearchExtractionMessages(input: {
  column: ResearchColumnDefinition;
  paper: ResearchPaperMetadata;
  sourceText: string;
}): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content:
        'You extract structured literature evidence for METREV. Use only the supplied paper text. Return JSON only with keys answer, confidence, evidence_trace, and missing_fields. evidence_trace must be an array of objects with source, source_document_id, text_span, source_locator, and page_number. text_span must quote or tightly paraphrase only text present in the source.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        paper: {
          paper_id: input.paper.paper_id,
          source_document_id: input.paper.source_document_id,
          title: input.paper.title,
          doi: input.paper.doi,
          year: input.paper.year,
          source_type: input.paper.source_type,
        },
        column: {
          column_id: input.column.column_id,
          name: input.column.name,
          instructions: input.column.instructions,
          output_schema_key: input.column.output_schema_key,
          output_schema: input.column.output_schema,
        },
        source_text: truncateForPrompt(input.sourceText, 16000),
      }),
    },
  ];
}

export async function generateStructuredResearchExtraction(input: {
  column: ResearchColumnDefinition;
  paper: ResearchPaperMetadata;
  sourceText: string;
}): Promise<StructuredResearchExtractionResult | null> {
  const { runtimeMode, unsupportedMode } = resolveNarrativeMode();
  const provider = completionProviderForMode(runtimeMode);

  if (!provider || unsupportedMode) {
    return null;
  }

  try {
    const result = await requestChatCompletion({
      provider,
      promptVersion: 'research-extraction-ollama-v1',
      messages: buildStructuredResearchExtractionMessages(input),
    });

    if (!result.narrative) {
      return null;
    }

    const parsed = parseStructuredExtractionPayload(result.narrative);
    if (parsed.evidenceTrace.length === 0 || parsed.answer === null) {
      return null;
    }

    return {
      ...parsed,
      metadata: result.narrativeMetadata,
    };
  } catch {
    return null;
  }
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
    providerPromptVersions: {
      ollama: 'evidence-assistant-ollama-v1',
    },
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
    providerPromptVersions: {
      ollama: 'ollama-case-v1',
    },
    buildOllamaMessages: () => buildCaseNarrativeMessages(input),
  });
}

function resolveReportConversationRefusal(message: string): string | null {
  const normalized = message.toLowerCase();
  const matches = (patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(normalized));

  if (
    matches([
      /\braw database\b/,
      /\bdump\b/,
      /\ball articles\b/,
      /\bfull warehouse\b/,
    ])
  ) {
    return 'This report assistant can explain the generated report, but it cannot dump the raw database or full evidence warehouse.';
  }

  if (
    matches([/\bguarantee(?:d|s)?\b/, /\bcertain\b/, /\bbuy this supplier\b/])
  ) {
    return 'This report assistant cannot provide guarantees or supplier purchase certainty. It can explain the report confidence, caveats, and next checks.';
  }

  if (matches([/\bwhat if\b/, /\bsimulate\b/, /\brecalculate\b/])) {
    return 'Speculative what-if answers need deterministic recalculation first. This assistant can explain the current report and identify what should be recalculated.';
  }

  return null;
}

function buildReportConversationStubAnswer(input: {
  context: ReportConversationContextPackage;
  message: string;
  refusalReason: string | null;
}): string {
  const { report } = input.context;
  const confidence = report.sections.confidence_and_uncertainty_summary;
  const topRecommendation = report.sections.prioritized_improvements[0];
  const selectedSection = input.context.selectedSection?.trim();
  const priorUserTurn = input.context.recentTurns
    .slice(0, -1)
    .reverse()
    .find((turn) => turn.actor === 'user');

  if (input.refusalReason) {
    return `${input.refusalReason} For this report, the safest next step is to review the confidence summary and the recommended next checks: ${
      confidence.next_tests.slice(0, 2).join('; ') || confidence.summary
    }`;
  }

  if (selectedSection) {
    const continuation = priorUserTurn
      ? ` This continues the earlier thread about "${priorUserTurn.message}".`
      : '';

    return `For the ${selectedSection} section of ${report.title}, the report should be read with ${confidence.confidence_level} confidence. ${confidence.summary}${continuation}`;
  }

  if (topRecommendation) {
    return `${report.title} identifies ${topRecommendation.recommendation_id} as the leading improvement path: ${topRecommendation.expected_benefit}. The rationale is ${topRecommendation.rationale}. Confidence is ${confidence.confidence_level}, so the next checks are ${confidence.next_tests.slice(0, 2).join('; ') || 'to close the missing measurements listed in the report'}.`;
  }

  return `${report.title} does not identify a dominant improvement path. The report should be used to validate the current stack diagnosis, close missing measurements, and revisit the assumptions/defaults audit before committing to a change.`;
}

function buildReportConversationMessages(input: {
  context: ReportConversationContextPackage;
  message: string;
  refusalReason: string | null;
}) {
  return [
    {
      role: 'system' as const,
      content:
        'You answer questions about one METREV report. Use only the supplied report context. Do not browse, dump databases, reveal raw internals, invent evidence, guarantee outcomes, or run what-if simulations. Keep the answer concise and cite report sections conceptually.',
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        user_question: input.message,
        refusal_reason: input.refusalReason,
        selected_section: input.context.selectedSection ?? null,
        grounding: input.context.grounding,
        citations: input.context.citations,
        recent_turns: input.context.recentTurns,
        bounded_context: input.context.boundedSummary,
        report: {
          title: input.context.report.title,
          subtitle: input.context.report.subtitle,
          evaluation: input.context.report.evaluation,
          sections: input.context.report.sections,
          lineage_counts: {
            source_usages:
              input.context.report.evaluation_lineage.source_usages.length,
            claim_usages:
              input.context.report.evaluation_lineage.claim_usages.length,
            workspace_snapshots:
              input.context.report.evaluation_lineage.workspace_snapshots
                .length,
          },
        },
      }),
    },
  ];
}

export async function generateReportConversationAnswer(input: {
  context: ReportConversationContextPackage;
  message: string;
}): Promise<ReportConversationAnswerResult> {
  const refusalReason = resolveReportConversationRefusal(input.message);
  const result = await generateNarrativeWithRuntime({
    stubNarrative: buildReportConversationStubAnswer({
      context: input.context,
      message: input.message,
      refusalReason,
    }),
    disabledPromptVersion: 'report-conversation-disabled-v1',
    stubPromptVersion: 'report-conversation-stub-v1',
    providerPromptVersions: {
      ollama: 'report-conversation-ollama-v1',
    },
    buildOllamaMessages: () =>
      buildReportConversationMessages({
        context: input.context,
        message: input.message,
        refusalReason,
      }),
  });

  return {
    ...result,
    refusalReason,
  };
}
