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

export const signalSourceKindSchema = z.enum([
  'measured',
  'inferred',
  'modeled',
  'unavailable',
]);

export const simulationEnrichmentStatusSchema = z.enum([
  'disabled',
  'insufficient_data',
  'completed',
  'failed',
]);

export const decisionRelevanceSchema = z.enum(['informational', 'rule_input']);

export const simulationSeriesTypeSchema = z.enum([
  'trend_line',
  'scatter',
  'heatmap',
  'sensitivity_plot',
  'operating_window',
  'polarization_curve',
  'power_curve',
]);

export const simulationExecutionModeSchema = z.enum([
  'internal_model',
  'future_sidecar',
]);

export const evidenceTypeSchema = z.enum([
  'literature_evidence',
  'internal_benchmark',
  'supplier_claim',
  'engineering_assumption',
  'derived_heuristic',
]);

export const evidenceStrengthSchema = z.enum(['weak', 'moderate', 'strong']);

export const externalEvidenceReviewStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
]);

export const externalEvidenceReviewActionSchema = z.enum(['accept', 'reject']);

export const externalEvidenceSourceTypeSchema = z.enum([
  'openalex',
  'crossref',
  'europe_pmc',
  'supplier_profile',
  'market_snapshot',
  'curated_manifest',
  'manual',
]);

export const externalEvidenceAccessStatusSchema = z.enum([
  'gold',
  'green',
  'hybrid',
  'bronze',
  'closed',
  'unknown',
]);

export const evidenceClaimTypeSchema = z.enum([
  'metric',
  'material',
  'architecture',
  'condition',
  'limitation',
  'applicability',
  'economic',
  'supplier_claim',
  'market_signal',
  'other',
]);

export const evidenceExtractionMethodSchema = z.enum([
  'manual',
  'llm',
  'regex',
  'ml',
  'import_rule',
]);

export const ontologyMappingSourceSchema = z.enum([
  'auto',
  'analyst',
  'import_rule',
]);

export const supplierDocumentTypeSchema = z.enum([
  'profile',
  'datasheet',
  'specification',
  'certificate',
  'market_brief',
  'case_study',
  'patent_filing',
  'report',
  'other',
]);

export const evaluationEvidenceUsageTypeSchema = z.enum([
  'attached_input',
  'input_support',
  'diagnostic_support',
  'recommendation_support',
  'supplier_support',
  'report_citation',
]);

export const workspaceSnapshotTypeSchema = z.enum([
  'dashboard',
  'evaluation',
  'comparison',
  'history',
  'evidence_review',
  'report',
  'export_json',
  'export_csv',
]);

export const externalEvidenceSourceStateSchema = z.enum([
  'raw',
  'parsed',
  'normalized',
  'reviewed',
]);

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

export const workspaceToneSchema = z.enum([
  'success',
  'warning',
  'critical',
  'accent',
  'muted',
]);

const flexibleObjectSchema = z.object({}).catchall(z.unknown());

const scalarValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
]);

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

export const simulationAxisSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().nullable().default(null),
});

export const simulationSeriesPointSchema = z.object({
  x: z.number(),
  y: z.number().nullable(),
  z: z.number().nullable().optional(),
  label: z.string().optional(),
  note: z.string().optional(),
  meta: flexibleObjectSchema.default({}),
});

export const derivedObservationSchema = z.object({
  observation_id: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  value: scalarValueSchema,
  unit: z.string().nullable().default(null),
  source_kind: signalSourceKindSchema,
  confidence_level: confidenceLevelSchema,
  decision_relevance: decisionRelevanceSchema,
  provenance_note: z.string().min(1),
  assumptions: z.array(z.string()).default([]),
  missing_dependencies: z.array(z.string()).default([]),
});

export const simulationSeriesSchema = z.object({
  series_id: z.string().min(1),
  title: z.string().min(1),
  series_type: simulationSeriesTypeSchema,
  x_axis: simulationAxisSchema,
  y_axis: simulationAxisSchema,
  points: z.array(simulationSeriesPointSchema).default([]),
  source_kind: signalSourceKindSchema,
  provenance_note: z.string().min(1),
});

