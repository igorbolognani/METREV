import { randomUUID } from 'node:crypto';

import type { EvaluationRepository } from '@metrev/database';
import {
  reportConversationResponseSchema,
  type EvaluationResponse,
  type PrintableEvaluationReportResponse,
  type ReportConversationCitation,
  type ReportConversationGrounding,
  type ReportConversationResponse,
  type ReportConversationTurn,
} from '@metrev/domain-contracts';
import {
  generateReportConversationAnswer,
  type ReportConversationAnswerResult,
  type ReportConversationBoundedContextSummary,
  type ReportConversationRecentTurnContext,
} from '@metrev/llm-adapter';

const REPORT_CONVERSATION_HISTORY_LIMIT = 12;

export interface CreatePersistedReportConversationInput {
  actorId: string;
  conversationId?: string | null;
  evaluation: EvaluationResponse;
  evaluationRepository: EvaluationRepository;
  message: string;
  report: PrintableEvaluationReportResponse;
  selectedSection?: string | null;
}

export function buildReportConversationCitations(
  report: PrintableEvaluationReportResponse,
): ReportConversationCitation[] {
  const sourceCitations = report.evaluation_lineage.source_usages.map(
    (usage): ReportConversationCitation => ({
      citation_id: `source:${usage.id}`,
      label: usage.source_document_id,
      section: usage.usage_type,
      source_document_id: usage.source_document_id,
      claim_id: null,
      note: usage.note,
    }),
  );
  const claimCitations = report.evaluation_lineage.claim_usages.map(
    (usage): ReportConversationCitation => ({
      citation_id: `claim:${usage.id}`,
      label: usage.claim_id,
      section: usage.usage_type,
      source_document_id: null,
      claim_id: usage.claim_id,
      note: usage.note,
    }),
  );

  if (sourceCitations.length > 0 || claimCitations.length > 0) {
    return [...sourceCitations, ...claimCitations].slice(0, 12);
  }

  return [
    {
      citation_id: 'report:stack-diagnosis',
      label: 'Stack diagnosis',
      section: 'stack_diagnosis',
      source_document_id: null,
      claim_id: null,
      note: report.sections.stack_diagnosis.summary,
    },
    {
      citation_id: 'report:confidence',
      label: 'Confidence and uncertainty',
      section: 'confidence_and_uncertainty_summary',
      source_document_id: null,
      claim_id: null,
      note: report.sections.confidence_and_uncertainty_summary.summary,
    },
  ];
}

export function buildReportConversationGrounding(input: {
  report: PrintableEvaluationReportResponse;
  selectedSection?: string | null;
}): ReportConversationGrounding {
  return {
    evaluation_id: input.report.evaluation.evaluation_id,
    report_title: input.report.title,
    selected_section: input.selectedSection ?? null,
    used_sections: [
      'stack_diagnosis',
      'prioritized_improvements',
      'impact_map',
      'supplier_shortlist',
      'phased_roadmap',
      'assumptions_and_defaults_audit',
      'confidence_and_uncertainty_summary',
    ],
    source_usage_count: input.report.evaluation_lineage.source_usages.length,
    claim_usage_count: input.report.evaluation_lineage.claim_usages.length,
    snapshot_count: input.report.evaluation_lineage.workspace_snapshots.length,
  };
}

function buildPersistedAssistantMessage(
  answerResult: ReportConversationAnswerResult,
): string {
  if (answerResult.narrative) {
    return answerResult.narrative;
  }

  if (answerResult.refusalReason) {
    return answerResult.refusalReason;
  }

  if (
    answerResult.narrativeMetadata.mode === 'disabled' ||
    answerResult.narrativeMetadata.status === 'disabled'
  ) {
    return 'Report conversation is disabled for this runtime. Review the printable report and confidence summary directly.';
  }

  return 'Report conversation answer unavailable.';
}

