import { randomUUID } from 'node:crypto';

import type {
  AuditRecord,
  DecisionOutput,
  NormalizedCaseInput,
  RawCaseInput,
  RuntimeVersion,
  SimulationEnrichment,
} from '@metrev/domain-contracts';
import { buildBioelectroAgentPipelineTrace } from '@metrev/domain-contracts';

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function collectRuleRefs(decisionOutput: DecisionOutput): string[] {
  return uniqueStrings([
    ...decisionOutput.current_stack_diagnosis.block_findings.flatMap(
      (finding) => finding.rule_refs,
    ),
    ...decisionOutput.prioritized_improvement_options.flatMap(
      (recommendation) => recommendation.rule_refs ?? [],
    ),
  ]);
}

function collectEvidenceRefs(decisionOutput: DecisionOutput): string[] {
  return uniqueStrings(
    decisionOutput.prioritized_improvement_options.flatMap(
      (recommendation) => recommendation.evidence_refs ?? [],
    ),
  );
}

export function createAuditRecord(input: {
  actorRole: string;
  actorId?: string;
  decisionOutput: DecisionOutput;
  normalizedCase: NormalizedCaseInput;
  rawInput: RawCaseInput;
  simulationEnrichment?: SimulationEnrichment;
  runtimeVersions: RuntimeVersion;
  entrypoint: 'ui' | 'api' | 'batch' | 'test';
  evaluationId?: string;
  idempotencyKey?: string;
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
      simulationEnrichment: input.simulationEnrichment,
    }),
    runtime_versions: input.runtimeVersions,
    traceability: {
      subject_type: 'evaluation',
      subject_id: input.evaluationId ?? input.normalizedCase.case_id,
      case_id: input.normalizedCase.case_id,
      evaluation_id: input.evaluationId,
      entrypoint: input.entrypoint,
      transformation_stages: [
        'raw_input',
        'normalized_case',
        'simulation_enrichment',
        'deterministic_rules',
        'decision_output_validation',
      ],
      rule_refs: collectRuleRefs(input.decisionOutput),
      evidence_refs: collectEvidenceRefs(input.decisionOutput),
      defaults_count: input.normalizedCase.defaults_used.length,
      missing_data_count: input.normalizedCase.missing_data.length,
      evidence_count: typedEvidence.length,
    },
    idempotency_key: input.idempotencyKey,
  };
}