export const simulationConfidenceSchema = z.object({
  level: confidenceLevelSchema,
  score: z.number().min(0).max(100),
  drivers: z.array(z.string()).default([]),
});

export const simulationProvenanceSchema = z.object({
  provider: z.string().min(1),
  execution_mode: simulationExecutionModeSchema,
  source_version: z.string().min(1),
  generated_at: z.string().min(1),
  source_refs: z.array(z.string()).default([]),
  note: z.string().optional(),
});

export const simulationSummarySchema = z.object({
  status: simulationEnrichmentStatusSchema,
  model_version: z.string().min(1),
  confidence_level: confidenceLevelSchema,
  derived_observation_count: z.number().int().nonnegative(),
  has_series: z.boolean(),
});

export const simulationEnrichmentSchema = z.object({
  status: simulationEnrichmentStatusSchema,
  model_version: z.string().min(1),
  input_snapshot: flexibleObjectSchema.default({}),
  derived_observations: z.array(derivedObservationSchema).default([]),
  series: z.array(simulationSeriesSchema).default([]),
  assumptions: z.array(z.string()).default([]),
  confidence: simulationConfidenceSchema,
  provenance: simulationProvenanceSchema,
  failure_detail: flexibleObjectSchema.optional(),
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

export const runtimeVersionSchema = z.object({
  contract_version: z.string().min(1),
  ontology_version: z.string().min(1),
  ruleset_version: z.string().min(1),
  prompt_version: z.string().min(1),
  model_version: z.string().min(1),
  workspace_schema_version: z.string().min(1),
});

export const traceabilitySummarySchema = z.object({
  subject_type: z.enum(['workspace', 'case', 'evaluation']),
  subject_id: z.string().min(1),
  case_id: z.string().optional(),
  evaluation_id: z.string().optional(),
  entrypoint: z.enum(['ui', 'api', 'batch', 'test']),
  transformation_stages: z.array(z.string()).default([]),
  rule_refs: z.array(z.string()).default([]),
  evidence_refs: z.array(z.string()).default([]),
  defaults_count: z.number().int().nonnegative(),
  missing_data_count: z.number().int().nonnegative(),
  evidence_count: z.number().int().nonnegative(),
});

export const workspaceMetaSchema = z.object({
  generated_at: z.string().min(1),
  versions: runtimeVersionSchema,
  traceability: traceabilitySummarySchema,
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
  runtime_versions: runtimeVersionSchema,
  traceability: traceabilitySummarySchema,
  idempotency_key: z.string().min(1).optional(),
});

export const evaluationResponseSchema = z.object({
  evaluation_id: z.string().min(1),
  case_id: z.string().min(1),
  normalized_case: normalizedCaseInputSchema,
  decision_output: decisionOutputSchema,
  audit_record: auditRecordSchema,
  narrative: z.string().nullable(),
  narrative_metadata: narrativeMetadataSchema,
  simulation_enrichment: simulationEnrichmentSchema.optional(),
  source_usages: z.array(z.lazy(() => evaluationSourceUsageSchema)).default([]),
  claim_usages: z.array(z.lazy(() => evaluationClaimUsageSchema)).default([]),
  workspace_snapshots: z
    .array(z.lazy(() => workspaceSnapshotRecordSchema))
    .default([]),
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
  simulation_summary: simulationSummarySchema.optional(),
});

export const evaluationListSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  filtered_total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total_pages: z.number().int().positive(),
  returned: z.number().int().nonnegative(),
});

function createEmptyEvaluationLineage() {
  return {
    source_usages: [],
    claim_usages: [],
    workspace_snapshots: [],
  };
}

export const evaluationListResponseSchema = z.object({
  items: z.array(evaluationSummarySchema),
  summary: evaluationListSummarySchema,
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

export const externalEvidenceCatalogListSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  filtered_total: z.number().int().nonnegative().default(0),
  pending: z.number().int().nonnegative(),
  accepted: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().default(25),
  total_pages: z.number().int().positive().default(1),
  returned: z.number().int().nonnegative().default(0),
});

