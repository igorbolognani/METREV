import mfcPaperFixture from '../fixtures/research/mfc-paper.json';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import {
    researchBackfillSummarySchema,
    researchDecisionIngestionPreviewSchema,
    researchEvidencePackSchema,
    researchExtractionResultSchema,
    researchPaperMetadataSchema,
    researchPaperSearchFailureSchema,
    researchPaperSearchResultSchema,
    researchReviewDetailSchema,
    researchWarehouseProgressResponseSchema,
    sourceArtifactSchema,
} from '@metrev/domain-contracts';
import { getDefaultResearchColumns } from '@metrev/research-intelligence';

const { routerPush } = vi.hoisted(() => ({
  routerPush: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock('@/lib/api', () => ({
  addResearchColumn: vi.fn(),
  createResearchEvidencePack: vi.fn(),
  createResearchReview: vi.fn(),
  fetchResearchBackfills: vi.fn(),
  fetchResearchWarehouseProgress: vi.fn(),
  fetchResearchEvidencePackDecisionInput: vi.fn(),
  fetchResearchReview: vi.fn(),
  fetchResearchReviews: vi.fn(),
  importLocalSources: vi.fn(),
  queueResearchBackfill: vi.fn(),
  queueResearchBackfillPreset: vi.fn(),
  searchResearchPapers: vi.fn(),
  stageResearchPapers: vi.fn(),
  runResearchExtractions: vi.fn(),
}));

const now = '2026-04-24T12:00:00.000Z';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(element: React.ReactElement, client: QueryClient) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client }, element),
  );
}

