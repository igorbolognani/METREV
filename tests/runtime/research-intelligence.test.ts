import incompletePaperFixture from '../fixtures/research/incomplete-paper.json';
import mfcPaperFixture from '../fixtures/research/mfc-paper.json';

import { describe, expect, it } from 'vitest';

import {
  evidenceClaimSchema,
  researchColumnDefinitionSchema,
  researchDecisionIngestionPreviewSchema,
  researchEvidencePackSchema,
  researchExtractionResultSchema,
  researchPaperMetadataSchema,
  researchSystemPerformanceExtractionSchema,
  type EvidenceClaim,
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
  });

  it('normalizes metric units while preserving source traces', () => {
    const metrics = extractMetricMeasurements({
      source: 'abstract',
      sourceDocumentId: 'fixture-source-mfc-001',
      sourceText:
        'The microbial fuel cell reached power density of 1200 mW/m2 and current density of 1.2 A/m2.',
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
    const paper = researchPaperMetadataSchema.parse(mfcPaperFixture);
    const summaryColumn = findDefaultResearchColumn('summary');
    const performanceColumn = findDefaultResearchColumn('performance_metrics');
    const limitationsColumn = findDefaultResearchColumn('limitations');
    if (!summaryColumn || !performanceColumn || !limitationsColumn) {
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
        column_count: 3,
        completed_result_count: extractionResults.length,
        papers: [paper],
        columns: [summaryColumn, performanceColumn, limitationsColumn],
        extraction_jobs: [],
        extraction_results: extractionResults,
        evidence_packs: [],
        created_at: now,
        updated_at: now,
      },
      status: 'draft',
      now,
    });
    const parsedPack = researchEvidencePackSchema.parse(pack);
    const decisionInput = researchDecisionIngestionPreviewSchema.parse(
      buildDecisionIngestionPreview(parsedPack),
    );

    expect(pack.evidence_items).toHaveLength(1);
    expect(pack.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric_key: 'power_density_w_m2' }),
      ]),
    );
    expect(pack.evidence_items[0]?.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining('Membrane fouling')]),
    );
    expect(decisionInput.evidence_records).toHaveLength(1);
    expect(decisionInput.measured_metric_candidates).toEqual(
      expect.objectContaining({
        power_density_w_m2: expect.any(Number),
      }),
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
