import { z } from 'zod';

export const technologyFamilySchema = z.enum([
  'microbial_fuel_cell',
  'microbial_electrolysis_cell',
  'microbial_electrochemical_technology',
]);

export const primaryObjectiveSchema = z.enum([
  'wastewater_treatment',
  'hydrogen_recovery',
  'nitrogen_recovery',
  'sensing',
  'low_power_generation',
  'biogas_synergy',
  'other',
]);

export const confidenceLevelSchema = z.enum(['low', 'medium', 'high']);

export const evidenceTypeSchema = z.enum([
  'literature_evidence',
  'internal_benchmark',
  'supplier_claim',
  'engineering_assumption',
  'derived_heuristic',
]);

export const evidenceStrengthSchema = z.enum(['weak', 'moderate', 'strong']);

export const narrativeModeSchema = z.enum([
  'disabled',
  'stub',
  'openai',
  'ollama',
]);

export const narrativeStatusSchema = z.enum([
  'disabled',
  'generated',
  'fallback',
  'error',
]);

export const agentStageModeSchema = z.enum([
  'deterministic',
  'llm_assisted',
  'validation',
]);

export const agentStageStatusSchema = z.enum([
  'completed',
  'skipped',
  'degraded',
]);

const flexibleObjectSchema = z.object({}).catchall(z.unknown());

export const supplierContextSchema = z
  .object({
    current_suppliers: z.array(z.string()).default([]),
    preferred_suppliers: z.array(z.string()).default([]),
    excluded_suppliers: z.array(z.string()).default([]),
    supplier_preference_notes: z.string().optional(),
  })
  .catchall(z.unknown());