function buildReviewFixture() {
  const paper = researchPaperMetadataSchema.parse(mfcPaperFixture);
  const columns = getDefaultResearchColumns();
  const systemPerformanceAnswer = {
    technology_class: ['MFC'],
    reactor_architecture: {
      type: 'dual chamber',
      useful_volume_ml: 125,
      electrode_area_cm2: 24,
      electrode_spacing_cm: 3.2,
      geometry: 'rectangular lab reactor',
    },
    anode: {
      material: 'carbon felt',
      material_class: 'carbonaceous electrode',
      surface_area_m2_g: null,
      modification: 'heat treated',
      properties: ['high porosity'],
    },
    cathode: {
      material: 'carbon cloth',
      catalyst: 'Pt/C',
      loading_mg_cm2: 0.5,
      properties: ['air cathode'],
    },
    membrane_or_separator: {
      type: 'Nafion',
      properties: ['cation exchange membrane'],
    },
    substrate_feedstock: ['acetate wastewater'],
    operating_conditions: {
      pH: 7,
      temperature_c: 30,
      HRT_h: 24,
      conductivity_ms_cm: 5.1,
    },
    electrochemical_metrics: [
      {
        metric_key: 'power_density_w_m2',
        original_value: 850,
        original_unit: 'mW/m2',
        normalized_value: 0.85,
        normalized_unit: 'W/m2',
        normalization_rule_id: 'research_metric.power_density.mw_m2_to_w_m2',
        evidence_trace: {
          source: 'abstract',
          source_document_id: paper.source_document_id,
          text_span: paper.abstract_text,
          source_locator: 'abstract',
          page_number: null,
        },
      },
      {
        metric_key: 'current_density_a_m2',
        original_value: 1.2,
        original_unit: 'A/m2',
        normalized_value: 1.2,
        normalized_unit: 'A/m2',
        normalization_rule_id: 'research_metric.current_density.a_m2_identity',
        evidence_trace: {
          source: 'abstract',
          source_document_id: paper.source_document_id,
          text_span: paper.abstract_text,
          source_locator: 'abstract',
          page_number: null,
        },
      },
    ],
    treatment_metrics: [
      {
        metric_key: 'cod_removal_pct',
        original_value: 82,
        original_unit: '%',
        normalized_value: 82,
        normalized_unit: '%',
        normalization_rule_id: 'research_metric.cod_removal.percent_identity',
        evidence_trace: {
          source: 'abstract',
          source_document_id: paper.source_document_id,
          text_span: paper.abstract_text,
          source_locator: 'abstract',
          page_number: null,
        },
      },
    ],
    product_outputs: [],
    scale: 'pilot',
    implementation_limitations: ['Membrane fouling'],
    missing_fields: [],
    evidence_trace: [
      {
        source: 'abstract',
        source_document_id: paper.source_document_id,
        text_span: paper.abstract_text,
        source_locator: 'abstract',
        page_number: null,
      },
    ],
    confidence: 'medium',
  };
  const implementationFactorsAnswer = {
    performance_limitations: ['Power density remains sensitive to fouling.'],
    internal_resistance_issues: [],
    electrode_limitations: ['Carbon felt cost and maintenance.'],
    cathode_limitations: [],
    membrane_limitations: ['Membrane fouling during pilot runs.'],
    biofilm_limitations: [],
    substrate_limitations: [],
    fouling_and_scaling: ['Observed membrane fouling.'],
    operational_risks: ['Pilot cleaning downtime.'],
    scale_up_barriers: ['Scale-up maintenance remained challenging.'],
    economic_barriers: ['Pt/C catalyst cost pressure.'],
    durability_issues: [],
    reproducibility_issues: [],
    data_gaps: [],
    maturity_signals: ['pilot'],
    implementation_dependencies: ['Periodic cleaning protocol'],
    supplier_relevance: [],
    environmental_safety_factors: [],
    missing_fields: [],
    evidence_trace: [
      {
        source: 'abstract',
        source_document_id: paper.source_document_id,
        text_span: paper.abstract_text,
        source_locator: 'abstract',
        page_number: null,
      },
    ],
    confidence: 'medium',
  };
  const dataReadinessAnswer = {
    summary: 'Access and traceability are adequate for reviewed extraction.',
    metadata_categories: {
      signal_generation: ['timestamp_origin'],
      signal_quality: ['calibration_context'],
      contextual_annotations: ['maintenance_and_cleaning'],
      data_lineage: ['provenance_and_traceability'],
      access_and_licensing: ['doi_available'],
      review_state: ['analyst_review_required'],
    },
    training_and_extraction_applicability: ['traceable_extraction_ready'],
    decision_use_readiness: 'ready_with_review',
    blocking_gaps: [],
    recommended_uses: ['reviewed_decision_support_intake'],
    missing_fields: [],
    evidence_trace: [
      {
        source: 'abstract',
        source_document_id: paper.source_document_id,
        text_span: paper.abstract_text,
        source_locator: 'abstract',
        page_number: null,
      },
    ],
    confidence: 'medium',
  };
  const summaryResult = researchExtractionResultSchema.parse({
    result_id: 'result-summary-001',
    review_id: 'review-001',
    paper_id: paper.paper_id,
    column_id: 'summary',
    status: 'valid',
    answer: {
      summary:
        'A microbial fuel cell fixture reports wastewater treatment metrics.',
      evidence_span: paper.abstract_text,
      confidence: 'medium',
    },
    evidence_trace: [
      {
        source: 'abstract',
        source_document_id: paper.source_document_id,
        text_span: paper.abstract_text,
        source_locator: 'abstract',
        page_number: null,
      },
    ],
    confidence: 'medium',
    missing_fields: [],
    validation_errors: [],
    normalized_payload: {},
    extractor_version: 'fixture-v1',
    created_at: now,
    updated_at: now,
  });
  const technologyResult = researchExtractionResultSchema.parse({
    result_id: 'result-technology-001',
    review_id: 'review-001',
    paper_id: paper.paper_id,
    column_id: 'technology_application',
    status: 'valid',
    answer: {
      technology_class: ['MFC'],
      application: 'wastewater treatment',
      scale: 'pilot',
      evidence_span: paper.abstract_text,
    },
    evidence_trace: [
      {
        source: 'abstract',
        source_document_id: paper.source_document_id,
        text_span: paper.abstract_text,
        source_locator: 'abstract',
        page_number: null,
      },
    ],
    confidence: 'medium',
    missing_fields: [],
    validation_errors: [],
    normalized_payload: {},
    extractor_version: 'fixture-v1',
    created_at: now,
    updated_at: now,
  });

  const systemPerformanceResultIds = [
    'design_parameters',
    'material_properties',
    'operating_conditions',
    'performance_metrics',
    'product_outputs',
  ] as const;

  const systemPerformanceResults = systemPerformanceResultIds.map((columnId) =>
    researchExtractionResultSchema.parse({
      result_id: `result-${columnId}-001`,
      review_id: 'review-001',
      paper_id: paper.paper_id,
      column_id: columnId,
      status: 'valid',
      answer: systemPerformanceAnswer,
      evidence_trace: systemPerformanceAnswer.evidence_trace,
      confidence: 'medium',
      missing_fields: [],
      validation_errors: [],
      normalized_payload: {
        metrics: [
          ...systemPerformanceAnswer.electrochemical_metrics,
          ...systemPerformanceAnswer.treatment_metrics,
        ],
      },
      extractor_version: 'fixture-v1',
      created_at: now,
      updated_at: now,
    }),
  );

  const limitationsResult = researchExtractionResultSchema.parse({
    result_id: 'result-limitations-001',
    review_id: 'review-001',
    paper_id: paper.paper_id,
    column_id: 'limitations',
    status: 'valid',
    answer: implementationFactorsAnswer,
    evidence_trace: implementationFactorsAnswer.evidence_trace,
    confidence: 'medium',
    missing_fields: [],
    validation_errors: [],
    normalized_payload: {},
    extractor_version: 'fixture-v1',
    created_at: now,
    updated_at: now,
  });

  const implementationFactorsResult = researchExtractionResultSchema.parse({
    result_id: 'result-implementation-factors-001',
    review_id: 'review-001',
    paper_id: paper.paper_id,
    column_id: 'implementation_factors',
    status: 'valid',
    answer: implementationFactorsAnswer,
    evidence_trace: implementationFactorsAnswer.evidence_trace,
    confidence: 'medium',
    missing_fields: [],
    validation_errors: [],
    normalized_payload: {},
    extractor_version: 'fixture-v1',
    created_at: now,
    updated_at: now,
  });

  const dataReadinessResult = researchExtractionResultSchema.parse({
    result_id: 'result-data-readiness-001',
    review_id: 'review-001',
    paper_id: paper.paper_id,
    column_id: 'data_metadata_readiness',
    status: 'valid',
    answer: dataReadinessAnswer,
    evidence_trace: dataReadinessAnswer.evidence_trace,
    confidence: 'medium',
    missing_fields: [],
    validation_errors: [],
    normalized_payload: {},
    extractor_version: 'fixture-v1',
    created_at: now,
    updated_at: now,
  });

  const extractionResults = [
    summaryResult,
    technologyResult,
    ...systemPerformanceResults,
    limitationsResult,
    implementationFactorsResult,
    dataReadinessResult,
  ];

  return researchReviewDetailSchema.parse({
    review_id: 'review-001',
    title: 'MFC fixture review',
    query: 'microbial fuel cell wastewater',
    status: 'active',
    version: 1,
    paper_count: 1,
    column_count: columns.length,
    completed_result_count: extractionResults.length,
    papers: [paper],
    columns,
    extraction_jobs: [
      {
        job_id: 'job-performance-001',
        review_id: 'review-001',
        paper_id: paper.paper_id,
        column_id: 'performance_metrics',
        status: 'queued',
        extractor_version: 'fixture-v1',
        failure_detail: null,
        created_at: now,
        updated_at: now,
      },
    ],
    extraction_results: extractionResults,
    evidence_packs: [],
    created_at: now,
    updated_at: now,
  });
}