export const workspaceHeroCardSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().min(1),
  tone: workspaceToneSchema,
});

export const workspaceBriefCardSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().min(1),
});

export const workspaceAttentionItemSchema = z.object({
  key: z.string().min(1),
  block: z.string().min(1),
  finding: z.string().min(1),
  severity: z.string().min(1),
  tone: workspaceToneSchema,
});

export const workspaceLeadActionSchema = z.object({
  title: z.string().min(1),
  phase: z.string().min(1),
  score_label: z.string().min(1),
  confidence_label: z.string().min(1),
  effort_label: z.string().min(1),
  benefit_label: z.string().min(1),
  rationale: z.string().min(1),
  blockers: z.array(z.string()).default([]),
  measurement_requests: z.array(z.string()).default([]),
  supplier_candidates: z.array(z.string()).default([]),
});

export const workspaceRoadmapItemSchema = z.object({
  phase: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  action_count: z.number().int().nonnegative(),
});

export const workspaceImpactItemSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  impact: z.string().min(1),
  economic: z.string().min(1),
  readiness: z.string().min(1),
  score_label: z.string().min(1),
});

export const workspaceMetricRecordSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  numeric_value: z.number().nullable(),
  unit: z.string().nullable(),
  source_kind: signalSourceKindSchema,
  note: z.string().min(1),
});

export const dashboardWorkspaceResponseSchema = z.object({
  meta: workspaceMetaSchema,
  summary: z.object({
    total_runs: z.number().int().nonnegative(),
    total_cases: z.number().int().nonnegative(),
    high_confidence_runs: z.number().int().nonnegative(),
    modeled_runs: z.number().int().nonnegative(),
    pending_evidence: z.number().int().nonnegative(),
    accepted_evidence: z.number().int().nonnegative(),
    rejected_evidence: z.number().int().nonnegative(),
  }),
  hero: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    latest_case_id: z.string().nullable(),
    latest_summary: z.string().nullable(),
  }),
  trends: z.object({
    run_growth: z.array(z.number()).default([]),
    confidence: z.array(z.number()).default([]),
    model_coverage: z.array(z.number()).default([]),
  }),
  quick_actions: z.object({
    new_evaluation_href: z.string().min(1),
    evidence_review_href: z.string().min(1),
    latest_evaluation_href: z.string().nullable(),
    latest_case_history_href: z.string().nullable(),
  }),
  recent_runs: z.array(evaluationSummarySchema),
  evidence_backlog: z.array(z.lazy(() => externalEvidenceCatalogSummarySchema)),
});

export const evaluationWorkspaceResponseSchema = z.object({
  meta: workspaceMetaSchema,
  evaluation: evaluationResponseSchema,
  history_summary: z.object({
    total_runs: z.number().int().nonnegative(),
    latest_case_history_href: z.string().min(1),
    default_compare_target_id: z.string().nullable(),
    compare_candidates: z.array(evaluationSummarySchema),
  }),
  overview: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    hero_cards: z.array(workspaceHeroCardSchema),
    brief_cards: z.array(workspaceBriefCardSchema),
    attention_items: z.array(workspaceAttentionItemSchema),
    lead_action: workspaceLeadActionSchema,
    key_metrics: z.array(workspaceMetricRecordSchema),
    roadmap: z.array(workspaceRoadmapItemSchema),
    impact_map: z.array(workspaceImpactItemSchema),
  }),
  links: z.object({
    history_href: z.string().min(1),
    compare_href: z.string().nullable(),
    report_href: z.string().min(1),
    export_json_href: z.string().min(1),
    export_csv_href: z.string().min(1),
  }),
});

export const caseHistoryTimelineItemSchema = z.object({
  evaluation: evaluationSummarySchema,
  delta_summary: z.string().min(1),
  compare_href: z.string().nullable(),
  is_latest: z.boolean(),
});

