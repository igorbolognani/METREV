import incompletePaperFixture from '../fixtures/research/incomplete-paper.json';
import mfcPaperFixture from '../fixtures/research/mfc-paper.json';

import { describe, expect, it } from 'vitest';

import {
    evidenceClaimSchema,
    researchColumnDefinitionSchema,
    researchDataMetadataReadinessExtractionSchema,
    researchDecisionIngestionPreviewSchema,
    researchEvidencePackSchema,
    researchExtractionResultSchema,
    researchPaperMetadataSchema,
    researchSystemPerformanceExtractionSchema,
    type EvidenceClaim,
    type RuntimeVersion,
} from '@metrev/domain-contracts';
import {
    buildDecisionIngestionPreview,
    buildResearchEvidencePack,
    extractMetricMeasurements,
    findDefaultResearchColumn,
    getDefaultResearchColumns,
    runDeterministicResearchExtraction,
} from '@metrev/research-intelligence';

const now = '2026-04-24T12:00:00.000Z';
const researchRuntimeVersions: RuntimeVersion = {
  contract_version: '0.3',
  ontology_version: '0.3',
  ruleset_version: '0.3',
  prompt_version: 'research-evidence-pack-v1',
  model_version: 'research-runtime-v1',
  workspace_schema_version: '015.0.0',
};

function fixtureClaim(overrides: Partial<EvidenceClaim> = {}): EvidenceClaim {
  return evidenceClaimSchema.parse({
    id: 'fixture-claim-001',
    source_document_id: 'fixture-source-mfc-001',
    catalog_item_id: null,
    claim_type: 'limitation',
    content:
      'Membrane fouling, electrode cost, and scale-up maintenance remained challenges.',
    extracted_value: null,
    unit: null,
    confidence: 0.82,
    extraction_method: 'import_rule',
    extractor_version: 'fixture-v1',
    source_snippet:
      'Membrane fouling, electrode cost, and scale-up maintenance remained challenges.',
    source_locator: 'abstract',
    page_number: null,
    metadata: {},
    reviews: [],
    ontology_mappings: [],
    created_at: now,
    updated_at: now,
    ...overrides,
  });
}

