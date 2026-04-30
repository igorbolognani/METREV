import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type { ExternalEvidenceCatalogItemDetail } from '@metrev/domain-contracts';
import { ExternalEvidenceDetailView } from '../../apps/web-ui/src/components/external-evidence-detail';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

const item: ExternalEvidenceCatalogItemDetail = {
  id: 'catalog-item-accepted-001',
  title: 'Accepted sidestream benchmark',
  summary: 'Accepted benchmark record for industrial sidestream treatment.',
  evidence_type: 'literature_evidence',
  strength_level: 'strong',
  review_status: 'accepted',
  source_state: 'reviewed',
  source_type: 'crossref',
  source_category: 'journal_article',
  source_url: 'https://example.test/article',
  doi: '10.1000/example',
  publisher: 'Journal of MET Studies',
  published_at: '2025-11-10',
  provenance_note: 'Imported and accepted for analyst intake.',
  claim_count: 1,
  reviewed_claim_count: 1,
  applicability_scope: {
    influent: 'industrial sidestream',
    temperature_window: 'mesophilic',
  },
  extracted_claims: [
    {
      claim: 'Benchmark shows stable COD removal uplift.',
      detail: 'Observed after separator redesign.',
      scope: 'industrial sidestream retrofit',
    },
  ],
  tags: ['sidestream', 'benchmark', 'accepted'],
  created_at: '2026-04-16T08:00:00.000Z',
  updated_at: '2026-04-16T09:15:00.000Z',
  abstract_text: 'Structured abstract describing the benchmark conditions.',
  payload: {
    normalized: true,
    score: 0.91,
  },
  source_document: {
    id: 'source-crossref-001',
    source_type: 'crossref',
    source_category: 'journal_article',
    source_url: 'https://example.test/article',
    doi: '10.1000/example',
    publisher: 'Journal of MET Studies',
    journal: 'Integration Verification Journal',
    published_at: '2025-11-10',
    access_status: 'green',
    license: 'CC-BY-4.0',
    pdf_url: null,
    xml_url: null,
    authors: [{ name: 'A. Analyst' }, { name: 'B. Reviewer' }],
  },
  claims: [
    {
      id: 'claim-001',
      source_document_id: 'source-crossref-001',
      catalog_item_id: 'catalog-item-accepted-001',
      claim_type: 'metric',
      content:
        'Stable COD removal uplift was observed after separator redesign.',
      extracted_value: '14',
      unit: '%',
      confidence: 0.88,
      extraction_method: 'import_rule',
      extractor_version: 'seed-v1',
      source_snippet:
        'COD removal uplift of 14% was observed after separator redesign.',
      source_locator: 'results.table_1',
      page_number: null,
      metadata: {},
      reviews: [],
      ontology_mappings: [],
      created_at: '2026-04-16T08:00:00.000Z',
      updated_at: '2026-04-16T09:15:00.000Z',
    },
  ],
  supplier_documents: [
    {
      id: 'supplier-document-001',
      supplier_id: 'supplier-001',
      source_document_id: 'source-crossref-001',
      product_id: 'product-001',
      document_type: 'report',
      note: 'Linked by analyst during supplier review.',
    },
  ],
  source_artifacts: [],
  raw_payload: {
    imported_from: 'crossref',
    raw: true,
  },
};

describe('external evidence detail view', () => {
  it('renders the tabbed overview with review controls and provenance framing', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExternalEvidenceDetailView, {
        canReview: true,
        defaultTab: 'overview',
        item,
        mutationError: null,
        mutationPending: false,
        onReviewAction: vi.fn(),
        onReviewNoteChange: vi.fn(),
        reviewNote: 'Analyst note',
      }),
    );

    expect(html).toContain('Analyst review action bar');
    expect(html).toContain('Open explorer');
    expect(html).toContain('Detail workbench');
    expect(html).toContain('Overview');
    expect(html).toContain('Claims');
    expect(html).toContain('Provenance');
    expect(html).toContain('Payloads');
    expect(html).toContain('Source identity and timestamps');
    expect(html).toContain('Metadata quality and veracity');
    expect(html).toContain('Applicability scope');
  });

  it('renders the structured claims tab on demand', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExternalEvidenceDetailView, {
        canReview: true,
        defaultTab: 'claims',
        item,
        mutationError: null,
        mutationPending: false,
        onReviewAction: vi.fn(),
        onReviewNoteChange: vi.fn(),
        reviewNote: 'Analyst note',
      }),
    );

    expect(html).toContain('Structured claims');
    expect(html).toContain(
      'Stable COD removal uplift was observed after separator redesign.',
    );
  });

  it('renders the provenance and payload tabs when selected', () => {
    const provenanceHtml = renderToStaticMarkup(
      React.createElement(ExternalEvidenceDetailView, {
        canReview: true,
        defaultTab: 'provenance',
        item,
        mutationError: null,
        mutationPending: false,
        onReviewAction: vi.fn(),
        onReviewNoteChange: vi.fn(),
        reviewNote: 'Analyst note',
      }),
    );

    expect(provenanceHtml).toContain('Source document record');
    expect(provenanceHtml).toContain('Access status Green');
    expect(provenanceHtml).toContain('Supplier-linked documents');
    expect(provenanceHtml).toContain(
      'Linked by analyst during supplier review.',
    );

    const payloadHtml = renderToStaticMarkup(
      React.createElement(ExternalEvidenceDetailView, {
        canReview: true,
        defaultTab: 'payloads',
        item,
        mutationError: null,
        mutationPending: false,
        onReviewAction: vi.fn(),
        onReviewNoteChange: vi.fn(),
        reviewNote: 'Analyst note',
      }),
    );

    expect(payloadHtml).toContain('Catalog payload');
    expect(payloadHtml).toContain('Raw source payload');
  });
});
