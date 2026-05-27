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
  canonical_fact_count: 2,
  decision_ready_fact_count: 1,
  benchmark_record_count: 1,
  decision_ready_benchmark_count: 1,
  source_artifact_count: 1,
  source_text_chunk_count: 3,
  abstract_available: true,
  full_text_available: true,
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
  scientific_facts: [
    {
      id: 'fact-001',
      fact_layer: 'canonical',
      fact_type: 'metric',
      field_key: 'power_density',
      canonical_key: 'power_density',
      decision_ready: true,
      extraction_status: 'canonical_extracted',
      normalization_status: 'normalized',
      original_value: '1.8',
      original_unit: 'W/m2',
      normalized_value: 1.8,
      normalized_text: '1.8 W/m2',
      normalized_unit: 'W/m2',
      confidence: 0.92,
      evidence_quality: 'high',
      system_type: 'MFC',
      component_type: 'anode',
      material: 'carbon_felt',
      metric_type: 'power_density',
      source_locator: 'results.table_1',
      source_text_hash: 'hash-fact-001',
      quality_flags: [],
      payload: {
        locator: 'results.table_1',
      },
      created_at: '2026-04-16T08:00:00.000Z',
      updated_at: '2026-04-16T09:15:00.000Z',
    },
    {
      id: 'fact-002',
      fact_layer: 'canonical',
      fact_type: 'metric',
      field_key: 'cod_removal',
      canonical_key: 'cod_removal',
      decision_ready: false,
      extraction_status: 'needs_review',
      normalization_status: 'normalized',
      original_value: '82',
      original_unit: '%',
      normalized_value: 82,
      normalized_text: '82 %',
      normalized_unit: '%',
      confidence: 0.7,
      evidence_quality: 'moderate',
      system_type: 'MFC',
      component_type: 'anode',
      material: 'carbon_felt',
      metric_type: 'cod_removal',
      source_locator: 'results.table_2',
      source_text_hash: 'hash-fact-002',
      quality_flags: ['needs_review'],
      payload: {
        locator: 'results.table_2',
      },
      created_at: '2026-04-16T08:00:00.000Z',
      updated_at: '2026-04-16T09:15:00.000Z',
    },
  ],
  benchmark_records: [
    {
      id: 'benchmark-001',
      canonical_key: 'power_density',
      decision_ready: true,
      confidence: 0.91,
      system_type: 'MFC',
      application: 'industrial sidestream retrofit',
      component_type: 'anode',
      material: 'carbon_felt',
      membrane_separator: null,
      operating_condition_key: 'mesophilic',
      metric_type: 'power_density',
      normalized_value: 1.8,
      normalized_unit: 'W/m2',
      publication_year: 2025,
      evidence_quality: 'high',
      scale: 'pilot',
      trl: 6,
      cost_indicator: null,
      risk_indicator: null,
      source_locator: 'results.table_1',
      source_text_hash: 'hash-benchmark-001',
      payload: {
        locator: 'results.table_1',
      },
      created_at: '2026-04-16T08:00:00.000Z',
      updated_at: '2026-04-16T09:15:00.000Z',
    },
  ],
  source_text_status: {
    access_status: 'green',
    abstract_available: true,
    source_artifact_count: 1,
    source_text_chunk_count: 3,
    source_url_available: true,
    pdf_url_available: false,
    xml_url_available: false,
    full_text_available: true,
  },
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
    expect(html).toContain('Canonical extraction and source coverage');
    expect(html).toContain('Source-text coverage');
    expect(html).toContain('Canonical scientific facts');
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
    expect(html).toContain('Canonical scientific facts');
    expect(html).toContain('Benchmark rows');
    expect(html).toContain(
      'Stable COD removal uplift was observed after separator redesign.',
    );
    expect(html).toContain('power_density');
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