export const rawEvidenceRecordSchema = z
  .object({
    evidence_id: z.string().optional(),
    evidence_type: evidenceTypeSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    applicability_scope: flexibleObjectSchema.default({}),
    strength_level: evidenceStrengthSchema,
    provenance_note: z.string().min(1),
    quantitative_metrics: flexibleObjectSchema.optional(),
    operating_conditions: flexibleObjectSchema.optional(),
    block_mapping: z.array(z.string()).default([]),
    limitations: z.array(z.string()).default([]),
    contradiction_notes: z.array(z.string()).default([]),
    supplier_name: z.string().optional(),
    benchmark_context: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .catchall(z.unknown());

export const evidenceRecordSchema = rawEvidenceRecordSchema.extend({
  evidence_id: z.string().min(1),
});

export const businessContextSchema = flexibleObjectSchema.extend({
  decision_horizon: z.string().optional(),
  deployment_context: z.string().optional(),
  capex_constraint_level: z.string().optional(),
  opex_sensitivity_level: z.string().optional(),
  retrofit_priority: z.string().optional(),
  serviceability_priority: z.string().optional(),
  priorities: z.array(z.string()).optional(),
  hard_constraints: z.array(z.string()).optional(),
  local_energy_cost_note: z.string().optional(),
  primary_objective: primaryObjectiveSchema.optional(),
});

export const technologyContextSchema = flexibleObjectSchema.extend({
  technology_family: technologyFamilySchema.optional(),
  architecture_family: z.string().optional(),
  scale_context: z.string().optional(),
  current_trl: z.union([z.number(), z.string()]).optional(),
  current_pain_points: z.array(z.string()).optional(),
  performance_claims_under_review: z.array(z.string()).optional(),
  target_maturity_window: z.string().optional(),
  membrane_presence: z.string().optional(),
});

export const feedAndOperationSchema = flexibleObjectSchema.extend({
  influent_type: z.string().optional(),
  substrate_profile: z.string().optional(),
  influent_cod_mg_per_l: z.number().optional(),
  pH: z.number().optional(),
  temperature_c: z.number().optional(),
  conductivity_ms_per_cm: z.number().optional(),
  hydraulic_retention_time_h: z.number().optional(),
  salinity_or_conductivity_context: z.string().optional(),
  operating_regime: z.string().optional(),
});

const reactorArchitectureSchema = flexibleObjectSchema.extend({
  architecture_type: z.string().default('needs_classification'),
  solids_tolerance: z.string().default('unknown'),
  serviceability_level: z.string().default('unknown'),
  membrane_presence: z
    .enum(['present', 'absent', 'unknown'])
    .default('unknown'),
});

const anodeBiofilmSupportSchema = flexibleObjectSchema.extend({
  material_family: z.string().default('unknown'),
  surface_treatment: z.string().default('unknown'),
  biofilm_support_level: z.string().default('unknown'),
});

const cathodeCatalystSupportSchema = flexibleObjectSchema.extend({
  reaction_target: z.string().default('unknown'),
  catalyst_family: z.string().default('unknown'),
  mass_transport_limitation_risk: z.string().default('medium'),
  gas_handling_interface: z.string().default('unknown'),
});

const membraneOrSeparatorSchema = flexibleObjectSchema.extend({
  type: z.string().default('unknown'),
  fouling_risk: z.string().default('unknown'),
  crossover_control_level: z.string().default('unknown'),
});

const electricalInterconnectSchema = flexibleObjectSchema.extend({
  current_collection_strategy: z.string().default('unknown'),
  sealing_strategy: z.string().default('unknown'),
  corrosion_protection_level: z.string().default('unknown'),
});

const balanceOfPlantSchema = flexibleObjectSchema.extend({
  flow_control: z.string().default('unknown'),
  gas_handling_readiness: z.string().default('unknown'),
  dosing_capability: z.string().default('unknown'),
});

const sensorsAndAnalyticsSchema = flexibleObjectSchema.extend({
  data_quality: z.string().default('medium'),
  voltage_current_logging: z.string().default('unknown'),
  water_quality_coverage: z.string().default('unknown'),
});

const operationalBiologySchema = flexibleObjectSchema.extend({
  biofilm_maturity: z.string().default('unknown'),
  contamination_risk: z.string().default('unknown'),
  inoculum_source: z.string().default('unknown'),
  startup_protocol: z.string().default('unknown'),
});

export const stackBlocksSchema = z.object({
  reactor_architecture: reactorArchitectureSchema.default({}),
  anode_biofilm_support: anodeBiofilmSupportSchema.default({}),
  cathode_catalyst_support: cathodeCatalystSupportSchema.default({}),
  membrane_or_separator: membraneOrSeparatorSchema.default({}),
  electrical_interconnect_and_sealing: electricalInterconnectSchema.default({}),
  balance_of_plant: balanceOfPlantSchema.default({}),
  sensors_and_analytics: sensorsAndAnalyticsSchema.default({}),
  operational_biology: operationalBiologySchema.default({}),
});

const technoeconomicsLayerSchema = flexibleObjectSchema.extend({
  maintenance_burden: z.string().default('medium'),
  capex_constraint_level: z.string().optional(),
  opex_sensitivity_level: z.string().optional(),
  priorities: z.array(z.string()).default([]),
  hard_constraints: z.array(z.string()).default([]),
  local_energy_cost_note: z.string().optional(),
});

const evidenceAndProvenanceLayerSchema = flexibleObjectSchema.extend({
  evidence_profile: z.string().default('evidence_sparse'),
  supplier_claim_fraction: z.string().default('none'),
  typed_evidence: z.array(evidenceRecordSchema).default([]),
  evidence_refs: z.array(z.string()).default([]),
});

const riskAndMaturityLayerSchema = flexibleObjectSchema.extend({
  trl: z.number().int().min(1).max(9).default(3),
  scale_up_risk: z.string().default('unknown'),
  serviceability_risk: z.string().default('unknown'),
  supplier_context: supplierContextSchema.default({
    current_suppliers: [],
    preferred_suppliers: [],
    excluded_suppliers: [],
  }),
});

export const crossCuttingLayersSchema = z.object({
  technoeconomics: technoeconomicsLayerSchema.default({}),
  evidence_and_provenance: evidenceAndProvenanceLayerSchema.default({}),
  risk_and_maturity: riskAndMaturityLayerSchema.default({}),
});

export const rawCaseInputSchema = z.object({
  case_id: z.string().optional(),
  case_metadata: flexibleObjectSchema.optional(),
  technology_family: z.string().optional(),
  architecture_family: z.string().optional(),
  primary_objective: z.string().optional(),
  business_context: businessContextSchema.optional(),
  technology_context: technologyContextSchema.optional(),
  feed_and_operation: feedAndOperationSchema.optional(),
  stack_blocks: z.object({}).catchall(flexibleObjectSchema).optional(),
  cross_cutting_layers: crossCuttingLayersSchema.partial().optional(),
  measured_metrics: z.record(z.string(), z.unknown()).optional(),
  evidence_refs: z.array(z.string()).optional(),
  evidence_records: z.array(rawEvidenceRecordSchema).optional(),
  assumptions: z.array(z.string()).optional(),
  missing_data: z.array(z.string()).optional(),
  defaults_used: z.array(z.string()).optional(),
  supplier_context: supplierContextSchema.optional(),
  normalization_status: flexibleObjectSchema.optional(),
});

export const normalizedCaseInputSchema = z.object({
  case_id: z.string().min(1),
  technology_family: technologyFamilySchema,
  architecture_family: z.string().min(1),
  primary_objective: primaryObjectiveSchema,
  business_context: businessContextSchema.default({}),
  technology_context: technologyContextSchema.default({}),
  feed_and_operation: feedAndOperationSchema.default({}),
  stack_blocks: stackBlocksSchema,
  cross_cutting_layers: crossCuttingLayersSchema,
  measured_metrics: z.record(z.string(), z.unknown()).default({}),
  evidence_refs: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  missing_data: z.array(z.string()).default([]),
  defaults_used: z.array(z.string()).default([]),
});

export const recommendationRecordSchema = z.object({
  recommendation_id: z.string().min(1),
  linked_diagnosis: z.string().min(1),
  rationale: z.string().min(1),
  expected_benefit: z.string().min(1),
  implementation_effort: z.enum(['low', 'medium', 'high']),
  economic_plausibility: z.enum(['low', 'medium', 'high']),
  risk_level: z.enum(['low', 'medium', 'high']),
  maturity_level: z.enum(['low', 'medium', 'high']),
  evidence_strength_summary: z.string().min(1),
  assumptions: z.array(z.string()),
  missing_data_dependencies: z.array(z.string()),
  confidence_level: confidenceLevelSchema,
  supplier_candidates: z.array(z.string()).optional(),
  prerequisite_actions: z.array(z.string()).optional(),
  measurement_requests: z.array(z.string()).optional(),
  phase_assignment: z.string().optional(),
  rule_refs: z.array(z.string()).optional(),
  evidence_refs: z.array(z.string()).optional(),
  provenance_notes: z.array(z.string()).optional(),
  priority_score: z.number().min(0).max(100).optional(),
});

export const currentStackDiagnosisSchema = z.object({
  summary: z.string().min(1),
  block_findings: z.array(
    z.object({
      block: z.string().min(1),
      status: z.enum(['documented', 'needs-data', 'attention']),
      finding: z.string().min(1),
      rule_refs: z.array(z.string()).default([]),
      severity: z.enum(['low', 'medium', 'high']).optional(),
    }),
  ),
  main_weaknesses_or_blind_spots: z.array(z.string()).default([]),
});

export const impactMapEntrySchema = z.object({
  option: z.string().min(1),
  technical_impact: z.string().min(1),
  economic_plausibility: z.string().min(1),
  maturity_or_readiness: z.string().min(1),
  dependencies: z.array(z.string()),
  confidence: confidenceLevelSchema,
  priority_score: z.number().min(0).max(100).optional(),
});

export const supplierShortlistEntrySchema = z.object({
  category: z.string().min(1),
  candidate_path: z.string().min(1),
  fit_note: z.string().min(1),
  missing_information_before_commitment: z.array(z.string()),
});

export const phasedRoadmapEntrySchema = z.object({
  phase: z.string().min(1),
  title: z.string().min(1),
  actions: z.array(z.string()),
});

export const assumptionsAndDefaultsAuditSchema = z.object({
  assumptions: z.array(z.string()),
  defaults_used: z.array(z.string()),
  missing_data: z.array(z.string()),
});

export const confidenceAndUncertaintySummarySchema = z.object({
  confidence_level: confidenceLevelSchema,
  summary: z.string().min(1),
  next_tests: z.array(z.string()),
  provenance_notes: z.array(z.string()).default([]),
  sensitivity_level: z.enum(['low', 'medium', 'high']).optional(),
});

export const decisionOutputSchema = z.object({
  current_stack_diagnosis: currentStackDiagnosisSchema,
  prioritized_improvement_options: z.array(recommendationRecordSchema),
  impact_map: z.array(impactMapEntrySchema),
  supplier_shortlist: z.array(supplierShortlistEntrySchema),
  phased_roadmap: z.array(phasedRoadmapEntrySchema),
  assumptions_and_defaults_audit: assumptionsAndDefaultsAuditSchema,
  confidence_and_uncertainty_summary: confidenceAndUncertaintySummarySchema,
});

export const agentPipelineStageSchema = z.object({
  stage_id: z.string().min(1),
  agent_name: z.string().min(1),
  mode: agentStageModeSchema,
  status: agentStageStatusSchema,
  input_contract: z.string().min(1),
  output_contract: z.string().min(1),
  assistant_surface: z.string().optional(),
  deterministic_owner: z.string().optional(),
  notes: z.array(z.string()).default([]),
});

export const narrativeMetadataSchema = z.object({
  mode: narrativeModeSchema,
  provider: z.string().nullable(),
  model: z.string().nullable(),
  status: narrativeStatusSchema,
  fallback_used: z.boolean(),
  prompt_version: z.string().min(1),
  error_message: z.string().nullable().optional(),
});

export const auditRecordSchema = z.object({
  audit_id: z.string().min(1),
  timestamp: z.string().min(1),
  actor_role: z.string().min(1),
  actor_id: z.string().optional(),
  defaults_count: z.number().int().nonnegative(),
  missing_data_count: z.number().int().nonnegative(),
  confidence_level: confidenceLevelSchema,
  summary: z.string().min(1),
  defaults_used: z.array(z.string()).default([]),
  missing_data: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  next_tests: z.array(z.string()).default([]),
  provenance_notes: z.array(z.string()).default([]),
  raw_input_snapshot: rawCaseInputSchema,
  typed_evidence: z.array(evidenceRecordSchema).default([]),
  agent_pipeline_trace: z.array(agentPipelineStageSchema).default([]),
});

export const evaluationResponseSchema = z.object({
  evaluation_id: z.string().min(1),
  case_id: z.string().min(1),
  normalized_case: normalizedCaseInputSchema,
  decision_output: decisionOutputSchema,
  audit_record: auditRecordSchema,
  narrative: z.string().nullable(),
  narrative_metadata: narrativeMetadataSchema,
});

export const evaluationSummarySchema = z.object({
  evaluation_id: z.string().min(1),
  case_id: z.string().min(1),
  created_at: z.string().min(1),
  confidence_level: confidenceLevelSchema,
  technology_family: technologyFamilySchema,
  primary_objective: primaryObjectiveSchema,
  summary: z.string().min(1),
  narrative_available: z.boolean(),
});

export const evaluationListResponseSchema = z.object({
  items: z.array(evaluationSummarySchema),
});

export const caseSnapshotSchema = z.object({
  case_id: z.string().min(1),
  technology_family: technologyFamilySchema,
  architecture_family: z.string().min(1),
  primary_objective: primaryObjectiveSchema,
  raw_intake_snapshot: rawCaseInputSchema,
  normalized_case: normalizedCaseInputSchema,
  defaults_used: z.array(z.string()),
  missing_data: z.array(z.string()),
  assumptions: z.array(z.string()),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const auditEventSchema = z.object({
  event_id: z.string().min(1),
  case_id: z.string().optional(),
  evaluation_id: z.string().optional(),
  event_type: z.string().min(1),
  actor_role: z.string().min(1),
  actor_id: z.string().optional(),
  payload: flexibleObjectSchema,
  created_at: z.string().min(1),
});

export const caseHistoryResponseSchema = z.object({
  case: caseSnapshotSchema,
  evaluations: z.array(evaluationSummarySchema),
  evidence_records: z.array(evidenceRecordSchema),
  audit_events: z.array(auditEventSchema),
});

export type RawCaseInput = z.infer<typeof rawCaseInputSchema>;
export type SupplierContext = z.infer<typeof supplierContextSchema>;
export type RawEvidenceRecord = z.infer<typeof rawEvidenceRecordSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type NormalizedCaseInput = z.infer<typeof normalizedCaseInputSchema>;
export type RecommendationRecord = z.infer<typeof recommendationRecordSchema>;
export type DecisionOutput = z.infer<typeof decisionOutputSchema>;
export type AgentPipelineStage = z.infer<typeof agentPipelineStageSchema>;
export type NarrativeMetadata = z.infer<typeof narrativeMetadataSchema>;
export type AuditRecord = z.infer<typeof auditRecordSchema>;
export type EvaluationResponse = z.infer<typeof evaluationResponseSchema>;
export type EvaluationSummary = z.infer<typeof evaluationSummarySchema>;
export type EvaluationListResponse = z.infer<
  typeof evaluationListResponseSchema
>;
export type CaseSnapshot = z.infer<typeof caseSnapshotSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type CaseHistoryResponse = z.infer<typeof caseHistoryResponseSchema>;
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;