describe('research intelligence runtime contracts', () => {
  it('keeps default review columns schema-backed and table-first', () => {
    const columns = getDefaultResearchColumns();

    expect(columns.map((column) => column.column_id).slice(0, 10)).toEqual([
      'paper',
      'summary',
      'technology_application',
      'design_parameters',
      'material_properties',
      'operating_conditions',
      'performance_metrics',
      'product_outputs',
      'limitations',
      'implementation_factors',
    ]);
    expect(
      columns.every(
        (column) => researchColumnDefinitionSchema.safeParse(column).success,
      ),
    ).toBe(true);
    expect(
      columns.find((column) => column.column_id === 'research_gaps'),
    ).toEqual(
      expect.objectContaining({ visible: false, type: 'llm_extracted' }),
    );
    expect(
      columns.find((column) => column.column_id === 'data_metadata_readiness'),
    ).toEqual(
      expect.objectContaining({
        visible: true,
        type: 'deterministic',
        group: 'data_readiness',
      }),
    );
  });

  it('extracts data and metadata readiness with explicit gaps and traces', () => {
    const paper = researchPaperMetadataSchema.parse({
      ...incompletePaperFixture,
      paper_id: 'fixture-paper-readiness-001',
      source_document_id: 'fixture-source-readiness-001',
      title: 'Wastewater sensor metadata and analytics readiness',
      abstract_text:
        'Metadata describing signal generation, calibration, validation, timestamps, temporal resolution, rain events, toxic discharge, and data pipelines improves trustworthy analytics and decision support.',
      doi: '10.1000/readiness-fixture',
      source_type: 'manual',
      source_url: 'https://example.org/readiness',
      pdf_url: 'https://example.org/readiness.pdf',
    });
    const column = findDefaultResearchColumn('data_metadata_readiness');
    if (!column) {
      throw new Error('data_metadata_readiness default column not registered');
    }

    const result = runDeterministicResearchExtraction({
      reviewId: 'review-fixture-001',
      paper,
      column,
      claims: [
        fixtureClaim({
          claim_type: 'condition',
          content:
            'Calibration curves, validation results, cleaning history, and rain-event annotations are required before analytics or automation reuse.',
          source_document_id: paper.source_document_id,
        }),
      ],
    });
    const answer = researchDataMetadataReadinessExtractionSchema.parse(
      result.answer,
    );

    expect(result.status).toBe('valid');
    expect(result.evidence_trace.length).toBeGreaterThan(0);
    expect(answer.metadata_categories.signal_generation).toEqual(
      expect.arrayContaining(['timestamp_origin', 'temporal_resolution']),
    );
    expect(answer.metadata_categories.signal_quality).toEqual(
      expect.arrayContaining(['calibration_context', 'validation_context']),
    );
    expect(answer.metadata_categories.contextual_annotations).toEqual(
      expect.arrayContaining(['rain_events', 'toxic_discharge']),
    );
    expect(answer.metadata_categories.data_lineage).toEqual(
      expect.arrayContaining(['data_pipeline']),
    );
    expect(answer.training_and_extraction_applicability).toEqual(
      expect.arrayContaining([
        'quality_assessment_ready',
        'traceable_extraction_ready',
      ]),
    );
    expect(answer.decision_use_readiness).toBe('ready_with_review');
    expect(answer.missing_fields).toEqual([]);
  });

  it('normalizes metric units while preserving source traces', () => {
    const metrics = extractMetricMeasurements({
      source: 'abstract',
      sourceDocumentId: 'fixture-source-mfc-001',
      sourceText:
        'The microbial fuel cell reached power density of 1200 mW/m2 and current density of 1.2 A/m2. The microbial electrolysis cell reported hydrogen production of 240 mL/L/d, NH4 recovery of 71%, conductivity of 18 mS/cm, HRT of 24 h, and energy input of 1.1 kWh/m3.',
    });

    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_key: 'power_density_w_m2',
          original_value: 1200,
          original_unit: 'mW/m2',
          normalized_value: 1.2,
          normalized_unit: 'W/m2',
          normalization_rule_id: 'research_metric.power_density.mw_m2_to_w_m2',
        }),
        expect.objectContaining({
          metric_key: 'current_density_a_m2',
          normalized_value: 1.2,
          normalized_unit: 'A/m2',
        }),
        expect.objectContaining({
          metric_key: 'hydrogen_production_ml_l_d',
          normalized_value: 240,
          normalized_unit: 'mL/L/d',
        }),
        expect.objectContaining({
          metric_key: 'ammonium_recovery_pct',
          normalized_value: 71,
          normalized_unit: '%',
        }),
        expect.objectContaining({
          metric_key: 'conductivity_ms_cm',
          normalized_value: 18,
          normalized_unit: 'mS/cm',
        }),
        expect.objectContaining({
          metric_key: 'hydraulic_retention_time_h',
          normalized_value: 24,
          normalized_unit: 'h',
        }),
        expect.objectContaining({
          metric_key: 'energy_input_kwh_m3',
          normalized_value: 1.1,
          normalized_unit: 'kWh/m3',
        }),
      ]),
    );
    expect(metrics[0]?.evidence_trace.text_span).toContain('power density');
  });

  it('extracts structured system performance with missing-field visibility', () => {
    const paper = researchPaperMetadataSchema.parse(mfcPaperFixture);
    const column = findDefaultResearchColumn('performance_metrics');
    if (!column) {
      throw new Error('performance_metrics default column not registered');
    }

    const result = runDeterministicResearchExtraction({
      reviewId: 'review-fixture-001',
      paper,
      column,
      claims: [fixtureClaim({ claim_type: 'metric' })],
    });
    const answer = researchSystemPerformanceExtractionSchema.parse(
      result.answer,
    );
    const metrics = result.normalized_payload.metrics;

    expect(result.status).toBe('valid');
    expect(result.evidence_trace.length).toBeGreaterThan(0);
    expect(answer.technology_class).toContain('MFC');
    expect(answer.reactor_architecture.type).toBe('dual chamber');
    expect(answer.anode.material).toBe('carbon felt');
    expect(answer.cathode.catalyst).toBe('platinum');
    expect(answer.membrane_or_separator.type).toBe('Nafion');
    expect(answer.operating_conditions).toMatchObject({
      pH: 7,
      temperature_c: 30,
      substrate: 'acetate',
    });
    expect(answer.component_parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component_type: 'anode',
          parameter_key: 'component_parameters.anode_material',
          text_value: 'carbon felt',
        }),
        expect.objectContaining({
          component_type: 'cathode',
          parameter_key: 'component_parameters.cathode_material_or_catalyst',
          text_value: 'Pt/C',
        }),
        expect.objectContaining({
          component_type: 'membrane_separator',
          parameter_key: 'component_parameters.membrane_separator_type',
          text_value: 'Nafion',
        }),
        expect.objectContaining({
          component_type: 'reactor',
          parameter_key: 'component_parameters.reactor_temperature',
          normalized_unit: 'K',
          normalized_value: 303.15,
        }),
      ]),
    );
    expect(answer.component_profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ component_type: 'anode' }),
        expect.objectContaining({ component_type: 'cathode' }),
        expect.objectContaining({ component_type: 'membrane_separator' }),
      ]),
    );
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_key: 'power_density_w_m2',
          normalized_value: 0.85,
        }),
        expect.objectContaining({
          metric_key: 'cod_removal_pct',
          normalized_value: 82,
        }),
      ]),
    );

    const incompleteResult = runDeterministicResearchExtraction({
      reviewId: 'review-fixture-001',
      paper: researchPaperMetadataSchema.parse(incompletePaperFixture),
      column,
      claims: [],
    });

    expect(incompleteResult.status).toBe('valid');
    expect(incompleteResult.missing_fields).toEqual(
      expect.arrayContaining([
        'anode.material',
        'cathode.material',
        'membrane_or_separator.type',
        'metrics',
      ]),
    );
  });

  it('requires evidence traces before valid substantive extraction output is usable', () => {
    expect(() =>
      researchExtractionResultSchema.parse({
        review_id: 'review-fixture-001',
        paper_id: 'fixture-paper-mfc-001',
        column_id: 'summary',
        status: 'valid',
        answer: { summary: 'Unsupported summary' },
        evidence_trace: [],
        confidence: 'medium',
        missing_fields: [],
        validation_errors: [],
        normalized_payload: {},
        extractor_version: 'fixture-v1',
      }),
    ).toThrow(/evidence_trace/);
  });

  it('keeps generic-list columns aligned with their declared output key', () => {
    const paper = researchPaperMetadataSchema.parse(mfcPaperFixture);
    const column = findDefaultResearchColumn('research_gaps');
    if (!column) {
      throw new Error('research_gaps default column not registered');
    }

    const result = runDeterministicResearchExtraction({
      reviewId: 'review-fixture-001',
      paper,
      column,
      claims: [
        fixtureClaim({
          claim_type: 'applicability',
          content:
            'Future research should compare membrane-less stacks under variable conductivity and report unanswered scaling questions.',
        }),
      ],
    });

    expect(result.status).toBe('valid');
    expect(result.answer).toEqual(
      expect.objectContaining({
        gaps: expect.arrayContaining([expect.any(String)]),
        confidence: 'low',
      }),
    );
    expect(result.answer).not.toEqual(
      expect.objectContaining({ items: expect.anything() }),
    );
  });

  it('builds evidence packs and decision-ingestion previews from valid results only', () => {
    const paper = researchPaperMetadataSchema.parse({
      ...mfcPaperFixture,
      metadata: {
        ...mfcPaperFixture.metadata,
        local_source_artifact_id: 'source-artifact-fixture-001',
        metadata_quality: {
          score: 0.74,
          level: 'medium',
          present_fields: ['doi', 'publisher', 'abstract_text'],
          missing_fields: ['license'],
          categories: { signal_quality: true },
          notes: ['Fixture metadata quality carried from local ingestion.'],
        },
        veracity_score: {
          score: 0.69,
          level: 'medium',
          components: {
            source_rigor: 0.8,
            metadata_completeness: 0.74,
            measurement_quality: 0.7,
            extraction_method: 0.65,
            trace_quality: 0.7,
            normalization_support: 0.8,
            review_status: 0.4,
            relevance: 0.8,
            recency_context_fit: 0.7,
            corroboration_conflict: 0.55,
          },
          confidence_penalties: ['awaiting analyst evidence-pack review'],
          notes: ['Fixture veracity is trace support, not claim truth.'],
        },
      },
    });
    const summaryColumn = findDefaultResearchColumn('summary');
    const performanceColumn = findDefaultResearchColumn('performance_metrics');
    const limitationsColumn = findDefaultResearchColumn('limitations');
    const readinessColumn = findDefaultResearchColumn(
      'data_metadata_readiness',
    );
    if (
      !summaryColumn ||
      !performanceColumn ||
      !limitationsColumn ||
      !readinessColumn
    ) {
      throw new Error('required default columns not registered');
    }

    const extractionResults = [
      runDeterministicResearchExtraction({
        reviewId: 'review-fixture-001',
        paper,
        column: summaryColumn,
        claims: [fixtureClaim({ claim_type: 'metric' })],
      }),
      runDeterministicResearchExtraction({
        reviewId: 'review-fixture-001',
        paper,
        column: performanceColumn,
        claims: [fixtureClaim({ claim_type: 'metric' })],
      }),
      runDeterministicResearchExtraction({
        reviewId: 'review-fixture-001',
        paper,
        column: limitationsColumn,
        claims: [fixtureClaim()],
      }),
      runDeterministicResearchExtraction({
        reviewId: 'review-fixture-001',
        paper,
        column: readinessColumn,
        claims: [
          fixtureClaim({
            claim_type: 'condition',
            content:
              'Calibration context, timestamps, and operating events support data quality assessment and reviewed decision use.',
          }),
        ],
      }),
    ];
    const pack = buildResearchEvidencePack({
      packId: 'pack-fixture-001',
      review: {
        review_id: 'review-fixture-001',
        title: 'Fixture MFC review',
        query: 'microbial fuel cell wastewater',
        status: 'active',
        version: 1,
        paper_count: 1,
        column_count: 4,
        completed_result_count: extractionResults.length,
        papers: [paper],
        columns: [
          summaryColumn,
          performanceColumn,
          limitationsColumn,
          readinessColumn,
        ],
        extraction_jobs: [],
        extraction_results: extractionResults,
        evidence_packs: [],
        created_at: now,
        updated_at: now,
      },
      status: 'draft',
      now,
      versions: researchRuntimeVersions,
    });
    const parsedPack = researchEvidencePackSchema.parse(pack);
    const decisionInput = researchDecisionIngestionPreviewSchema.parse(
      buildDecisionIngestionPreview(parsedPack),
    );

    expect(pack.evidence_items).toHaveLength(1);
    expect(pack.runtime_versions).toEqual(researchRuntimeVersions);
    expect(pack.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric_key: 'power_density_w_m2' }),
      ]),
    );
    expect(pack.evidence_items[0]?.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining('Membrane fouling')]),
    );
    expect(pack.evidence_items[0]).toEqual(
      expect.objectContaining({
        component_parameters: expect.arrayContaining([
          expect.objectContaining({
            parameter_key: 'component_parameters.anode_material',
          }),
          expect.objectContaining({
            parameter_key: 'component_parameters.reactor_temperature',
          }),
        ]),
        component_profiles: expect.arrayContaining([
          expect.objectContaining({ component_type: 'anode' }),
        ]),
        operating_conditions: expect.objectContaining({
          pH: 7,
          temperature_c: 30,
        }),
        metadata_quality: expect.objectContaining({ level: 'medium' }),
        review_status: 'pending',
        source_artifact_id: 'source-artifact-fixture-001',
        source_locator_refs: expect.arrayContaining(['abstract']),
        tags: expect.arrayContaining(['data-metadata-readiness']),
        veracity_score: expect.objectContaining({ level: 'medium' }),
      }),
    );
    expect(decisionInput.evidence_records).toHaveLength(1);
    expect(decisionInput.runtime_versions).toEqual(researchRuntimeVersions);
    expect(decisionInput.evidence_records[0]).toEqual(
      expect.objectContaining({
        source_artifact_ids: ['source-artifact-fixture-001'],
        source_document_id: 'fixture-source-mfc-001',
      }),
    );
    expect(decisionInput.measured_metric_candidates).toEqual(
      expect.objectContaining({
        power_density_w_m2: expect.any(Number),
      }),
    );
    expect(decisionInput.assumptions).toEqual(
      expect.arrayContaining([expect.stringContaining('literature-derived')]),
    );
  });

  it('adds explicit assumptions for missing readiness gaps and context-oriented penalties', () => {
    const preview = buildDecisionIngestionPreview(
      researchEvidencePackSchema.parse({
        pack_id: 'pack-fixture-assumptions-001',
        review_id: 'review-fixture-001',
        title: 'Assumption fixture',
        status: 'draft',
        source_result_ids: [],
        evidence_items: [
          {
            evidence_id: 'research:fixture:context-ref',
            evidence_type: 'literature_evidence',
            title: 'Context reference fixture',
            summary: 'Context-heavy metadata methodology source.',
            applicability_scope: {},
            strength_level: 'moderate',
            provenance_note: 'Fixture provenance.',
            quantitative_metrics: {},
            operating_conditions: {},
            block_mapping: [],
            limitations: [],
            contradiction_notes: [],
            review_status: 'pending',
            tags: ['data-metadata-readiness'],
            veracity_score: {
              score: 0.58,
              level: 'medium',
              components: {
                source_rigor: 0.55,
                metadata_completeness: 0.7,
                measurement_quality: 0.35,
                extraction_method: 0.72,
                trace_quality: 0.82,
                normalization_support: 0.45,
                review_status: 0.45,
                relevance: 0.72,
                recency_context_fit: 0.68,
                corroboration_conflict: 0.5,
              },
              confidence_penalties: [
                'context_reference_not_validated_performance_evidence',
              ],
            },
          },
        ],
        metrics: [],
        missing_fields: ['data_lineage_metadata', 'signal_quality_metadata'],
        confidence: 'low',
        payload: {},
        created_at: now,
        updated_at: now,
      }),
    );

    expect(preview.assumptions).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Metadata and data readiness gaps remain visible',
        ),
        expect.stringContaining(
          'Context-oriented references can guide metadata and methodology review',
        ),
      ]),
    );
  });

  it('does not let metadata-only extraction results create substantive evidence packs', () => {
    const paper = researchPaperMetadataSchema.parse(mfcPaperFixture);
    const paperColumn = findDefaultResearchColumn('paper');
    if (!paperColumn) {
      throw new Error('paper default column not registered');
    }

    const extractionResults = [
      runDeterministicResearchExtraction({
        reviewId: 'review-fixture-001',
        paper,
        column: paperColumn,
        claims: [],
      }),
    ];
    const pack = buildResearchEvidencePack({
      packId: 'pack-fixture-metadata-only',
      review: {
        review_id: 'review-fixture-001',
        title: 'Fixture metadata-only review',
        query: 'metadata only fixture',
        status: 'active',
        version: 1,
        paper_count: 1,
        column_count: 1,
        completed_result_count: extractionResults.length,
        papers: [paper],
        columns: [paperColumn],
        extraction_jobs: [],
        extraction_results: extractionResults,
        evidence_packs: [],
        created_at: now,
        updated_at: now,
      },
      status: 'draft',
      now,
    });

    expect(pack.evidence_items).toHaveLength(0);
    expect(pack.metrics).toHaveLength(0);
    expect(pack.confidence).toBe('low');
  });
});
