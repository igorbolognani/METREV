import { randomUUID } from 'node:crypto';

import type {
  AuditRecord,
  DecisionOutput,
  NormalizedCaseInput,
  RawCaseInput,
} from '@metrev/domain-contracts';
import { buildBioelectroAgentPipelineTrace } from '@metrev/domain-contracts';

export function createAuditRecord(input: {
  actorRole: string;
  actorId?: string;
  decisionOutput: DecisionOutput;
  normalizedCase: NormalizedCaseInput;
  rawInput: RawCaseInput;
}): AuditRecord {
  const typedEvidence =
    input.normalizedCase.cross_cutting_layers.evidence_and_provenance
      .typed_evidence;
  const provenanceNotes =
    input.decisionOutput.confidence_and_uncertainty_summary.provenance_notes;

  return {
    audit_id: randomUUID(),
    timestamp: new Date().toISOString(),
    actor_role: input.actorRole,
    actor_id: input.actorId,
    defaults_count: input.normalizedCase.defaults_used.length,
    missing_data_count: input.normalizedCase.missing_data.length,
    confidence_level:
      input.decisionOutput.confidence_and_uncertainty_summary.confidence_level,
    summary: `Decision run for ${input.normalizedCase.case_id} completed with ${input.normalizedCase.missing_data.length} missing-data flags.`,
    defaults_used: input.normalizedCase.defaults_used,
    missing_data: input.normalizedCase.missing_data,
    assumptions: input.normalizedCase.assumptions,
    next_tests:
      input.decisionOutput.confidence_and_uncertainty_summary.next_tests,
    provenance_notes: provenanceNotes,
    raw_input_snapshot: input.rawInput,
    typed_evidence: typedEvidence,
    agent_pipeline_trace: buildBioelectroAgentPipelineTrace({
      rawInput: input.rawInput,
      normalizedCase: input.normalizedCase,
      decisionOutput: input.decisionOutput,
    }),
  };
}
