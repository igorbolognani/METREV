import mfcPaperFixture from '../fixtures/research/mfc-paper.json';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import {
    researchDecisionIngestionPreviewSchema,
    researchEvidencePackSchema,
    researchExtractionResultSchema,
    researchPaperMetadataSchema,
    researchReviewDetailSchema,
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
  fetchResearchEvidencePackDecisionInput: vi.fn(),
  fetchResearchReview: vi.fn(),
  fetchResearchReviews: vi.fn(),
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

  return researchReviewDetailSchema.parse({
    review_id: 'review-001',
    title: 'MFC fixture review',
    query: 'microbial fuel cell wastewater',
    status: 'active',
    version: 1,
    paper_count: 1,
    column_count: columns.length,
    completed_result_count: 1,
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
    extraction_results: [summaryResult],
    evidence_packs: [],
    created_at: now,
    updated_at: now,
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

describe('research review workspace UI', () => {
  it('renders the review list workspace shell', async () => {
    const { ResearchReviewListView } =
      await import('../../apps/web-ui/src/components/research/research-review-list');
    const createHtml = renderToStaticMarkup(
      React.createElement(ResearchReviewListView, {
        activeTab: 'create',
        createPending: false,
        limit: 25,
        onCreate: vi.fn(),
        onLimitChange: vi.fn(),
        onSearchQueryChange: vi.fn(),
        onTabChange: vi.fn(),
        onTitleChange: vi.fn(),
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
        createPending: false,
        limit: 25,
        onCreate: vi.fn(),
        onLimitChange: vi.fn(),
        onSearchQueryChange: vi.fn(),
        onTabChange: vi.fn(),
        onTitleChange: vi.fn(),
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
    expect(reviewsHtml).toContain('MFC fixture review');
    expect(reviewsHtml).toContain('/research/reviews/review-001');
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
    expect(tableHtml).toContain('Paper');
    expect(tableHtml).toContain('Summary');
    expect(tableHtml).toContain('MFC fixture review');
    expect(tableHtml).toContain('Dual chamber microbial fuel cell');
    expect(tableHtml).toContain('A microbial fuel cell fixture reports');
    expect(columnsHtml).toContain('Add structured column');
    expect(columnsHtml).toContain('Visible columns');
    expect(papersHtml).toContain('Paper details');
    expect(packHtml).toContain('Evidence pack');
    expect(packHtml).toContain('No evidence pack selected');
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
    expect(html).toContain('power_density_w_m2');
    expect(html).toContain('HRT_h');
  });
});