function clonePaperFixture(index: number) {
  return researchPaperMetadataSchema.parse({
    ...mfcPaperFixture,
    paper_id: `fixture-paper-mfc-00${index}`,
    source_document_id: `fixture-source-mfc-00${index}`,
    title: `Dual chamber microbial fuel cell wastewater treatment fixture ${index}`,
    doi: `10.1000/mfc-fixture-${index}`,
    year: 2020 + index,
  });
}

function buildPackFixture() {
  return researchEvidencePackSchema.parse({
    pack_id: 'pack-001',
    review_id: 'review-001',
    title: 'Fixture evidence pack',
    status: 'draft',
    source_result_ids: ['result-summary-001'],
    evidence_items: [
      {
        evidence_id: 'research:review-001:fixture-paper-mfc-001',
        evidence_type: 'literature_evidence',
        title:
          'Dual chamber microbial fuel cell wastewater treatment with carbon felt anodes',
        summary: 'Fixture evidence summary',
        applicability_scope: {},
        strength_level: 'moderate',
        provenance_note: 'Fixture provenance',
        block_mapping: ['summary'],
        limitations: ['Membrane fouling'],
        contradiction_notes: [],
        tags: ['research-review'],
      },
    ],
    metrics: [],
    missing_fields: [],
    confidence: 'medium',
    payload: {},
    created_at: now,
    updated_at: now,
  });
}

