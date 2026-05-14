import { z } from 'zod';

import {
  acquisitionAttemptSchema,
  confidenceLevelSchema,
  discoveryTargetSchema,
  evidenceQualityAuditTriggerModeSchema,
  evidenceQualityReportSchema,
  evidenceStrengthSchema,
  evidenceTypeSchema,
  externalEvidenceAccessStatusSchema,
  externalEvidenceSourceTypeSchema,
  rawEvidenceRecordSchema,
  runtimeVersionSchema,
  sourceArtifactSchema,
} from './schemas';

const flexibleObjectSchema = z.object({}).catchall(z.unknown());
const nullableStringSchema = z.string().min(1).nullable();

export const researchReviewStatusSchema = z.enum(['active', 'archived']);

export const researchSearchProviderSchema = z.enum([
  'openalex',
  'crossref',
  'europe_pmc',
]);

export const researchColumnTypeSchema = z.enum([
  'metadata',
  'deterministic',
  'llm_extracted',
  'computed',
]);

export const researchExtractionJobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);

export const researchBackfillStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);

export const researchExtractionResultStatusSchema = z.enum([
  'valid',
  'invalid',
]);

export const researchEvidencePackStatusSchema = z.enum(['draft', 'reviewed']);

export const researchTechnologyClassSchema = z.enum([
  'MFC',
  'MEC',
  'MET',
  'MDC',
  'BES',
  'bioelectrochemical_sensor',
  'hybrid_system',
  'not_reported',
]);

export const researchDocumentTypeSchema = z.enum([
  'paper',
  'review',
  'patent',
  'datasheet',
  'manual_sop',
  'technical_report',
  'supplier_document',
  'case_study',
  'market_report',
  'regulatory_report',
  'curated_manifest',
  'manual',
]);

export const researchEligibilityStatusSchema = z.enum(['eligible', 'excluded']);

export const researchEligibilityReasonSchema = z.enum([
  'full_access_traceable',
  'access_closed',
  'access_unknown',
  'missing_license_or_access_policy',
  'missing_full_text_link',
  'out_of_scope_technology',
  'supplier_or_market_context_only',
  'insufficient_source_metadata',
]);

export const researchComponentTypeSchema = z.enum([
  'reactor',
  'anode',
  'cathode',
  'membrane_separator',
  'catalyst',
  'current_collector',
  'biofilm',
  'inoculum_microbial_community',
  'substrate_feedstock',
  'electrolyte',
  'external_circuit',
  'sensors_instrumentation',
  'balance_of_plant',
]);

export const researchParameterKindSchema = z.enum([
  'material',
  'geometry',
  'surface_property',
  'loading',
  'operating_condition',
  'electrochemical_metric',
  'treatment_metric',
  'product_metric',
  'biology',
  'cost_maturity',
  'limitation',
]);

export const researchEvidenceTraceSchema = z.object({
  source: z.enum([
    'title',
    'abstract',
    'claim',
    'metadata',
    'payload',
    'full_text',
  ]),
  text_span: z.string().min(1),
  source_document_id: z.string().min(1).optional(),
  claim_id: z.string().min(1).optional(),
  source_locator: z.string().min(1).nullable().default(null),
  page_number: z.number().int().positive().nullable().default(null),
  section_label: z.string().min(1).nullable().default(null),
  table_label: z.string().min(1).nullable().default(null),
  cell_locator: z.string().min(1).nullable().default(null),
  caption: z.string().min(1).nullable().default(null),
});

export const researchExtractedParameterSchema = z.object({
  parameter_key: z.string().min(1),
  component_type: researchComponentTypeSchema,
  parameter_kind: researchParameterKindSchema,
  label: z.string().min(1),
  original_value: z.union([z.number(), z.string()]).nullable().default(null),
  original_unit: z.string().min(1).nullable().default(null),
  normalized_value: z.number().nullable().default(null),
  normalized_unit: z.string().min(1).nullable().default(null),
  normalization_rule_id: z.string().min(1).nullable().default(null),
  text_value: z.string().min(1).nullable().default(null),
  evidence_trace: researchEvidenceTraceSchema,
  confidence: confidenceLevelSchema,
});