export const caseHistoryWorkspaceResponseSchema = z.object({
  meta: workspaceMetaSchema,
  case: caseSnapshotSchema,
  timeline: z.array(caseHistoryTimelineItemSchema),
  evidence_records: z.array(evidenceRecordSchema),
  audit_events: z.array(auditEventSchema),
  current_evaluation_id: z.string().nullable(),
  current_evaluation_lineage: z
    .lazy(() => evaluationLineageSchema)
    .default(createEmptyEvaluationLineage()),
});

export const comparisonMetricDeltaSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  current_value: z.string().min(1),
  baseline_value: z.string().min(1),
  delta_label: z.string().min(1),
  direction: z.enum(['improved', 'declined', 'steady', 'unknown']),
  source_kind: signalSourceKindSchema,
});

export const recommendationDeltaSchema = z.object({
  recommendation_id: z.string().min(1),
  current_rank: z.number().int().positive().nullable(),
  baseline_rank: z.number().int().positive().nullable(),
  delta_label: z.string().min(1),
  summary: z.string().min(1),
});

export const supplierShortlistDeltaSchema = z.object({
  category: z.string().min(1),
  current_candidate: z.string().nullable(),
  baseline_candidate: z.string().nullable(),
  detail: z.string().min(1),
});

export const evaluationComparisonResponseSchema = z.object({
  meta: workspaceMetaSchema,
  current_evaluation: evaluationSummarySchema,
  baseline_evaluation: evaluationSummarySchema,
  conclusion: z.object({
    summary: z.string().min(1),
    confidence_change: z.string().min(1),
    defaults_change: z.string().min(1),
    missing_data_change: z.string().min(1),
    model_status_change: z.string().min(1),
  }),
  metric_deltas: z.array(comparisonMetricDeltaSchema),
  recommendation_deltas: z.array(recommendationDeltaSchema),
  supplier_shortlist_delta: z.array(supplierShortlistDeltaSchema),
});

export const evidenceReviewWorkspaceResponseSchema = z.object({
  meta: workspaceMetaSchema,
  filters: z.object({
    active_status: externalEvidenceReviewStatusSchema.optional(),
    search_query: z.string().optional(),
  }),
  summary: externalEvidenceCatalogListSummarySchema,
  spotlight: z.array(z.lazy(() => externalEvidenceCatalogSummarySchema)),
  items: z.array(z.lazy(() => externalEvidenceCatalogSummarySchema)),
});

export const evidenceExplorerFacetBucketSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export const evidenceExplorerFacetsSchema = z.object({
  source_types: z.array(evidenceExplorerFacetBucketSchema),
  evidence_types: z.array(evidenceExplorerFacetBucketSchema),
  review_statuses: z.array(evidenceExplorerFacetBucketSchema),
  publishers: z.array(evidenceExplorerFacetBucketSchema),
});

export const evidenceExplorerWarehouseSnapshotSchema = z.object({
  filtered_item_count: z.number().int().nonnegative(),
  returned_item_count: z.number().int().nonnegative(),
  claim_count: z.number().int().nonnegative(),
  reviewed_claim_count: z.number().int().nonnegative(),
  doi_count: z.number().int().nonnegative(),
  linked_source_count: z.number().int().nonnegative(),
  publisher_count: z.number().int().nonnegative(),
});

export const externalEvidenceCatalogWarehouseAggregateSchema = z.object({
  facets: evidenceExplorerFacetsSchema,
  snapshot: evidenceExplorerWarehouseSnapshotSchema,
});

export const evidenceExplorerWorkspaceResponseSchema = z.object({
  meta: workspaceMetaSchema,
  filters: z.object({
    active_status: externalEvidenceReviewStatusSchema.optional(),
    active_source_type: externalEvidenceSourceTypeSchema.optional(),
    search_query: z.string().optional(),
  }),
  summary: externalEvidenceCatalogListSummarySchema,
  spotlight: z.array(z.lazy(() => externalEvidenceCatalogSummarySchema)),
  items: z.array(z.lazy(() => externalEvidenceCatalogSummarySchema)),
  table_groups: z.object({
    intake_ready: z.array(z.lazy(() => externalEvidenceCatalogSummarySchema)),
    recently_published: z.array(
      z.lazy(() => externalEvidenceCatalogSummarySchema),
    ),
  }),
  warehouse_facets: evidenceExplorerFacetsSchema,
  warehouse_snapshot: evidenceExplorerWarehouseSnapshotSchema,
  export_csv_href: z.string().min(1),
});

