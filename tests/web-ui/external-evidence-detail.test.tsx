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
  raw_payload: {
    imported_from: 'crossref',
    raw: true,
  },
};

describe('external evidence detail view', () => {
  it('renders metadata, note-aware review controls, claims, and payload disclosures', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExternalEvidenceDetailView, {
        canReview: true,
        item,
        mutationError: null,
        mutationPending: false,
        onReviewAction: vi.fn(),
        onReviewNoteChange: vi.fn(),
        reviewNote: 'Analyst note',
      }),
    );

    expect(html).toContain('Analyst review action bar');
    expect(html).toContain('Source identity and timestamps');
    expect(html).toContain('Structured claims');
    expect(html).toContain('Applicability scope');
    expect(html).toContain('Catalog payload');
    expect(html).toContain('Raw source payload');
  });
});