export const researchComponentProfileSchema = z.object({
  component_type: researchComponentTypeSchema,
  label: z.string().min(1),
  material: z.string().min(1).nullable().default(null),
  role: z.string().min(1).nullable().default(null),
  properties: z.array(researchExtractedParameterSchema).default([]),
  missing_fields: z.array(z.string()).default([]),
  evidence_trace: z.array(researchEvidenceTraceSchema).default([]),
  confidence: confidenceLevelSchema,
});

export const researchExtractionQualityGateSchema = z.object({
  gate_id: z.string().min(1),
  passed: z.boolean(),
  reasons: z.array(researchEligibilityReasonSchema).default([]),
  trace_count: z.number().int().nonnegative(),
  table_count: z.number().int().nonnegative().default(0),
  figure_count: z.number().int().nonnegative().default(0),
  missing_fields: z.array(z.string()).default([]),
});
export const researchMetricMeasurementSchema = z.object({
  metric_key: z.string().min(1),
  original_value: z.number(),
  original_unit: z.string().min(1),
  normalized_value: z.number().nullable(),
  normalized_unit: z.string().min(1).nullable(),
  normalization_rule_id: z.string().min(1).nullable(),
  evidence_trace: researchEvidenceTraceSchema,
});

export const researchPaperMetadataSchema = z.object({
  paper_id: z.string().min(1),
  source_document_id: z.string().min(1),
  document_type: researchDocumentTypeSchema.default('paper'),
  title: z.string().min(1),
  authors: z.array(flexibleObjectSchema).default([]),
  year: z.number().int().nullable(),
  doi: nullableStringSchema,
  journal: nullableStringSchema,
  publisher: nullableStringSchema,
  source_type: externalEvidenceSourceTypeSchema,
  source_url: nullableStringSchema,
  pdf_url: nullableStringSchema,
  xml_url: nullableStringSchema.default(null),
  abstract_text: z.string().nullable(),
  citation_count: z.number().int().nonnegative().nullable(),
  access_status: externalEvidenceAccessStatusSchema.default('unknown'),
  source_license: z.string().min(1).nullable().default(null),
  metadata: flexibleObjectSchema.default({}),
});

export const researchDocumentMetadataSchema = researchPaperMetadataSchema;

export const localSourceImportRequestSchema = z
  .object({
    files: z.array(z.string().trim().min(1)).max(20).default([]),
    manifest_path: z.string().trim().min(1).optional(),
    access_status: externalEvidenceAccessStatusSchema.default('unknown'),
    license: z.string().trim().min(1).optional(),
    review_status: z.enum(['pending', 'accepted']).default('pending'),
  })
  .refine((value) => value.files.length > 0 || value.manifest_path, {
    message: 'files or manifest_path is required',
    path: ['files'],
  });

export const localSourceImportResponseSchema = z.object({
  imported_count: z.number().int().nonnegative(),
  source_document_ids: z.array(z.string().min(1)).default([]),
  papers: z.array(researchPaperMetadataSchema).default([]),
  artifacts: z.array(sourceArtifactSchema).default([]),
  failed: z
    .array(
      z.object({
        path: z.string().min(1),
        message: z.string().min(1),
      }),
    )
    .default([]),
});

export const researchPaperSearchResultSchema = z.object({
  source_type: researchSearchProviderSchema,
  source_key: z.string().min(1),
  document_type: researchDocumentTypeSchema.default('paper'),
  title: z.string().min(1),
  authors: z.array(flexibleObjectSchema).default([]),
  year: z.number().int().nullable(),
  doi: nullableStringSchema,
  journal: nullableStringSchema,
  publisher: nullableStringSchema,
  source_url: nullableStringSchema,
  pdf_url: nullableStringSchema,
  xml_url: nullableStringSchema,
  abstract_text: z.string().nullable(),
  citation_count: z.number().int().nonnegative().nullable(),
  access_status: externalEvidenceAccessStatusSchema.default('unknown'),
  source_license: z.string().min(1).nullable().default(null),
  metadata: flexibleObjectSchema.default({}),
});

