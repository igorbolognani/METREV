import type {
  DecisionOutput,
  NormalizedCaseInput,
  RawCaseInput,
} from './schemas';

import { agentPipelineStageSchema, type AgentPipelineStage } from './schemas';

export const bioelectroAgentPipelineDefinition = [
  {
    stage_id: 'client_intake_normalizer',
    agent_name: 'Client Intake Normalizer',
    mode: 'deterministic',
    input_contract: 'raw_case_input',
    output_contract: 'normalized_case_input',
    assistant_surface: '.github/agents/client-intake-normalizer.agent.md',
    deterministic_owner: 'packages/domain-contracts/src/normalize.ts',
  },
  {
    stage_id: 'evidence_curator',
    agent_name: 'Evidence Curator',
    mode: 'deterministic',
    input_contract: 'normalized_case_input + evidence_schema',
    output_contract: 'typed_evidence_bundle',
    assistant_surface: '.github/agents/evidence-curator.agent.md',
    deterministic_owner: 'packages/domain-contracts/src/normalize.ts',
  },
  {
    stage_id: 'inference_engine',
    agent_name: 'Inference Engine',
    mode: 'deterministic',
    input_contract: 'normalized_case_input + canonical_rule_assets',
    output_contract: 'structured_decision_findings',
    assistant_surface: '.github/agents/inference-engine.agent.md',
    deterministic_owner: 'packages/rule-engine/src/index.ts',
  },
  {
    stage_id: 'decision_prioritizer',
    agent_name: 'Decision Prioritizer',
    mode: 'deterministic',
    input_contract: 'structured_decision_findings',
    output_contract: 'normalized_decision_output',
    assistant_surface: '.github/agents/decision-prioritizer.agent.md',
    deterministic_owner: 'packages/rule-engine/src/index.ts',
  },
  {
    stage_id: 'validation_sentinel',
    agent_name: 'Validation Sentinel',
    mode: 'validation',
    input_contract: 'normalized_decision_output + audit_context',
    output_contract: 'validated_decision_package',
    assistant_surface: '.github/agents/validation-sentinel.agent.md',
    deterministic_owner: 'packages/audit/src/index.ts',
  },
] as const;

export function buildBioelectroAgentPipelineTrace(input: {
  rawInput: RawCaseInput;
  normalizedCase: NormalizedCaseInput;
  decisionOutput: DecisionOutput;
}): AgentPipelineStage[] {
  const evidenceCount =
    input.normalizedCase.cross_cutting_layers.evidence_and_provenance
      .typed_evidence.length;
  const hasMissingData = input.normalizedCase.missing_data.length > 0;
  const confidenceLevel =
    input.decisionOutput.confidence_and_uncertainty_summary.confidence_level;

  return bioelectroAgentPipelineDefinition.map((stage) => {
    if (stage.stage_id === 'evidence_curator' && evidenceCount === 0) {
      return agentPipelineStageSchema.parse({
        ...stage,
        status: 'degraded',
        notes: [
          'No typed evidence records were supplied; downstream confidence remains bounded by defaults and missing-data flags.',
        ],
      });
    }

    if (stage.stage_id === 'validation_sentinel' && hasMissingData) {
      return agentPipelineStageSchema.parse({
        ...stage,
        status: 'completed',
        notes: [
          `Validation kept confidence at ${confidenceLevel} because missing data stayed explicit and next tests were generated.`,
        ],
      });
    }

    return agentPipelineStageSchema.parse({
      ...stage,
      status: 'completed',
      notes:
        stage.stage_id === 'client_intake_normalizer' && !input.rawInput.case_id
          ? [
              'Case identifier was generated during normalization and recorded as an explicit default.',
            ]
          : [],
    });
  });
}
