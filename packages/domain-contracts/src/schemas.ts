Warning: truncated output (original token count: 22638)
Total output lines: 2431

import { z } from 'zod';

export const activeTechnologyFamilyValues = [
  'microbial_fuel_cell',
  'microbial_electrolysis_cell',
  'electrochemical_biosensor',
] as const;

export const activeTechnologyFamilySchema = z.enum(
  activeTechnologyFamilyValues,
);

/** Includes historical and normalization sentinel values for stored-case reads. */
export const technologyFamilySchema = z.enum([
  ...activeTechnologyFamilyValues,
  'microbial_electrochemical_technology',
  'unclassified',
]);

export const activePrimaryObjectiveValues = [
  'wastewater_treatment',
  'biosensing',
] as const;

export const primaryObjectiveSchema = z.enum(activePrimaryObjectiveValues);

/** Historical values are accepted only when reading stored cases and normalized before active evaluation. */
export const primaryObjectiveReadSchema = z.enum([
  ...activePrimaryObjectiveValues,
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
  'paper',
  'review',
  'patent',
  'datasheet',
  'manual_sop',
  'technical_report',
  'supplier_document',
  'supplier_profile',
  'case_study',
  'market_report',
  'market_snapshot',
  'regulatory_report',
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

export const narrativeModeSchema = z.enum(['disabled', 'stub', 'ollama']);

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

export const parameterValueSourceSchema = z.enum([
  'client',
  'system_default',
  'unset',
]);

export const parameterConfidenceImpactSchema = z.enum([
  'low',
  'medium',
  'high',
]);

export const evidenceCoverageLevelSchema = z.enum([
  'strong',
  'sufficient',
  'sparse',
  'absent',
]);

export const evidenceRecencyStatusSchema = z.enum([
  'current',
  'aging',
  'stale',
]);

export const evidenceGapSeveritySchema = z.enum([
  'critical',
  'moderate',
  'minor',
]);

export const evidenceReadinessLevelSchema = z.enum([
  'ready',
  'partial',
  'insufficient',
  'no_audit',
]);

export const evidenceOutlierActionSchema = z.enum([
  'flag_for_review',
  'confirmed_outlier',
  'dismissed',
]);

export const evidenceQualityAuditTriggerModeSchema = z.enum([
  'manual',
  'scheduled',
  'pre_evaluation',
  'worker',
]);

export const discoveryTargetStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'skipped',
]);

export const acquisitionAttemptStrategySchema = z.enum([
  'source_artifact',
  'unpaywall',
  'core',
  'semantic_scholar',
  'publisher_oa',
  'direct_pdf',
  'direct_html',
  'direct_xml',
]);

export const acquisitionAttemptStatusSchema = z.enum([
  'queued',
  'running',
  'success',
  'failed',
  'blocked',
  'skipped',
]);

const flexibleObjectSchema = z.object({}).catchall(z.unknown());

export const metadataQualityLevelSchema = z.enum(['low', 'medium', 'high']);

export const metadataQualityProfileSchema = z.object({
  score: z.number().min(0).max(1),
  level: metadataQualityLevelSchema,
  present_fields: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
  categories: flexibleObjectSchema.default({}),
  notes: z.array(z.string()).default([]),
});

export const evidenceVeracityLevelSchema = z.enum(['low', 'medium', 'high']);

export const evidenceVeracityScoreSchema = z.object({
  score: z.number().min(0).max(1),
  level: evidenceVeracityLevelSchema,
  components: z.object({
    source_rigor: z.number().min(0).max(1),
    metadata_completeness: z.number().min(0).max(1),
    measurement_quality: z.number().min(0).max(1),
    extraction_method: z.number().min(0).max(1),
    trace_quality: z.number().min(0).max(1),
    normalization_support: z.number().min(0).max(1),
    review_status: z.number().min(0).max(1),
    relevance: z.number().min(0).max(1),
    recency_context_fit: z.number().min(0).max(1),
    corroboration_conflict: z.number().min(0).max(1),
  }),
  confidence_penalties: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
});

const scalarValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
]);

export const parameterStateSchema = z.object({
  included: z.boolean(),
  value_source: parameterValueSourceSchema,
  value: scalarValueSchema.optional(),
  unit: z.string().min(1).optional(),
  default_rationale: z.string().min(1).optional(),
  confidence_impact: parameterConfidenceImpactSchema.optional(),
  evidence_refs: z.array(z.string()).default([]),
  audit_note: z.string().min(1).optional(),
});

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
  primary_objective: primaryObjectiveReadSchema.optional(),
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

export const scientificModelParameterSchema = z.object({
  value: z.number().finite(),
  unit: z.string().trim().min(1),
  source_kind: z.enum([
    'measured',
    'literature',
    'default',
    'assumption',
    'test_fixture',
  ]),
  source_ref: z.string().trim().min(1),
  original_value: z.number().finite().optional(),
  original_unit: z.string().trim().min(1).optional(),
  normalization_rule_id: z.string().trim().min(1).optional(),
  uncertainty: z.number().nonnegative().optional(),
  uncertainty_unit: z.string().trim().min(1).optional(),
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
  water_quality: z
    .object({
      bod5_mg_o2_l: scientificModelParameterSchema.optional(),
      cod_mg_cod_l: scientificModelParameterSchema.optional(),
      tss_mg_l: scientificModelParameterSchema.optional(),
      alkalinity_mol_m3: scientificModelParameterSchema.optional(),
      total_nitrogen_mg_n_l: scientificModelParameterSchema.optional(),
      ammonium_mg_n_l: scientificModelParameterSchema.optional(),
      nitrate_mg_n_l: scientificModelParameterSchema.optional(),
      total_phosphorus_mg_p_l: scientificModelParameterSchema.optional(),
      sulfate_mg_s_l: scientificModelParameterSchema.optional(),
      chloride_mg_l: scientificModelParameterSchema.optional(),
      salinity_kg_m3: scientificModelParameterSchema.optional(),
      turbidity_ntu: scientificModelParameterSchema.optional(),
      volatile_fatty_acids_mol_m3: scientificModelParameterSchema.optional(),
      dissolved_oxygen_mg_l: scientificModelParameterSchema.optional(),
      temperature_c: scientificModelParameterSchema.optional(),
      ph: scientificModelParameterSchema.optional(),
      conductivity_ms_per_cm: scientificModelParameterSchema.optional(),
      sample_method: z.string().optional(),
      sampling_point: z.string().optional(),
      filtered_or_total: z
        .enum(['filtered', 'total', 'not_applicable'])
        .optional(),
    })
    .optional(),
});

const modelParameter = scientificModelParameterSchema;

/**
 * Isothermal 0D coupled reactor input for an MFC or MEC.
 * Quantities use SI units and carry their evidence reference at the point of use.
 */