export const researchPaperSearchFailureSchema = z.object({
  provider: researchSearchProviderSchema,
  message: z.string().min(1),
});

export const researchColumnDefinitionSchema = z
  .object({
    column_id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9_/-]*$/),
    name: z.string().min(1),
    group: z.string().min(1),
    type: researchColumnTypeSchema,
    answer_structure: z.string().min(1),
    instructions: z.string().min(1),
    output_schema_key: z.string().min(1),
    output_schema: flexibleObjectSchema.default({}),
    visible: z.boolean().default(true),
    position: z.number().int().nonnegative().default(0),
  })
  .strict();

export const researchSystemPerformanceExtractionSchema = z.object({
  technology_class: z.array(researchTechnologyClassSchema).default([]),
  reactor_architecture: z
    .object({
      type: z.string().nullable().default(null),
      useful_volume_ml: z.number().nullable().default(null),
      electrode_area_cm2: z.number().nullable().default(null),
      electrode_spacing_cm: z.number().nullable().default(null),
      geometry: z.string().nullable().default(null),
    })
    .default({}),
  anode: z
    .object({
      material: z.string().nullable().default(null),
      material_class: z.string().nullable().default(null),
      surface_area_m2_g: z.number().nullable().default(null),
      modification: z.string().nullable().default(null),
      properties: z.array(z.string()).default([]),
    })
    .default({}),
  cathode: z
    .object({
      material: z.string().nullable().default(null),
      catalyst: z.string().nullable().default(null),
      loading_mg_cm2: z.number().nullable().default(null),
      properties: z.array(z.string()).default([]),
    })
    .default({}),
  membrane_or_separator: z
    .object({
      type: z.string().nullable().default(null),
      properties: z.array(z.string()).default([]),
    })
    .default({}),
  substrate_feedstock: z.array(z.string()).default([]),
  operating_conditions: flexibleObjectSchema.default({}),
  electrochemical_metrics: z.array(researchMetricMeasurementSchema).default([]),
  treatment_metrics: z.array(researchMetricMeasurementSchema).default([]),
  product_outputs: z.array(researchMetricMeasurementSchema).default([]),
  component_parameters: z.array(researchExtractedParameterSchema).default([]),
  component_profiles: z.array(researchComponentProfileSchema).default([]),
  quality_gate: researchExtractionQualityGateSchema.optional(),
  scale: z.string().nullable().default(null),
  implementation_limitations: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
  evidence_trace: z.array(researchEvidenceTraceSchema).default([]),
  confidence: confidenceLevelSchema,
});

export const researchImplementationFactorsExtractionSchema = z.object({
  performance_limitations: z.array(z.string()).default([]),
  internal_resistance_issues: z.array(z.string()).default([]),
  electrode_limitations: z.array(z.string()).default([]),
  cathode_limitations: z.array(z.string()).default([]),
  membrane_limitations: z.array(z.string()).default([]),
  biofilm_limitations: z.array(z.string()).default([]),
  substrate_limitations: z.array(z.string()).default([]),
  fouling_and_scaling: z.array(z.string()).default([]),
  operational_risks: z.array(z.string()).default([]),
  scale_up_barriers: z.array(z.string()).default([]),
  economic_barriers: z.array(z.string()).default([]),
  durability_issues: z.array(z.string()).default([]),
  reproducibility_issues: z.array(z.string()).default([]),
  data_gaps: z.array(z.string()).default([]),
  maturity_signals: z.array(z.string()).default([]),
  implementation_dependencies: z.array(z.string()).default([]),
  supplier_relevance: z.array(z.string()).default([]),
  environmental_safety_factors: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
  evidence_trace: z.array(researchEvidenceTraceSchema).default([]),
  confidence: confidenceLevelSchema,
});