function truncateContextValue(value: string, limit = 180): string {
  const normalized = value.trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 3).trimEnd()}...`;
}

function resolveSelectedSection(input: {
  selectedSection?: string | null;
  recentTurns: ReportConversationTurn[];
}): string | null {
  const selectedSection = input.selectedSection?.trim();

  if (selectedSection) {
    return selectedSection;
  }

  for (let index = input.recentTurns.length - 1; index >= 0; index -= 1) {
    const recentSection = input.recentTurns[index].selected_section?.trim();

    if (recentSection) {
      return recentSection;
    }
  }

  return null;
}

function toRecentTurnContext(
  turns: ReportConversationTurn[],
): ReportConversationRecentTurnContext[] {
  return turns.map((turn) => ({
    actor: turn.actor,
    message: truncateContextValue(turn.message, 200),
    selectedSection: turn.selected_section,
  }));
}

function buildReportConversationBoundedSummary(input: {
  evaluation: EvaluationResponse;
  grounding: ReportConversationGrounding;
  report: PrintableEvaluationReportResponse;
}): ReportConversationBoundedContextSummary {
  const simulation = input.evaluation.simulation_enrichment;

  return {
    normalizedCase: {
      caseId: input.evaluation.normalized_case.case_id,
      technologyFamily: input.evaluation.normalized_case.technology_family,
      architectureFamily: input.evaluation.normalized_case.architecture_family,
      primaryObjective: input.evaluation.normalized_case.primary_objective,
      evidenceRefs: input.evaluation.normalized_case.evidence_refs.slice(0, 6),
    },
    decisionOutput: {
      stackDiagnosis: truncateContextValue(
        input.evaluation.decision_output.current_stack_diagnosis.summary,
      ),
      topRecommendations: input.report.sections.prioritized_improvements
        .slice(0, 3)
        .map((entry) =>
          truncateContextValue(
            `${entry.recommendation_id}: ${entry.expected_benefit}`,
          ),
        ),
      confidenceLevel:
        input.evaluation.decision_output.confidence_and_uncertainty_summary
          .confidence_level,
    },
    defaultsAndMissingData: {
      defaultsUsed:
        input.report.sections.assumptions_and_defaults_audit.defaults_used.slice(
          0,
          6,
        ),
      missingData:
        input.report.sections.assumptions_and_defaults_audit.missing_data.slice(
          0,
          6,
        ),
      assumptions:
        input.report.sections.assumptions_and_defaults_audit.assumptions.slice(
          0,
          6,
        ),
      nextTests:
        input.report.sections.confidence_and_uncertainty_summary.next_tests.slice(
          0,
          4,
        ),
    },
    simulation: {
      status: simulation?.status ?? 'not_available',
      modelVersion: simulation?.model_version ?? null,
      confidenceLevel: simulation?.confidence.level ?? null,
      derivedObservationCount: simulation?.derived_observations.length ?? 0,
      assumptionCount: simulation?.assumptions.length ?? 0,
    },
    suppliers: input.report.sections.supplier_shortlist
      .slice(0, 4)
      .map((entry) =>
        truncateContextValue(
          `${entry.category}: ${entry.candidate_path} - ${entry.fit_note}`,
        ),
      ),
    lineageCounts: {
      sourceUsageCount: input.grounding.source_usage_count,
      claimUsageCount: input.grounding.claim_usage_count,
      snapshotCount: input.grounding.snapshot_count,
    },
  };
}

export async function createPersistedReportConversation(
  input: CreatePersistedReportConversationInput,
): Promise<ReportConversationResponse> {
  const conversationId =
    input.conversationId?.trim() || `report-conv-${randomUUID()}`;
  const priorTurns =
    await input.evaluationRepository.listRecentReportConversationTurns({
      conversationId,
      evaluationId: input.evaluation.evaluation_id,
      limit: REPORT_CONVERSATION_HISTORY_LIMIT,
    });
  const resolvedSelectedSection = resolveSelectedSection({
    selectedSection: input.selectedSection ?? null,
    recentTurns: priorTurns,
  });
  const citations = buildReportConversationCitations(input.report);
  const grounding = buildReportConversationGrounding({
    report: input.report,
    selectedSection: resolvedSelectedSection,
  });

  await input.evaluationRepository.saveReportConversationTurn({
    conversationId,
    evaluationId: input.evaluation.evaluation_id,
    actor: 'user',
    actorId: input.actorId,
    message: input.message,
    selectedSection: resolvedSelectedSection,
  });

  const recentTurns =
    await input.evaluationRepository.listRecentReportConversationTurns({
      conversationId,
      evaluationId: input.evaluation.evaluation_id,
      limit: REPORT_CONVERSATION_HISTORY_LIMIT,
    });

  const answerResult = await generateReportConversationAnswer({
    message: input.message,
    context: {
      report: input.report,
      normalizedCase: input.evaluation.normalized_case,
      decisionOutput: input.evaluation.decision_output,
      grounding,
      citations,
      selectedSection: resolvedSelectedSection,
      recentTurns: toRecentTurnContext(recentTurns),
      boundedSummary: buildReportConversationBoundedSummary({
        evaluation: input.evaluation,
        grounding,
        report: input.report,
      }),
    },
  });

  await input.evaluationRepository.saveReportConversationTurn({
    conversationId,
    evaluationId: input.evaluation.evaluation_id,
    actor: 'assistant',
    actorId: input.actorId,
    message: buildPersistedAssistantMessage(answerResult),
    selectedSection: resolvedSelectedSection,
    narrativeMetadata: answerResult.narrativeMetadata,
    citations,
    grounding,
    refusalReason: answerResult.refusalReason,
  });

  return reportConversationResponseSchema.parse({
    conversation_id: conversationId,
    answer: answerResult.narrative,
    citations,
    grounding_summary: grounding,
    uncertainty_summary:
      input.report.sections.confidence_and_uncertainty_summary.summary,
    recommended_next_checks:
      input.report.sections.confidence_and_uncertainty_summary.next_tests,
    narrative_metadata: answerResult.narrativeMetadata,
    metadata: {
      conversation_id: conversationId,
      mode: 'server',
      context_version: 'report-context-v2',
      persisted: true,
      created_at: new Date().toISOString(),
    },
    refusal_reason: answerResult.refusalReason,
  });
}
