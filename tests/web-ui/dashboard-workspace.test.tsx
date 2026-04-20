import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type {
  EvaluationListResponse,
  ExternalEvidenceCatalogListResponse,
} from '@metrev/domain-contracts';
import { DashboardWorkspaceView } from '../../apps/web-ui/src/components/dashboard-workspace';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

const evaluationList = {
  items: [
    {
      evaluation_id: 'eval-002',
      case_id: 'CASE-002',
      created_at: '2026-04-16T11:00:00.000Z',
      confidence_level: 'high',
      technology_family: 'microbial_fuel_cell',
      primary_objective: 'wastewater_treatment',
      summary: 'Retrofit run with modeled uplift and higher confidence.',
      narrative_available: false,
      simulation_summary: {
        status: 'completed',
        derived_observations_count: 4,
        chart_series_count: 3,
        primary_reference_source: 'simple-electrochem-model',
      },
    },
    {
      evaluation_id: 'eval-001',
      case_id: 'CASE-001',
      created_at: '2026-04-14T09:30:00.000Z',
      confidence_level: 'medium',
      technology_family: 'microbial_electrolysis_cell',
      primary_objective: 'nitrogen_recovery',
      summary: 'Pilot review awaiting separator durability confirmation.',
      narrative_available: false,
      simulation_summary: {
        status: 'insufficient_data',
        derived_observations_count: 1,
        chart_series_count: 0,
        primary_reference_source: null,
      },
    },
  ],
} satisfies EvaluationListResponse;

const evidenceCatalog = {
  items: [
    {
      id: 'evidence-001',
      title: 'Accepted sidestream benchmark',
      summary: 'Accepted benchmark record for industrial sidestream treatment.',
      evidence_type: 'literature_evidence',
      strength_level: 'strong',
      review_status: 'pending',
      source_state: 'reviewed',
      source_type: 'crossref',
      source_category: 'journal_article',
      source_url: 'https://example.test/article',
      doi: '10.1000/example',
      publisher: 'Journal of MET Studies',
      published_at: '2025-11-10',
      provenance_note: 'Imported and queued for analyst review.',
      applicability_scope: {},
      extracted_claims: [],
      tags: ['sidestream', 'benchmark', 'review'],
      created_at: '2026-04-16T08:00:00.000Z',
      updated_at: '2026-04-16T08:00:00.000Z',
    },
  ],
  summary: {
    total: 3,
    pending: 1,
    accepted: 1,
    rejected: 1,
  },
} satisfies ExternalEvidenceCatalogListResponse;

describe('dashboard workspace', () => {
  it('renders workspace overview, deep links, and evidence backlog details', () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardWorkspaceView, {
        evaluationList,
        evidenceCatalog,
      }),
    );

    expect(html).toContain('Bioelectrochemical decision workbench');
    expect(html).toContain('Workspace scope');
    expect(html).toContain('2');
    expect(html).toContain('Comparison dock');
    expect(html).toContain('History rail');
    expect(html).toContain('CASE-002');
    expect(html).toContain('Imported records waiting for analyst review');
    expect(html).toContain('Accepted sidestream benchmark');
  });
});
