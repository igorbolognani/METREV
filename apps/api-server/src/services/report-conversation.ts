import { randomUUID } from 'node:crypto';

import type { EvaluationRepository } from '@metrev/database';
import {
    reportConversationResponseSchema,
    type EvaluationResponse,
    type PrintableEvaluationReportResponse,
    type ReportConversationCitation,
    type ReportConversationGrounding,
    type ReportConversationResponse,
} from '@metrev/domain-contracts';
import {
    generateReportConversationAnswer,
    type ReportConversationAnswerResult,
} from '@metrev/llm-adapter';

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

export async function createPersistedReportConversation(
  input: CreatePersistedReportConversationInput,
): Promise<ReportConversationResponse> {
  const conversationId =
    input.conversationId?.trim() || `report-conv-${randomUUID()}`;
  const citations = buildReportConversationCitations(input.report);
  const grounding = buildReportConversationGrounding({
    report: input.report,
    selectedSection: input.selectedSection ?? null,
  });

  await input.evaluationRepository.saveReportConversationTurn({
    conversationId,
    evaluationId: input.evaluation.evaluation_id,
    actor: 'user',
    actorId: input.actorId,
    message: input.message,
    selectedSection: input.selectedSection ?? null,
  });

  const answerResult = await generateReportConversationAnswer({
    message: input.message,
    context: {
      report: input.report,
      normalizedCase: input.evaluation.normalized_case,
      decisionOutput: input.evaluation.decision_output,
      grounding,
      citations,
      selectedSection: input.selectedSection ?? null,
    },
  });

  await input.evaluationRepository.saveReportConversationTurn({
    conversationId,
    evaluationId: input.evaluation.evaluation_id,
    actor: 'assistant',
    actorId: input.actorId,
    message: buildPersistedAssistantMessage(answerResult),
    selectedSection: input.selectedSection ?? null,
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
      mode: 'client',
      context_version: 'report-context-v1',
      persisted: true,
      created_at: new Date().toISOString(),
    },
    refusal_reason: answerResult.refusalReason,
  });
}