export const evidenceExplorerAssistantResponseSchema = z.object({
  meta: workspaceMetaSchema,
  filters: z.object({
    active_status: externalEvidenceReviewStatusSchema.optional(),
    active_source_type: externalEvidenceSourceTypeSchema.optional(),
    search_query: z.string().optional(),
  }),
  warehouse_snapshot: evidenceExplorerWarehouseSnapshotSchema,
  spotlight: z.array(z.lazy(() => externalEvidenceCatalogSummarySchema)),
  assistant: z.object({
    summary: z.string().nullable(),
    narrative_metadata: narrativeMetadataSchema,
    provenance_summary: z.string().min(1),
    uncertainty_summary: z.string().min(1),
    recommended_next_checks: z.array(z.string().min(1)),
    cited_evidence_ids: z.array(z.string().min(1)),
  }),
});

export const printableEvaluationReportResponseSchema = z.object({
  meta: workspaceMetaSchema,
  evaluation: evaluationSummarySchema,
  evaluation_lineage: z
    .lazy(() => evaluationLineageSchema)
    .default(createEmptyEvaluationLineage()),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  sections: z.object({
    stack_diagnosis: currentStackDiagnosisSchema,
    prioritized_improvements: z.array(recommendationRecordSchema),
    impact_map: z.array(impactMapEntrySchema),
    supplier_shortlist: z.array(supplierShortlistEntrySchema),
    phased_roadmap: z.array(phasedRoadmapEntrySchema),
    assumptions_and_defaults_audit: assumptionsAndDefaultsAuditSchema,
    confidence_and_uncertainty_summary: confidenceAndUncertaintySummarySchema,
  }),
});

export const exportCsvResponseMetadataSchema = z.object({
  file_name: z.string().min(1),
  content_type: z.literal('text/csv'),
  generated_at: z.string().min(1),
  column_count: z.number().int().positive(),
  row_count: z.number().int().nonnegative(),
  versions: runtimeVersionSchema,
});

export const externalEvidenceCatalogSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  evidence_type: evidenceTypeSchema,
  strength_level: evidenceStrengthSchema,
  review_status: externalEvidenceReviewStatusSchema,
  source_state: externalEvidenceSourceStateSchema,
  source_type: externalEvidenceSourceTypeSchema,
  source_category: z.string().nullable(),
  source_url: z.string().nullable(),
  doi: z.string().nullable(),
  publisher: z.string().nullable(),
  published_at: z.string().nullable(),
  provenance_note: z.string().min(1),
  claim_count: z.number().int().nonnegative().default(0),
  reviewed_claim_count: z.number().int().nonnegative().default(0),
  applicability_scope: flexibleObjectSchema.default({}),
  extracted_claims: z.array(z.unknown()).default([]),
  tags: z.array(z.string()).default([]),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const sourceDocumentRecordSchema = z.object({
  id: z.string().min(1),
  source_type: externalEvidenceSourceTypeSchema,
  source_category: z.string().nullable(),
  source_url: z.string().nullable(),
  doi: z.string().nullable(),
  publisher: z.string().nullable(),
  journal: z.string().nullable(),
  published_at: z.string().nullable(),
  access_status: externalEvidenceAccessStatusSchema.default('unknown'),
  license: z.string().nullable(),
  pdf_url: z.string().nullable(),
  xml_url: z.string().nullable(),
  authors: z.array(flexibleObjectSchema).default([]),
});