export const mechanisticModelInputSchema = z.object({
  model_version: z.literal('coupled-0d-dae-v1').default('coupled-0d-dae-v1'),
  system_type: z.enum(['MFC', 'MEC']),
  geometry: z.object({
    anode_chamber_volume_m3: modelParameter,
    cathode_chamber_volume_m3: modelParameter,
    anode_area_m2: modelParameter,
    cathode_area_m2: modelParameter,
    electrode_gap_m: modelParameter,
    membrane_present: z.boolean(),
    membrane_area_m2: modelParameter.optional(),
    membrane_thickness_m: modelParameter.optional(),
    membrane_conductivity_s_m: modelParameter.optional(),
  }),
  materials: z.object({
    anode_material_family: z.string().trim().min(1),
    anode_material_source_ref: z.string().trim().min(1),
    cathode_material_family: z.string().trim().min(1),
    cathode_material_source_ref: z.string().trim().min(1),
    separator_material_family: z.string().trim().min(1).optional(),
    separator_material_source_ref: z.string().trim().min(1).optional(),
    anode_electroactive_area_factor: modelParameter,
    cathode_electroactive_area_factor: modelParameter,
    biofilm_electroactive_fraction: modelParameter,
  }),
  operation: z.object({
    flow_m3_s: modelParameter,
    influent_cod_kg_m3: modelParameter,
    temperature_k: modelParameter,
    influent_ph: modelParameter,
    initial_ph_anode: modelParameter,
    initial_ph_cathode: modelParameter,
    initial_cod_kg_m3: modelParameter,
    initial_biomass_kg_m3: modelParameter,
    biomass_washout_rate_s_inv: modelParameter,
    initial_dissolved_oxygen_kg_m3: modelParameter.optional(),
    oxygen_saturation_kg_m3: modelParameter.optional(),
    electrolyte_conductivity_s_m: modelParameter,
    auxiliary_power_w: modelParameter,
    duration_s: modelParameter,
    time_step_s: modelParameter,
  }),
  biology: z.object({
    max_specific_cod_uptake_kg_cod_kg_biomass_s: modelParameter,
    half_saturation_cod_kg_m3: modelParameter,
    biomass_yield_kg_biomass_kg_cod: modelParameter,
    decay_rate_s_inv: modelParameter,
    coulombic_efficiency: modelParameter,
    ph_optimum: modelParameter,
    ph_tolerance: modelParameter,
    activation_energy_j_mol: modelParameter,
    reference_temperature_k: modelParameter,
    buffer_capacity_anode_mol_m3_ph: modelParameter,
    buffer_capacity_cathode_mol_m3_ph: modelParameter,
    proton_transfer_coefficient_mol_s_ph: modelParameter,
  }),
  electrochemistry: z.object({
    cathode_reaction: z.enum(['oxygen_reduction', 'hydrogen_evolution']),
    reversible_cell_voltage_v: modelParameter,
    anode_exchange_current_density_a_m2: modelParameter,
    cathode_exchange_current_density_a_m2: modelParameter,
    anode_charge_transfer_coefficient: modelParameter,
    cathode_charge_transfer_coefficient: modelParameter,
    oxygen_mass_transfer_coefficient_m_s: modelParameter.optional(),
    contact_resistance_ohm: modelParameter,
    external_load_ohm: modelParameter.optional(),
    applied_voltage_v: modelParameter.optional(),
    hydrogen_faraday_efficiency: modelParameter.optional(),
    hydrogen_capture_fraction: modelParameter.optional(),
  }),
});

/** Draft input shape supports incremental entry; the solver validates the full shape before execution. */
export const mechanisticModelDraftInputSchema = z.object({
  model_version: z.literal('coupled-0d-dae-v1').default('coupled-0d-dae-v1'),
  system_type: z.enum(['MFC', 'MEC']),
  geometry: mechanisticModelInputSchema.shape.geometry.partial().optional(),
  materials: mechanisticModelInputSchema.shape.materials.partial().optional(),
  operation: mechanisticModelInputSchema.shape.operation.partial().optional(),
  biology: mechanisticModelInputSchema.shape.biology.partial().optional(),
  electrochemistry: mechanisticModelInputSchema.shape.electrochemistry
    .partial()
    .optional(),
});