function buildSourceArtifactFixture() {
  return sourceArtifactSchema.parse({
    artifact_id: 'artifact-001',
    source_document_id: 'source-001',
    local_path: '/tmp/fixture.pdf',
    file_name: 'fixture.pdf',
    file_hash: 'fixture-hash',
    mime_type: 'application/pdf',
    file_size_bytes: 1024,
    page_count: 2,
    extraction_method: 'pdftotext',
    ingestion_status: 'parsed',
    title: 'Fixture PDF',
    doi: null,
    license: 'local-review-only',
    access_status: 'green',
    metadata_quality: {
      score: 0.75,
      level: 'medium',
      present_fields: ['source_identity', 'file_hash'],
      missing_fields: ['doi'],
      categories: {},
      notes: [],
    },
    veracity_score: {
      score: 0.68,
      level: 'medium',
      components: {
        source_rigor: 0.7,
        metadata_completeness: 0.75,
        measurement_quality: 0.55,
        extraction_method: 0.72,
        trace_quality: 0.82,
        normalization_support: 0.45,
        review_status: 0.45,
        relevance: 0.72,
        recency_context_fit: 0.68,
        corroboration_conflict: 0.5,
      },
      confidence_penalties: ['pending_or_unaccepted_review'],
      notes: [],
    },
    failure_message: null,
    imported_at: now,
    chunks: [],
  });
}