export const evidenceClaimReviewSchema = z.object({
  id: z.string().min(1),
  status: externalEvidenceReviewStatusSchema,
  analyst_id: z.string().nullable(),
  analyst_role: z.string().nullable(),
  analyst_note: z.string().nullable(),
  reviewed_at: z.string().nullable(),
});

export const evidenceOntologyMappingSchema = z.object({
  id: z.string().min(1),
  ontology_path: z.string().min(1),
  mapping_confidence: z.number().min(0).max(1),
  mapped_by: ontologyMappingSourceSchema,
  note: z.string().nullable(),
});

export const evidenceClaimSchema = z.object({
  id: z.string().min(1),
  source_document_id: z.string().min(1),
  catalog_item_id: z.string().nullable(),
  claim_type: evidenceClaimTypeSchema,
  content: z.string().min(1),
  extracted_value: z.string().nullable(),
  unit: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  extraction_method: evidenceExtractionMethodSchema,
  extractor_version: z.string().min(1),
  source_snippet: z.string().min(1),
  source_locator: z.string().nullable(),
  page_number: z.number().int().positive().nullable(),
  metadata: flexibleObjectSchema.default({}),
  reviews: z.array(evidenceClaimReviewSchema).default([]),
  ontology_mappings: z.array(evidenceOntologyMappingSchema).default([]),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const supplierProductSchema = z.object({
  id: z.string().min(1),
  supplier_id: z.string().min(1),
  product_key: z.string().min(1),
  display_name: z.string().min(1),
  category: z.string().nullable(),
  trl: z.number().int().nullable(),
  metadata: flexibleObjectSchema.default({}),
});

export const supplierDocumentSchema = z.object({
  id: z.string().min(1),
  supplier_id: z.string().min(1),
  source_document_id: z.string().min(1),
  product_id: z.string().nullable(),
  document_type: supplierDocumentTypeSchema,
  note: z.string().nullable(),
});

export const evaluationSourceUsageSchema = z.object({
  id: z.string().min(1),
  evaluation_id: z.string().min(1),
  source_document_id: z.string().min(1),
  usage_type: evaluationEvidenceUsageTypeSchema,
  note: z.string().nullable(),
  created_at: z.string().min(1),
});

export const evaluationClaimUsageSchema = z.object({
  id: z.string().min(1),
  evaluation_id: z.string().min(1),
  claim_id: z.string().min(1),
  usage_type: evaluationEvidenceUsageTypeSchema,
  note: z.string().nullable(),
  created_at: z.string().min(1),
});

export const workspaceSnapshotRecordSchema = z.object({
  id: z.string().min(1),
  evaluation_id: z.string().nullable(),
  case_id: z.string().nullable(),
  snapshot_type: workspaceSnapshotTypeSchema,
  payload: z.unknown(),
  created_at: z.string().min(1),
});

export const evaluationLineageSchema = z.object({
  source_usages: z.array(z.lazy(() => evaluationSourceUsageSchema)).default([]),
  claim_usages: z.array(z.lazy(() => evaluationClaimUsageSchema)).default([]),
  workspace_snapshots: z
    .array(z.lazy(() => workspaceSnapshotRecordSchema))
    .default([]),
});

export const externalEvidenceCatalogDetailSchema =
  externalEvidenceCatalogSummarySchema.extend({
    source_document: sourceDocumentRecordSchema.optional(),
    claims: z.array(evidenceClaimSchema).default([]),
    supplier_documents: z.array(supplierDocumentSchema).default([]),
    abstract_text: z.string().nullable(),
    payload: z.unknown(),
    raw_payload: z.unknown(),
  });

export const externalEvidenceCatalogListResponseSchema = z.object({
  items: z.array(externalEvidenceCatalogSummarySchema),
  summary: externalEvidenceCatalogListSummarySchema,
  warehouse_aggregate: externalEvidenceCatalogWarehouseAggregateSchema,
});

export const externalEvidenceReviewRequestSchema = z.object({
  action: externalEvidenceReviewActionSchema,
  note: z.string().trim().min(1).max(500).optional(),
});

export const externalEvidenceBulkReviewRequestSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(100),
  action: externalEvidenceReviewActionSchema,
  note: z.string().trim().min(1).max(500).optional(),
});