export const researchDataMetadataReadinessExtractionSchema = z.object({
  summary: z.string().nullable().default(null),
  metadata_categories: z
    .object({
      signal_generation: z.array(z.string()).default([]),
      signal_quality: z.array(z.string()).default([]),
      contextual_annotations: z.array(z.string()).default([]),
      data_lineage: z.array(z.string()).default([]),
      access_and_licensing: z.array(z.string()).default([]),
      review_state: z.array(z.string()).default([]),
    })
    .default({}),
  training_and_extraction_applicability: z.array(z.string()).default([]),
  decision_use_readiness: z.enum([
    'ready_with_review',
    'context_only',
    'insufficient',
  ]),
  blocking_gaps: z.array(z.string()).default([]),
  recommended_uses: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
  evidence_trace: z.array(researchEvidenceTraceSchema).default([]),
  confidence: confidenceLevelSchema,
});

function hasSubstantiveAnswer(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 && value !== 'not_reported';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasSubstantiveAnswer(entry));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(
        ([key]) =>
          ![
            'confidence',
            'evidence_trace',
            'missing_fields',
            'validation_errors',
          ].includes(key),
      )
      .some(([, entry]) => hasSubstantiveAnswer(entry));
  }

  return false;
}

// Spec 037 / Phase 4: research-cell provenance v1.
// Cell-status + missingReason enums and a normalized cell record.
export const researchCellStatusSchema = z.enum([
  'filled_with_trace',
  'filled_without_enough_trace',
  'not_reported_by_paper',
  'full_text_missing',
  'document_parse_failed',
  'table_detected_but_no_match',
  'extraction_failed',
  'queued',
  'needs_analyst_review',
]);

export const researchCellMissingReasonSchema = z.enum([
  'not_reported_by_paper',
  'full_text_missing',
  'document_parse_failed',
  'table_detected_but_no_match',
  'extraction_failed',
  'queued',
  'needs_analyst_review',
]);

export const researchCellSchema = z
  .object({
    paper_id: z.string().min(1),
    review_id: z.string().min(1),
    column_id: z.string().min(1),
    output_schema_key: z.string().min(1),
    value_display: z.string().nullable().default(null),
    normalized_value: z.union([z.number(), z.string(), z.null()]).default(null),
    unit: z.string().nullable().default(null),
    status: researchCellStatusSchema,
    missing_reason: researchCellMissingReasonSchema.nullable().default(null),
    confidence: z.number().min(0).max(1),
    evidence_trace: z.array(researchEvidenceTraceSchema).default([]),
    extractor_version: z.string().min(1),
    created_at: z.string().min(1).optional(),
    updated_at: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.status === 'filled_with_trace' &&
      value.evidence_trace.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'filled_with_trace cells require at least one evidence_trace entry',
        path: ['evidence_trace'],
      });
    }
    if (!value.status.startsWith('filled_') && value.missing_reason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'non-filled cells require a missing_reason',
        path: ['missing_reason'],
      });
    }
  });

export const researchExtractionResultSchema = z
  .object({
    result_id: z.string().min(1).optional(),
    review_id: z.string().min(1),
    paper_id: z.string().min(1),
    column_id: z.string().min(1),
    status: researchExtractionResultStatusSchema,
    answer: z.unknown(),
    evidence_trace: z.array(researchEvidenceTraceSchema).default([]),
    confidence: confidenceLevelSchema,
    missing_fields: z.array(z.string()).default([]),
    validation_errors: z.array(z.string()).default([]),
    normalized_payload: flexibleObjectSchema.default({}),
    extractor_version: z.string().min(1),
    created_at: z.string().min(1).optional(),
    updated_at: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.status === 'valid' &&
      hasSubstantiveAnswer(value.answer) &&
      value.evidence_trace.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'valid extraction results with substantive answers require evidence_trace',
        path: ['evidence_trace'],
      });
    }
  });