export const biosensorConfigurationSchema = z.object({
  deployment_mode: z.enum(['standalone', 'mfc_integrated', 'mec_integrated']),
  power_source: z.enum(['external', 'mfc_harvested', 'mec_power_bus']),
  analyte_id: z.string().trim().min(1),
  measurand: z.string().trim().min(1),
  concentration_unit: z.string().trim().min(1),
  matrix: z.string().trim().min(1),
  recognition_element: z.string().trim().min(1),
  working_electrode_material: z.string().trim().min(1),
  reference_electrode_material: z.string().trim().min(1),
  counter_electrode_material: z.string().trim().min(1),
  electrode_material_source_ref: z.string().trim().min(1),
  electrode_immobilization_method: z.string().trim().min(1),
  electrode_coating_or_membrane: z.string().trim().min(1),
  electron_transfer_mediator: z.string().trim().min(1).optional(),
  working_electrode_area_m2: modelParameter,
  biorecognition_loading_mg_cm2: modelParameter.optional(),
  ionic_strength_mol_m3: modelParameter,
  transduction_mode: z.enum(['amperometric', 'potentiometric', 'impedimetric']),
  concentration: modelParameter,
  temperature_k: modelParameter,
  ph: modelParameter,
  calibration: z.object({
    model: z.enum(['linear', 'langmuir', 'michaelis_menten']),
    sensitivity_a_per_unit: modelParameter.optional(),
    intercept_a: modelParameter.optional(),
    maximum_current_a: modelParameter.optional(),
    half_saturation_concentration: modelParameter.optional(),
    calibration_date: z.string().trim().min(1),
    reference_method: z.string().trim().min(1),
    range_min: modelParameter,
    range_max: modelParameter,
  }),
  analytical_performance: z.object({
    lod: modelParameter,
    loq: modelParameter,
    response_time_s: modelParameter,
    recovery_time_s: modelParameter,
    noise_std_a: modelParameter,
    drift_a_per_day: modelParameter,
    repeatability_cv_pct: modelParameter,
    accuracy_pct: modelParameter,
    selectivity_pct: modelParameter,
    interferences: z.array(z.string().trim().min(1)).default([]),
    calibration_r2: modelParameter,
    replicate_count: modelParameter,
  }),
  power_consumption_w: modelParameter,
  power_available_w: modelParameter,
});