describe('research review workspace UI', () => {
  it('renders the review list workspace shell', async () => {
    const { ResearchReviewListView } =
      await import('../../apps/web-ui/src/components/research/research-review-list');
    const createHtml = renderToStaticMarkup(
      React.createElement(ResearchReviewListView, {
        activeTab: 'create',
        backfillMaxPages: 3,
        backfillPending: false,
        backfills: [
          researchBackfillSummarySchema.parse({
            run_id: 'run-001',
            query: 'microbial fuel cell wastewater',
            status: 'queued',
            providers: ['openalex', 'crossref', 'europe_pmc'],
            per_provider_limit: 25,
            max_pages: 3,
            target_records: 75,
            next_page: 1,
            pages_completed: 0,
            records_fetched: 0,
            records_stored: 0,
            records_remaining: 75,
            completion_ratio: 0,
            failed_providers: [],
            created_at: now,
            updated_at: now,
            completed_at: null,
            failure_message: null,
          }),
        ],
        presetBackfillPending: false,
        createPending: false,
        importPending: false,
        importedPapers: [
          researchPaperMetadataSchema.parse({
            paper_id: 'staged:source-001',
            source_document_id: 'source-001',
            title: 'Imported fixture paper',
            authors: [],
            year: 2025,
            doi: '10.1000/imported-fixture',
            journal: 'Fixture Journal',
            publisher: 'Fixture Publisher',
            source_type: 'openalex',
            source_url: 'https://example.org/imported',
            pdf_url: null,
            abstract_text: 'Imported abstract',
            citation_count: 2,
            metadata: {},
          }),
        ],
        limit: 25,
        localPdfArtifacts: [buildSourceArtifactFixture()],
        localPdfImportPending: false,
        localPdfPaths: '/tmp/fixture.pdf',
        onBackfillMaxPagesChange: vi.fn(),
        onCreate: vi.fn(),
        onImportLocalPdfs: vi.fn(),
        onQueueBackfill: vi.fn(),
        onImportSelected: vi.fn(),
        onLimitChange: vi.fn(),
        onLocalPdfPathsChange: vi.fn(),
        onRunSearch: vi.fn(),
        onQueuePresetBackfill: vi.fn(),
        onSearchQueryChange: vi.fn(),
        onTabChange: vi.fn(),
        onToggleSearchResult: vi.fn(),
        onTitleChange: vi.fn(),
        warehouseProgress: researchWarehouseProgressResponseSchema.parse({
          target_records: 30000,
          stored_records: 683,
          fetched_records: 1200,
          records_remaining: 29317,
          completion_ratio: 0.0227666667,
          pending_records: 683,
          accepted_records: 0,
          rejected_records: 0,
          high_quality_records: 214,
          linked_document_records: 312,
          pdf_records: 0,
          xml_records: 0,
          queued_backfills: 5,
          running_backfills: 1,
          completed_backfills: 2,
          failed_backfills: 0,
          source_breakdown: [
            { key: 'openalex', label: 'OpenAlex', count: 400 },
            { key: 'crossref', label: 'Crossref', count: 200 },
          ],
          metadata_quality_levels: [{ key: 'high', label: 'High', count: 214 }],
          veracity_levels: [],
          last_updated_at: now,
        }),
        searchFailures: [
          researchPaperSearchFailureSchema.parse({
            provider: 'crossref',
            message: 'Rate limit warning',
          }),
        ],
        searchPending: false,
        searchResults: [
          researchPaperSearchResultSchema.parse({
            source_type: 'openalex',
            source_key: 'https://openalex.org/W123',
            title: 'Live search fixture paper',
            authors: [{ name: 'Fixture Author' }],
            year: 2025,
            doi: '10.1000/live-search-fixture',
            journal: 'Fixture Journal',
            publisher: 'Fixture Publisher',
            source_url: 'https://example.org/live-search-fixture',
            pdf_url: null,
            xml_url: null,
            abstract_text: 'Live search abstract fixture',
            citation_count: 12,
            access_status: 'green',
            metadata: {},
          }),
        ],
        selectedSearchResultKeys: ['openalex:https://openalex.org/W123'],
        reviews: [
          {
            review_id: 'review-001',
            title: 'MFC fixture review',
            query: 'microbial fuel cell wastewater',
            status: 'active',
            version: 1,
            paper_count: 2,
            column_count: 18,
            completed_result_count: 4,
            created_at: now,
            updated_at: now,
          },
        ],
        searchQuery: 'microbial fuel cell wastewater',
        title: '',
      }),
    );

    const reviewsHtml = renderToStaticMarkup(
      React.createElement(ResearchReviewListView, {
        activeTab: 'reviews',
        backfillMaxPages: 3,
        backfillPending: false,
        backfills: [],
        presetBackfillPending: false,
        createPending: false,
        importPending: false,
        importedPapers: [],
        limit: 25,
        localPdfArtifacts: [],
        localPdfImportPending: false,
        localPdfPaths: '',
        onBackfillMaxPagesChange: vi.fn(),
        onCreate: vi.fn(),
        onImportSelected: vi.fn(),
        onImportLocalPdfs: vi.fn(),
        onLimitChange: vi.fn(),
        onLocalPdfPathsChange: vi.fn(),
        onQueueBackfill: vi.fn(),
        onQueuePresetBackfill: vi.fn(),
        onRunSearch: vi.fn(),
        onSearchQueryChange: vi.fn(),
        onTabChange: vi.fn(),
        onToggleSearchResult: vi.fn(),
        onTitleChange: vi.fn(),
        warehouseProgress: null,
        searchFailures: [],
        searchPending: false,
        searchResults: [],
        selectedSearchResultKeys: [],
        reviews: [
          {
            review_id: 'review-001',
            title: 'MFC fixture review',
            query: 'microbial fuel cell wastewater',
            status: 'active',
            version: 1,
            paper_count: 2,
            column_count: 18,
            completed_result_count: 4,
            created_at: now,
            updated_at: now,
          },
        ],
        searchQuery: 'microbial fuel cell wastewater',
        title: '',
      }),
    );

    expect(createHtml).toContain('Research intelligence');
    expect(createHtml).toContain('Research layers');
    expect(createHtml).toContain('Create review');
    expect(createHtml).toContain('Local PDF import');
    expect(createHtml).toContain('Metadata quality');
    expect(createHtml).toContain('fixture.pdf');
    expect(createHtml).toContain('Warehouse backfill');
    expect(createHtml).toContain('MFC/MEC warehouse expansion');
    expect(createHtml).toContain('Queue MFC/MEC 30,000 preset');
    expect(createHtml).toContain('Queue warehouse backfill');
    expect(createHtml).toContain('External paper search');
    expect(createHtml).toContain('Live search fixture paper');
    expect(createHtml).toContain('Import selected papers');
    expect(createHtml).toContain('Create review from imported papers');
    expect(reviewsHtml).toContain('MFC fixture review');
    expect(reviewsHtml).toContain(
      '/admin/intelligence/research/reviews/review-001',
    );
    expect(reviewsHtml).toContain('Open table');
  });

  it('renders the table, add-column panel, detail panel, and evidence pack section', async () => {
    const { ResearchReviewDetailWorkspace } =
      await import('../../apps/web-ui/src/components/research/research-review-detail');
    const client = createQueryClient();
    const review = buildReviewFixture();
    client.setQueryData(['research-review', 'review-001'], review);

    const tableHtml = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'table',
        reviewId: 'review-001',
      }),
      client,
    );
    const columnsClient = createQueryClient();
    columnsClient.setQueryData(['research-review', 'review-001'], review);
    const columnsHtml = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'columns',
        reviewId: 'review-001',
      }),
      columnsClient,
    );
    const papersClient = createQueryClient();
    papersClient.setQueryData(['research-review', 'review-001'], review);
    const papersHtml = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'papers',
        reviewId: 'review-001',
      }),
      papersClient,
    );
    const packClient = createQueryClient();
    packClient.setQueryData(['research-review', 'review-001'], review);
    const packHtml = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'pack',
        reviewId: 'review-001',
      }),
      packClient,
    );

    expect(tableHtml).toContain('Research detail layers');
    expect(tableHtml).toContain('Review table');
    expect(tableHtml).toContain('Overview');
    expect(tableHtml).toContain('Reactor &amp; Materials');
    expect(tableHtml).toContain('Metrics &amp; Outputs');
    expect(tableHtml).toContain('Decision &amp; Metadata');
    expect(tableHtml).toContain('Paper');
    expect(tableHtml).toContain('Summary');
    expect(tableHtml).toContain('MFC fixture review');
    expect(tableHtml).toContain('Dual chamber microbial fuel cell');
    expect(tableHtml).toContain('A microbial fuel cell fixture reports');
    expect(tableHtml).toContain('dual chamber');
    expect(tableHtml).toContain('anode carbon felt');
    expect(tableHtml).toContain('separator Nafion');
    expect(tableHtml).toContain('0.85 W/m2');
    expect(tableHtml).toContain('Scale-up maintenance remained challenging.');
    expect(columnsHtml).toContain('Add structured column');
    expect(columnsHtml).toContain('Visible columns');
    expect(papersHtml).toContain('Paper details');
    expect(papersHtml).toContain(
      'Access and traceability are adequate for reviewed extraction.',
    );
    expect(papersHtml).toContain('dual chamber');
    expect(papersHtml).toContain('0.85 W/m2');
    expect(packHtml).toContain('Evidence pack');
    expect(packHtml).toContain('No evidence pack selected');
  });

  it('renders every paper card in the papers tab instead of truncating after three items', async () => {
    const { ResearchReviewDetailWorkspace } =
      await import('../../apps/web-ui/src/components/research/research-review-detail');
    const client = createQueryClient();
    const review = buildReviewFixture();
    const papers = [1, 2, 3, 4].map((index) => clonePaperFixture(index));

    client.setQueryData(['research-review', 'review-001'], {
      ...review,
      paper_count: papers.length,
      papers,
    });

    const papersHtml = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'papers',
        reviewId: 'review-001',
      }),
      client,
    );

    expect(papersHtml).toContain('fixture 1');
    expect(papersHtml).toContain('fixture 2');
    expect(papersHtml).toContain('fixture 3');
    expect(papersHtml).toContain('fixture 4');
  });

  it('strips raw markup from visible paper and summary text', async () => {
    const { ResearchReviewDetailWorkspace } =
      await import('../../apps/web-ui/src/components/research/research-review-detail');
    const client = createQueryClient();
    const review = buildReviewFixture();

    review.papers[0] = researchPaperMetadataSchema.parse({
      ...review.papers[0],
      abstract_text:
        '<h4>Background</h4>This study uses &lt;i&gt;E. coli&lt;/i&gt; in wastewater treatment.',
    });

    review.extraction_results = review.extraction_results.map((result) =>
      result.column_id === 'summary'
        ? researchExtractionResultSchema.parse({
            ...result,
            answer: {
              summary:
                '<jats:p>Structured &lt;b&gt;summary&lt;/b&gt; text with <i>markup</i>.</jats:p>',
              evidence_span: review.papers[0].abstract_text,
              confidence: 'medium',
            },
          })
        : result,
    );

    client.setQueryData(['research-review', 'review-001'], review);

    const tableHtml = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'table',
        reviewId: 'review-001',
      }),
      client,
    );
    const papersHtml = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'papers',
        reviewId: 'review-001',
      }),
      client,
    );

    expect(tableHtml).toContain('Structured summary text with markup.');
    expect(tableHtml).not.toContain('&lt;b&gt;');
    expect(tableHtml).not.toContain('jats:p');
    expect(papersHtml).toContain(
      'Background This study uses E. coli in wastewater treatment.',
    );
    expect(papersHtml).not.toContain('&lt;i&gt;');
    expect(papersHtml).not.toContain('&lt;h4&gt;');
  });

  it('renders persisted evidence-pack decision preview data from cached queries', async () => {
    const { ResearchReviewDetailWorkspace } =
      await import('../../apps/web-ui/src/components/research/research-review-detail');
    const client = createQueryClient();
    const review = buildReviewFixture();
    const pack = buildPackFixture();
    client.setQueryData(['research-review', 'review-001'], {
      ...review,
      evidence_packs: [pack],
    });
    client.setQueryData(
      ['research-evidence-pack-decision-input', pack.pack_id],
      researchDecisionIngestionPreviewSchema.parse({
        pack_id: pack.pack_id,
        review_id: review.review_id,
        evidence_records: pack.evidence_items,
        measured_metric_candidates: {
          power_density_w_m2: 0.85,
        },
        missing_data: ['HRT_h'],
        assumptions: ['Fixture assumption'],
      }),
    );

    const html = renderWithClient(
      React.createElement(ResearchReviewDetailWorkspace, {
        activeTab: 'pack',
        reviewId: 'review-001',
      }),
      client,
    );

    expect(html).toContain('Fixture evidence pack');
    expect(html).toContain('Evidence Records');
    expect(html).toContain('Metric Candidates');
    expect(html).toContain('Missing Data');
    expect(html).toContain('Assumptions');
    expect(html).toContain('Raw decision preview');
    expect(html).toContain('power_density_w_m2');
    expect(html).toContain('HRT_h');
  });
});