export const researchExtractionJobSchema = z.object({
  job_id: z.string().min(1),
  review_id: z.string().min(1),
  paper_id: z.string().min(1),
  column_id: z.string().min(1),
  status: researchExtractionJobStatusSchema,
  extractor_version: z.string().min(1),
  failure_detail: flexibleObjectSchema.nullable().default(null),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const researchEvidencePackSchema = z.object({
  pack_id: z.string().min(1),
  review_id: z.string().min(1),
  title: z.string().min(1),
  status: researchEvidencePackStatusSchema,
  source_result_ids: z.array(z.string().min(1)).default([]),
  evidence_items: z.array(rawEvidenceRecordSchema).default([]),
  metrics: z.array(researchMetricMeasurementSchema).default([]),
  missing_fields: z.array(z.string()).default([]),
  confidence: confidenceLevelSchema,
  payload: flexibleObjectSchema.default({}),
  runtime_versions: runtimeVersionSchema.optional(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const researchDecisionIngestionPreviewSchema = z.object({
  pack_id: z.string().min(1),
  review_id: z.string().min(1),
  evidence_records: z.array(rawEvidenceRecordSchema).default([]),
  measured_metric_candidates: flexibleObjectSchema.default({}),
  missing_data: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  runtime_versions: runtimeVersionSchema.optional(),
});

export const researchReviewSummarySchema = z.object({
  review_id: z.string().min(1),
  title: z.string().min(1),
  query: z.string().min(1),
  status: researchReviewStatusSchema,
  version: z.number().int().positive(),
  paper_count: z.number().int().nonnegative(),
  column_count: z.number().int().nonnegative(),
  completed_result_count: z.number().int().nonnegative(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const researchReviewDetailSchema = researchReviewSummarySchema.extend({
  papers: z.array(researchPaperMetadataSchema).default([]),
  columns: z.array(researchColumnDefinitionSchema).default([]),
  extraction_jobs: z.array(researchExtractionJobSchema).default([]),
  extraction_results: z.array(researchExtractionResultSchema).default([]),
  evidence_packs: z.array(researchEvidencePackSchema).default([]),
});

export const createResearchReviewRequestSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  query: z.string().trim().min(3).max(500),
  limit: z.number().int().min(1).max(100).default(25),
  source_document_ids: z.array(z.string().min(1)).min(1).max(100).optional(),
});

export const searchResearchPapersRequestSchema = z.object({
  query: z.string().trim().min(3).max(500),
  limit: z.number().int().min(1).max(50).default(15),
  page: z.number().int().positive().default(1),
  providers: z.array(researchSearchProviderSchema).min(1).max(3).optional(),
});

export const searchResearchPapersResponseSchema = z.object({
  query: z.string().min(1),
  providers: z.array(researchSearchProviderSchema).default([]),
  items: z.array(researchPaperSearchResultSchema).default([]),
  failed_providers: z.array(researchPaperSearchFailureSchema).default([]),
});

export const stageResearchPapersRequestSchema = z.object({
  query: z.string().trim().min(3).max(500).optional(),
  items: z.array(researchPaperSearchResultSchema).min(1).max(100),
});

export const stageResearchPapersResponseSchema = z.object({
  query: z.string().nullable().default(null),
  imported_count: z.number().int().nonnegative(),
  source_document_ids: z.array(z.string().min(1)).default([]),
  papers: z.array(researchPaperMetadataSchema).default([]),
});

export const queueResearchBackfillRequestSchema = z.object({
  query: z.string().trim().min(3).max(500),
  providers: z.array(researchSearchProviderSchema).min(1).max(3).optional(),
  per_provider_limit: z.number().int().min(1).max(1000).default(25),
  max_pages: z.number().int().min(1).max(500).default(1),
  target_records: z.number().int().min(1).max(300000).optional(),
});

export const queueResearchBackfillPresetSchema = z.enum(['mfc_mec_30000']);

export const queueResearchBackfillPresetRequestSchema = z.object({
  preset_id: queueResearchBackfillPresetSchema.default('mfc_mec_30000'),
  target_records: z.number().int().min(1).max(300000).default(30000),
});

export const researchBackfillSummarySchema = z.object({
  run_id: z.string().min(1),
  query: z.string().min(1),
  status: researchBackfillStatusSchema,
  providers: z.array(researchSearchProviderSchema).default([]),
  per_provider_limit: z.number().int().positive(),
  max_pages: z.number().int().positive(),
  target_records: z.number().int().positive(),
  next_page: z.number().int().positive(),
  pages_completed: z.number().int().nonnegative(),
  records_fetched: z.number().int().nonnegative(),
  records_stored: z.number().int().nonnegative(),
  records_remaining: z.number().int().nonnegative(),
  completion_ratio: z.number().min(0).max(1),
  failed_providers: z.array(researchPaperSearchFailureSchema).default([]),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  completed_at: z.string().min(1).nullable().default(null),
  failure_message: z.string().min(1).nullable().default(null),
});

export const researchBackfillListResponseSchema = z.object({
  items: z.array(researchBackfillSummarySchema).default([]),
});

export const researchWarehouseProgressBucketSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export const researchWarehouseProgressResponseSchema = z.object({
  target_records: z.number().int().nonnegative(),
  stored_records: z.number().int().nonnegative(),
  fetched_records: z.number().int().nonnegative(),
  records_remaining: z.number().int().nonnegative(),
  completion_ratio: z.number().min(0).max(1),
  pending_records: z.number().int().nonnegative(),
  accepted_records: z.number().int().nonnegative(),
  rejected_records: z.number().int().nonnegative(),
  high_quality_records: z.number().int().nonnegative(),
  linked_document_records: z.number().int().nonnegative(),
  pdf_records: z.number().int().nonnegative(),
  xml_records: z.number().int().nonnegative(),
  queued_backfills: z.number().int().nonnegative(),
  running_backfills: z.number().int().nonnegative(),
  completed_backfills: z.number().int().nonnegative(),
  failed_backfills: z.number().int().nonnegative(),
  source_breakdown: z.array(researchWarehouseProgressBucketSchema).default([]),
  metadata_quality_levels: z
    .array(researchWarehouseProgressBucketSchema)
    .default([]),
  veracity_levels: z.array(researchWarehouseProgressBucketSchema).default([]),
  last_updated_at: z.string().min(1).nullable().default(null),
});

export const researchWarehouseEligibilityItemSchema = z.object({
  source_document_id: z.string().min(1),
  title: z.string().min(1),
  source_type: externalEvidenceSourceTypeSchema,
  document_type: researchDocumentTypeSchema,
  access_status: externalEvidenceAccessStatusSchema,
  source_license: z.string().min(1).nullable().default(null),
  has_full_text_link: z.boolean(),
  technology_classes: z.array(researchTechnologyClassSchema).default([]),
  status: researchEligibilityStatusSchema,
  reasons: z.array(researchEligibilityReasonSchema).default([]),
  active_surface: z.boolean(),
});

export const researchWarehouseEligibilityResponseSchema = z.object({
  dry_run: z.boolean().default(true),
  total_linked_records: z.number().int().nonnegative(),
  eligible_records: z.number().int().nonnegative(),
  excluded_records: z.number().int().nonnegative(),
  inaccessible_records: z.number().int().nonnegative(),
  out_of_scope_records: z.number().int().nonnegative(),
  missing_full_text_records: z.number().int().nonnegative(),
  missing_license_records: z.number().int().nonnegative(),
  source_breakdown: z.array(researchWarehouseProgressBucketSchema).default([]),
  rejected_reason_buckets: z
    .array(researchWarehouseProgressBucketSchema)
    .default([]),
  items: z.array(researchWarehouseEligibilityItemSchema).default([]),
});

export const researchWarehouseEligibilityRequestSchema = z.object({
  dry_run: z.boolean().default(true),
  limit: z.number().int().min(1).max(500).default(100),
  include_items: z.boolean().default(true),
  source_document_ids: z.array(z.string().min(1)).max(500).optional(),
});

export const queueResearchBackfillPresetResponseSchema = z.object({
  preset_id: queueResearchBackfillPresetSchema,
  target_records: z.number().int().positive(),
  queued_runs: z.number().int().nonnegative(),
  skipped_queries: z.array(z.string().min(1)).default([]),
  backfills: z.array(researchBackfillSummarySchema).default([]),
});

export const addResearchColumnRequestSchema = researchColumnDefinitionSchema
  .omit({ position: true })
  .extend({
    position: z.number().int().nonnegative().optional(),
  });

export const runResearchExtractionsRequestSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  column_ids: z.array(z.string().min(1)).optional(),
  paper_ids: z.array(z.string().min(1)).optional(),
});

export const runResearchExtractionsResponseSchema = z.object({
  review_id: z.string().min(1),
  attempted: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  results: z.array(researchExtractionResultSchema).default([]),
});

export const createResearchEvidencePackRequestSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  status: researchEvidencePackStatusSchema.default('draft'),
});

export const researchReviewListResponseSchema = z.object({
  items: z.array(researchReviewSummarySchema),
});

export const evidenceQualityAuditRequestSchema = z.object({
  trigger_mode: evidenceQualityAuditTriggerModeSchema.default('manual'),
  include_golden_cases: z.boolean().default(true),
});

export const evidenceQualityAuditResponseSchema = z.object({
  report: evidenceQualityReportSchema,
});

export const discoveryStatusResponseSchema = z.object({
  active_targets: z.number().int().nonnegative(),
  queued_targets: z.number().int().nonnegative(),
  completed_targets: z.number().int().nonnegative(),
  failed_targets: z.number().int().nonnegative().default(0),
  total_records_staged: z.number().int().nonnegative(),
  targets: z.array(discoveryTargetSchema).default([]),
});

export const acquisitionStatusResponseSchema = z.object({
  queued_attempts: z.number().int().nonnegative(),
  running_attempts: z.number().int().nonnegative(),
  successful_attempts: z.number().int().nonnegative(),
  failed_attempts: z.number().int().nonnegative(),
  skipped_attempts: z.number().int().nonnegative().default(0),
  attempts: z.array(acquisitionAttemptSchema).default([]),
});

export type ResearchReviewStatus = z.infer<typeof researchReviewStatusSchema>;
export type ResearchSearchProvider = z.infer<
  typeof researchSearchProviderSchema
>;
export type ResearchColumnType = z.infer<typeof researchColumnTypeSchema>;
export type ResearchExtractionJobStatus = z.infer<
  typeof researchExtractionJobStatusSchema
>;
export type ResearchBackfillStatus = z.infer<
  typeof researchBackfillStatusSchema
>;
export type ResearchExtractionResultStatus = z.infer<
  typeof researchExtractionResultStatusSchema
>;
export type ResearchEvidencePackStatus = z.infer<
  typeof researchEvidencePackStatusSchema
>;
export type ResearchDocumentType = z.infer<typeof researchDocumentTypeSchema>;
export type ResearchEligibilityStatus = z.infer<
  typeof researchEligibilityStatusSchema
>;
export type ResearchEligibilityReason = z.infer<
  typeof researchEligibilityReasonSchema
>;
export type ResearchComponentType = z.infer<typeof researchComponentTypeSchema>;
export type ResearchParameterKind = z.infer<typeof researchParameterKindSchema>;
export type ResearchEvidenceTrace = z.infer<typeof researchEvidenceTraceSchema>;
export type ResearchCellStatus = z.infer<typeof researchCellStatusSchema>;
export type ResearchCellMissingReason = z.infer<
  typeof researchCellMissingReasonSchema
>;
export type ResearchCell = z.infer<typeof researchCellSchema>;
export type ResearchExtractedParameter = z.infer<
  typeof researchExtractedParameterSchema
>;
export type ResearchComponentProfile = z.infer<
  typeof researchComponentProfileSchema
>;
export type ResearchExtractionQualityGate = z.infer<
  typeof researchExtractionQualityGateSchema
>;
export type ResearchMetricMeasurement = z.infer<
  typeof researchMetricMeasurementSchema
>;
export type ResearchPaperMetadata = z.infer<typeof researchPaperMetadataSchema>;
export type ResearchDocumentMetadata = z.infer<
  typeof researchDocumentMetadataSchema
>;
export type LocalSourceImportRequest = z.infer<
  typeof localSourceImportRequestSchema
>;
export type LocalSourceImportResponse = z.infer<
  typeof localSourceImportResponseSchema
>;
export type ResearchPaperSearchResult = z.infer<
  typeof researchPaperSearchResultSchema
>;
export type ResearchPaperSearchFailure = z.infer<
  typeof researchPaperSearchFailureSchema
>;
export type ResearchColumnDefinition = z.infer<
  typeof researchColumnDefinitionSchema
>;
export type ResearchSystemPerformanceExtraction = z.infer<
  typeof researchSystemPerformanceExtractionSchema
>;
export type ResearchImplementationFactorsExtraction = z.infer<
  typeof researchImplementationFactorsExtractionSchema
>;
export type ResearchExtractionResult = z.infer<
  typeof researchExtractionResultSchema
>;
export type ResearchExtractionJob = z.infer<typeof researchExtractionJobSchema>;
export type ResearchEvidencePack = z.infer<typeof researchEvidencePackSchema>;
export type ResearchDecisionIngestionPreview = z.infer<
  typeof researchDecisionIngestionPreviewSchema
>;
export type ResearchReviewSummary = z.infer<typeof researchReviewSummarySchema>;
export type ResearchReviewDetail = z.infer<typeof researchReviewDetailSchema>;
export type CreateResearchReviewRequest = z.infer<
  typeof createResearchReviewRequestSchema
>;
export type SearchResearchPapersRequest = z.infer<
  typeof searchResearchPapersRequestSchema
>;
export type SearchResearchPapersResponse = z.infer<
  typeof searchResearchPapersResponseSchema
>;
export type StageResearchPapersRequest = z.infer<
  typeof stageResearchPapersRequestSchema
>;
export type StageResearchPapersResponse = z.infer<
  typeof stageResearchPapersResponseSchema
>;
export type QueueResearchBackfillRequest = z.infer<
  typeof queueResearchBackfillRequestSchema
>;
export type QueueResearchBackfillPreset = z.infer<
  typeof queueResearchBackfillPresetSchema
>;
export type QueueResearchBackfillPresetRequest = z.infer<
  typeof queueResearchBackfillPresetRequestSchema
>;
export type ResearchBackfillSummary = z.infer<
  typeof researchBackfillSummarySchema
>;
export type ResearchBackfillListResponse = z.infer<
  typeof researchBackfillListResponseSchema
>;
export type ResearchWarehouseProgressResponse = z.infer<
  typeof researchWarehouseProgressResponseSchema
>;
export type ResearchWarehouseEligibilityItem = z.infer<
  typeof researchWarehouseEligibilityItemSchema
>;
export type ResearchWarehouseEligibilityResponse = z.infer<
  typeof researchWarehouseEligibilityResponseSchema
>;
export type ResearchWarehouseEligibilityRequest = z.infer<
  typeof researchWarehouseEligibilityRequestSchema
>;
export type QueueResearchBackfillPresetResponse = z.infer<
  typeof queueResearchBackfillPresetResponseSchema
>;
export type AddResearchColumnRequest = z.infer<
  typeof addResearchColumnRequestSchema
>;
export type RunResearchExtractionsRequest = z.infer<
  typeof runResearchExtractionsRequestSchema
>;
export type RunResearchExtractionsResponse = z.infer<
  typeof runResearchExtractionsResponseSchema
>;
export type CreateResearchEvidencePackRequest = z.infer<
  typeof createResearchEvidencePackRequestSchema
>;
export type ResearchReviewListResponse = z.infer<
  typeof researchReviewListResponseSchema
>;
export type EvidenceQualityAuditRequest = z.infer<
  typeof evidenceQualityAuditRequestSchema
>;
export type EvidenceQualityAuditResponse = z.infer<
  typeof evidenceQualityAuditResponseSchema
>;
export type DiscoveryStatusResponse = z.infer<
  typeof discoveryStatusResponseSchema
>;
export type AcquisitionStatusResponse = z.infer<
  typeof acquisitionStatusResponseSchema
>;

export const researchEvidenceTypeSchema = evidenceTypeSchema;
export const researchEvidenceStrengthSchema = evidenceStrengthSchema;