export const biosensorConfigurationDraftSchema = biosensorConfigurationSchema
  .extend({
    calibration: biosensorConfigurationSchema.shape.calibration
      .partial()
      .optional(),
    analytical_performance:
      biosensorConfigurationSchema.shape.analytical_performance
        .partial()
        .optional(),
  })
  .partial();

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
  dosing_capability: z.string().default(…12638 tokens truncated…int().nonnegative().optional(),
  abstract_available: z.boolean().optional(),
  full_text_available: z.boolean().optional(),
  source_category: z.string().nullable(),
  source_url: z.string().nullable(),
  doi: z.string().nullable(),
  publisher: z.string().nullable(),
  published_at: z.string().nullable(),
  provenance_note: z.string().min(1),
  claim_count: z.number().int().nonnegative().default(0),
  reviewed_claim_count: z.number().int().nonnegative().default(0),
  accepted_by: z.string().nullable().default(null),
  acceptance_policy: z.string().nullable().default(null),
  accepted_at: z.string().nullable().default(null),
  review_required: z.boolean().default(true),
  ingestion_mode: z.string().min(1).default('manual'),
  ingestion_batch_id: z.string().nullable().default(null),
  extraction_status: z.string().min(1).default('pending'),
  normalization_status: z.string().min(1).default('pending'),
  evidence_quality: z.string().nullable().default(null),
  applicability_scope: flexibleObjectSchema.default({}),
  extracted_claims: z.array(z.unknown()).default([]),
  tags: z.array(z.string()).default([]),
  metadata_quality: metadataQualityProfileSchema.optional(),
  veracity_score: evidenceVeracityScoreSchema.optional(),
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

export const sourceTextChunkSchema = z.object({
  chunk_id: z.string().min(1),
  artifact_id: z.string().min(1),
  source_document_id: z.string().min(1),
  chunk_index: z.number().int().nonnegative(),
  page_number: z.number().int().positive().nullable().default(null),
  text: z.string().min(1),
  source_locator: z.string().min(1),
  section_label: z.string().min(1).nullable().default(null),
  table_label: z.string().min(1).nullable().default(null),
  cell_locator: z.string().min(1).nullable().default(null),
  caption: z.string().min(1).nullable().default(null),
  char_start: z.number().int().nonnegative().nullable().default(null),
  char_end: z.number().int().nonnegative().nullable().default(null),
  metadata: flexibleObjectSchema.default({}),
  created_at: z.string().min(1).optional(),
});

export const sourceArtifactSchema = z.object({
  artifact_id: z.string().min(1),
  source_document_id: z.string().min(1),
  local_path: z.string().nullable().default(null),
  file_name: z.string().min(1),
  file_hash: z.string().min(1),
  mime_type: z.string().min(1),
  file_size_bytes: z.number().int().nonnegative().nullable().default(null),
  page_count: z.number().int().positive().nullable().default(null),
  extraction_method: z.string().min(1),
  ingestion_status: z.enum(['parsed', 'failed']),
  title: z.string().nullable().default(null),
  doi: z.string().nullable().default(null),
  license: z.string().nullable().default(null),
  access_status: externalEvidenceAccessStatusSchema.default('unknown'),
  metadata_quality: metadataQualityProfileSchema,
  veracity_score: evidenceVeracityScoreSchema,
  failure_message: z.string().nullable().default(null),
  imported_at: z.string().min(1),
  chunks: z.array(sourceTextChunkSchema).default([]),
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
  section_label: z.string().min(1).nullable().default(null),
  table_label: z.string().min(1).nullable().default(null),
  cell_locator: z.string().min(1).nullable().default(null),
  caption: z.string().min(1).nullable().default(null),
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
  runtime_versions: runtimeVersionSchema.optional(),
  created_at: z.string().min(1),
});

export const evaluationClaimUsageSchema = z.object({
  id: z.string().min(1),
  evaluation_id: z.string().min(1),
  claim_id: z.string().min(1),
  usage_type: evaluationEvidenceUsageTypeSchema,
  note: z.string().nullable(),
  runtime_versions: runtimeVersionSchema.optional(),
  created_at: z.string().min(1),
});

export const workspaceSnapshotRecordSchema = z.object({
  id: z.string().min(1),
  evaluation_id: z.string().nullable(),
  case_id: z.string().nullable(),
  snapshot_type: workspaceSnapshotTypeSchema,
  payload: z.unknown(),
  runtime_versions: runtimeVersionSchema.optional(),
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
    scientific_facts: z.array(externalEvidenceScientificFactSchema).optional(),
    benchmark_records: z
      .array(externalEvidenceBenchmarkRecordSchema)
      .optional(),
    source_text_status: externalEvidenceSourceTextStatusSchema.optional(),
    supplier_documents: z.array(supplierDocumentSchema).default([]),
    source_artifacts: z.array(sourceArtifactSchema).default([]),
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
export type PrimaryObjective = z.infer<typeof primaryObjectiveSchema>;
export type SupplierContext = z.infer<typeof supplierContextSchema>;
export type RawEvidenceRecord = z.infer<typeof rawEvidenceRecordSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type ScientificModelParameter = z.infer<
  typeof scientificModelParameterSchema
>;
export type MechanisticModelInput = z.infer<typeof mechanisticModelInputSchema>;
export type MechanisticModelDraftInput = z.infer<
  typeof mechanisticModelDraftInputSchema
>;
export type BiosensorConfiguration = z.infer<
  typeof biosensorConfigurationSchema
>;
export type BiosensorConfigurationDraft = z.infer<
  typeof biosensorConfigurationDraftSchema
>;
export type NormalizedCaseInput = z.infer<typeof normalizedCaseInputSchema>;
export type RecommendationRecord = z.infer<typeof recommendationRecordSchema>;
export type DecisionOutput = z.infer<typeof decisionOutputSchema>;
export type EvidenceDecisionContext = z.infer<
  typeof evidenceDecisionContextSchema
>;
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
export type WorkspaceCopy = z.infer<typeof workspaceCopySchema>;
export type WorkspaceTab = z.infer<typeof workspaceTabSchema>;
export type WorkspaceBadge = z.infer<typeof workspaceBadgeSchema>;
export type WorkspacePrimaryAction = z.infer<
  typeof workspacePrimaryActionSchema
>;
export type WorkspacePropertyRow = z.infer<typeof workspacePropertyRowSchema>;
export type WorkspacePropertyGroup = z.infer<
  typeof workspacePropertyGroupSchema
>;
export type WorkspacePresentation = z.infer<typeof workspacePresentationSchema>;
export type WorkspaceHeroCard = z.infer<typeof workspaceHeroCardSchema>;
export type WorkspaceBriefCard = z.infer<typeof workspaceBriefCardSchema>;
export type WorkspaceAttentionItem = z.infer<
  typeof workspaceAttentionItemSchema
>;
export type WorkspaceLeadAction = z.infer<typeof workspaceLeadActionSchema>;
export type WorkspaceRoadmapItem = z.infer<typeof workspaceRoadmapItemSchema>;
export type WorkspaceImpactItem = z.infer<typeof workspaceImpactItemSchema>;
export type WorkspaceMetricRecord = z.infer<typeof workspaceMetricRecordSchema>;
export type ParameterStateAudit = z.infer<typeof parameterStateAuditSchema>;
export type EvidenceCoverageLevel = z.infer<typeof evidenceCoverageLevelSchema>;
export type EvidenceRecencyStatus = z.infer<typeof evidenceRecencyStatusSchema>;
export type EvidenceGapSeverity = z.infer<typeof evidenceGapSeveritySchema>;
export type EvidenceReadinessLevel = z.infer<
  typeof evidenceReadinessLevelSchema
>;
export type CoverageEntry = z.infer<typeof coverageEntrySchema>;
export type EvidenceGap = z.infer<typeof evidenceGapSchema>;
export type EvidenceOutlier = z.infer<typeof evidenceOutlierSchema>;
export type ReadinessScore = z.infer<typeof readinessScoreSchema>;
export type FunnelStageCount = z.infer<typeof funnelStageCountSchema>;
export type EvidenceFunnelGroup = z.infer<typeof evidenceFunnelGroupSchema>;
export type EvidenceQualityReport = z.infer<typeof evidenceQualityReportSchema>;
export type DiscoveryTarget = z.infer<typeof discoveryTargetSchema>;
export type AcquisitionAttempt = z.infer<typeof acquisitionAttemptSchema>;
export type EvidenceIntelligenceSummary = z.infer<
  typeof evidenceIntelligenceSummarySchema
>;
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
export type ReportConversationTurn = z.infer<
  typeof reportConversationTurnSchema
>;
export type ReportConversationCitation = z.infer<
  typeof reportConversationCitationSchema
>;
export type ReportConversationGrounding = z.infer<
  typeof reportConversationGroundingSchema
>;
export type ReportConversationMetadata = z.infer<
  typeof reportConversationMetadataSchema
>;
export type ReportConversationRequest = z.infer<
  typeof reportConversationRequestSchema
>;
export type ReportConversationResponse = z.infer<
  typeof reportConversationResponseSchema
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
export type MetadataQualityLevel = z.infer<typeof metadataQualityLevelSchema>;
export type MetadataQualityProfile = z.infer<
  typeof metadataQualityProfileSchema
>;
export type EvidenceVeracityLevel = z.infer<typeof evidenceVeracityLevelSchema>;
export type EvidenceVeracityScore = z.infer<typeof evidenceVeracityScoreSchema>;
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
export type SourceTextChunk = z.infer<typeof sourceTextChunkSchema>;
export type SourceArtifact = z.infer<typeof sourceArtifactSchema>;
export type ExternalEvidenceScientificFact = z.infer<
  typeof externalEvidenceScientificFactSchema
>;
export type ExternalEvidenceBenchmarkRecord = z.infer<
  typeof externalEvidenceBenchmarkRecordSchema
>;
export type ExternalEvidenceSourceTextStatus = z.infer<
  typeof externalEvidenceSourceTextStatusSchema
>;
export type AcceptedEvidenceReadinessAction = z.infer<
  typeof acceptedEvidenceReadinessActionSchema
>;
export type AcceptedEvidenceReadinessCandidate = z.infer<
  typeof acceptedEvidenceReadinessCandidateSchema
>;
export type AcceptedEvidenceReadinessRecord = z.infer<
  typeof acceptedEvidenceReadinessRecordSchema
>;
export type AcceptedEvidenceReadinessSummary = z.infer<
  typeof acceptedEvidenceReadinessSummarySchema
>;
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
