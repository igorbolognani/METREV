import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type { DashboardWorkspaceResponse } from '@metrev/domain-contracts';
import { DashboardWorkspaceView } from '../../apps/web-ui/src/components/dashboard-workspace';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

const workspace = {
  meta: {
    generated_at: '2026-04-20T12:00:00.000Z',
    versions: {
      contract_version: '0.3',
      ontology_version: '0.3',
      ruleset_version: 'mixed(0.3,0.2)',
      prompt_version: 'not_applicable',
      model_version: 'not_applicable',
      workspace_schema_version: '014.0.0',
    },
    traceability: {
      subject_type: 'workspace',
      subject_id: 'dashboard',
      entrypoint: 'api',
      transformation_stages: [
        'evaluation_list',
        'dashboard_workspace_presenter',
      ],
      rule_refs: [],
      evidence_refs: ['evidence-001'],
      defaults_count: 0,
      missing_data_count: 0,
      evidence_count: 1,
      case_id: 'CASE-002',
      evaluation_id: 'eval-002',
    },
  },
  summary: {
    total_runs: 2,
    total_cases: 2,
    high_confidence_runs: 1,
    modeled_runs: 1,
    pending_evidence: 1,
    accepted_evidence: 1,
    rejected_evidence: 1,
  },
  hero: {
    title: 'Bioelectrochemical decision workspace',
    subtitle:
      'Deterministic evaluation, evidence review, case history, and reporting now share one operational surface.',
    latest_case_id: 'CASE-002',
    latest_summary: 'Retrofit run with modeled uplift and higher confidence.',
  },
  trends: {
    run_growth: [1, 2],
    confidence: [60, 90],
    model_coverage: [45, 100],
  },
  quick_actions: {
    new_evaluation_href: '/cases/new',
    evidence_review_href: '/evidence/review',
    latest_evaluation_href: '/evaluations/eval-002',
    latest_case_history_href: '/cases/CASE-002/history',
  },
  recent_runs: [
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
        model_version: 'internal-v1',
        confidence_level: 'high',
        derived_observation_count: 4,
        has_series: true,
      },
    },
  ],
  evidence_backlog: [
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
} satisfies DashboardWorkspaceResponse;

describe('dashboard workspace', () => {
  it('renders operational KPIs, dense tables, and latest-run quick links from the workspace payload', () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardWorkspaceView, {
        workspace,
      }),
    );

    expect(html).toContain('Bioelectrochemical decision workspace');
    expect(html).toContain('Saved runs');
    expect(html).toContain('High-confidence runs');
    expect(html).toContain('CASE-002');
    expect(html).toContain('Open result');
    expect(html).toContain('Latest evaluation');
    expect(html).toContain('Latest case history');
    expect(html).toContain('Primary modules');
    expect(html).toContain('Open input deck');
    expect(html).toContain('Open workspace');
    expect(html).toContain('Review State');
    expect(html).toContain('Accepted sidestream benchmark');
    expect(html).not.toContain('Comparison dock');
    expect(html).not.toContain('History rail');
  });
});