export const externalEvidenceBulkReviewFailureSchema = z.object({
  id: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export const externalEvidenceBulkReviewResponseSchema = z.object({
  action: externalEvidenceReviewActionSchema,
  attempted_ids: z.array(z.string().trim().min(1)),
  succeeded_ids: z.array(z.string().trim().min(1)),
  failed: z.array(externalEvidenceBulkReviewFailureSchema),
  note: z.string().trim().min(1).max(500).optional(),
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
export type RuntimeVersion = z.infer<typeof runtimeVersionSchema>;
export type TraceabilitySummary = z.infer<typeof traceabilitySummarySchema>;
export type WorkspaceMeta = z.infer<typeof workspaceMetaSchema>;
export type AuditRecord = z.infer<typeof auditRecordSchema>;
export type EvaluationResponse = z.infer<typeof evaluationResponseSchema>;
export type EvaluationSummary = z.infer<typeof evaluationSummarySchema>;
export type EvaluationListResponse = z.infer<
  typeof evaluationListResponseSchema
>;
export type CaseSnapshot = z.infer<typeof caseSnapshotSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type CaseHistoryResponse = z.infer<typeof caseHistoryResponseSchema>;
export type WorkspaceTone = z.infer<typeof workspaceToneSchema>;
export type WorkspaceHeroCard = z.infer<typeof workspaceHeroCardSchema>;
export type WorkspaceBriefCard = z.infer<typeof workspaceBriefCardSchema>;
export type WorkspaceAttentionItem = z.infer<
  typeof workspaceAttentionItemSchema
>;
export type WorkspaceLeadAction = z.infer<typeof workspaceLeadActionSchema>;
export type WorkspaceRoadmapItem = z.infer<typeof workspaceRoadmapItemSchema>;
export type WorkspaceImpactItem = z.infer<typeof workspaceImpactItemSchema>;
export type WorkspaceMetricRecord = z.infer<typeof workspaceMetricRecordSchema>;
export type DashboardWorkspaceResponse = z.infer<
  typeof dashboardWorkspaceResponseSchema
>;
export type EvaluationWorkspaceResponse = z.infer<
  typeof evaluationWorkspaceResponseSchema
>;
export type CaseHistoryTimelineItem = z.infer<
  typeof caseHistoryTimelineItemSchema
>;
export type CaseHistoryWorkspaceResponse = z.infer<
  typeof caseHistoryWorkspaceResponseSchema
>;
export type ComparisonMetricDelta = z.infer<typeof comparisonMetricDeltaSchema>;
export type RecommendationDelta = z.infer<typeof recommendationDeltaSchema>;
export type SupplierShortlistDelta = z.infer<
  typeof supplierShortlistDeltaSchema
>;
export type EvaluationComparisonResponse = z.infer<
  typeof evaluationComparisonResponseSchema
>;
export type EvidenceReviewWorkspaceResponse = z.infer<
  typeof evidenceReviewWorkspaceResponseSchema
>;
export type EvidenceExplorerFacetBucket = z.infer<
  typeof evidenceExplorerFacetBucketSchema
>;
export type EvidenceExplorerFacets = z.infer<
  typeof evidenceExplorerFacetsSchema
>;
export type EvidenceExplorerWarehouseSnapshot = z.infer<
  typeof evidenceExplorerWarehouseSnapshotSchema
>;
export type EvidenceExplorerAssistantResponse = z.infer<
  typeof evidenceExplorerAssistantResponseSchema
>;
export type EvidenceExplorerWorkspaceResponse = z.infer<
  typeof evidenceExplorerWorkspaceResponseSchema
>;
export type PrintableEvaluationReportResponse = z.infer<
  typeof printableEvaluationReportResponseSchema
>;
export type ExportCsvResponseMetadata = z.infer<
  typeof exportCsvResponseMetadataSchema
>;
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;
export type SignalSourceKind = z.infer<typeof signalSourceKindSchema>;
export type SimulationEnrichmentStatus = z.infer<
  typeof simulationEnrichmentStatusSchema
>;
export type DecisionRelevance = z.infer<typeof decisionRelevanceSchema>;
export type SimulationSeriesType = z.infer<typeof simulationSeriesTypeSchema>;
export type SimulationAxis = z.infer<typeof simulationAxisSchema>;
export type SimulationSeriesPoint = z.infer<typeof simulationSeriesPointSchema>;
export type DerivedObservation = z.infer<typeof derivedObservationSchema>;
export type SimulationSeries = z.infer<typeof simulationSeriesSchema>;
export type SimulationConfidence = z.infer<typeof simulationConfidenceSchema>;
export type SimulationProvenance = z.infer<typeof simulationProvenanceSchema>;
export type SimulationSummary = z.infer<typeof simulationSummarySchema>;
export type SimulationEnrichment = z.infer<typeof simulationEnrichmentSchema>;
export type ExternalEvidenceReviewStatus = z.infer<
  typeof externalEvidenceReviewStatusSchema
>;
export type ExternalEvidenceReviewAction = z.infer<
  typeof externalEvidenceReviewActionSchema
>;
export type ExternalEvidenceSourceType = z.infer<
  typeof externalEvidenceSourceTypeSchema
>;
export type ExternalEvidenceAccessStatus = z.infer<
  typeof externalEvidenceAccessStatusSchema
>;
export type ExternalEvidenceSourceState = z.infer<
  typeof externalEvidenceSourceStateSchema
>;
export type EvidenceClaimType = z.infer<typeof evidenceClaimTypeSchema>;
export type EvidenceExtractionMethod = z.infer<
  typeof evidenceExtractionMethodSchema
>;
export type OntologyMappingSource = z.infer<typeof ontologyMappingSourceSchema>;
export type SupplierDocumentType = z.infer<typeof supplierDocumentTypeSchema>;
export type EvaluationEvidenceUsageType = z.infer<
  typeof evaluationEvidenceUsageTypeSchema
>;
export type WorkspaceSnapshotType = z.infer<typeof workspaceSnapshotTypeSchema>;
export type ExternalEvidenceCatalogItemSummary = z.infer<
  typeof externalEvidenceCatalogSummarySchema
>;
export type ExternalEvidenceCatalogItemDetail = z.infer<
  typeof externalEvidenceCatalogDetailSchema
>;
export type SourceDocumentRecord = z.infer<typeof sourceDocumentRecordSchema>;
export type EvidenceClaimReview = z.infer<typeof evidenceClaimReviewSchema>;
export type EvidenceOntologyMapping = z.infer<
  typeof evidenceOntologyMappingSchema
>;
export type EvidenceClaim = z.infer<typeof evidenceClaimSchema>;
export type SupplierProduct = z.infer<typeof supplierProductSchema>;
export type SupplierDocument = z.infer<typeof supplierDocumentSchema>;
export type EvaluationSourceUsage = z.infer<typeof evaluationSourceUsageSchema>;
export type EvaluationClaimUsage = z.infer<typeof evaluationClaimUsageSchema>;
export type WorkspaceSnapshotRecord = z.infer<
  typeof workspaceSnapshotRecordSchema
>;
export type ExternalEvidenceCatalogListResponse = z.infer<
  typeof externalEvidenceCatalogListResponseSchema
>;
export type ExternalEvidenceCatalogWarehouseAggregate = z.infer<
  typeof externalEvidenceCatalogWarehouseAggregateSchema
>;
export type ExternalEvidenceReviewRequest = z.infer<
  typeof externalEvidenceReviewRequestSchema
>;
export type ExternalEvidenceBulkReviewRequest = z.infer<
  typeof externalEvidenceBulkReviewRequestSchema
>;
export type ExternalEvidenceBulkReviewFailure = z.infer<
  typeof externalEvidenceBulkReviewFailureSchema
>;
export type ExternalEvidenceBulkReviewResponse = z.infer<
  typeof externalEvidenceBulkReviewResponseSchema
>;
