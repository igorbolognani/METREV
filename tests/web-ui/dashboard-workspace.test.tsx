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
      workspace_schema_version: '015.0.0',
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
  presentation: {
    page_title: 'Decision workspace',
    short_summary: 'Retrofit run with modeled uplift and higher confidence.',
    default_tab: 'overview',
    tabs: [
      { key: 'overview', label: 'Overview' },
      { key: 'runs', label: 'Runs' },
      { key: 'reports', label: 'Reports' },
    ],
    badges: [
      { key: 'runs', label: '2 runs', tone: 'muted' },
      { key: 'high-confidence', label: '1 high confidence', tone: 'success' },
    ],
    primary_actions: [
      { key: 'configure-stack', label: 'Configure stack', href: '/cases/new' },
      { key: 'open-reports', label: 'Open reports', href: '/reports' },
    ],
    copy: {
      headline: 'Decision workspace',
      summary: 'Retrofit run with modeled uplift and higher confidence.',
      detail: 'Latest case CASE-002.',
    },
  },
  summary: {
    total_runs: 2,
    total_cases: 2,
    high_confidence_runs: 1,
    modeled_runs: 1,
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
    latest_evaluation_href: '/evaluations/eval-002',
    latest_case_history_href: '/cases/CASE-002/history',
  },
  latest_run_overview: {
    title: 'CASE-002 latest run',
    subtitle: 'Retrofit run with modeled uplift and higher confidence.',
    defaults_count: 2,
    missing_data_count: 1,
    assumptions_count: 3,
    evidence_count: 4,
    attention_count: 1,
    parameter_summary: {
      total: 5,
      client_values: 3,
      system_defaults: 1,
      excluded: 1,
      unresolved: 0,
    },
    brief_cards: [
      {
        key: 'context',
        label: 'Run context',
        value: 'CASE-002',
        detail: 'Microbial Fuel Cell · Wastewater Treatment · retrofit stack',
      },
      {
        key: 'evidence',
        label: 'Evidence posture',
        value: '4 typed records',
        detail: 'Reviewed evidence and default posture remain explicit.',
      },
      {
        key: 'traceability',
        label: 'Traceability',
        value: '3 assumptions',
        detail: '2 defaults · 1 missing-data flag',
      },
    ],
    attention_items: [
      {
        key: 'cathode-risk',
        block: 'Cathode',
        finding: 'Gas-handling detail still limits confidence.',
        severity: 'Medium',
        tone: 'warning',
      },
    ],
    lead_action: {
      title: 'Cathode hardening',
      phase: 'Phase 1',
      score_label: '83 priority',
      confidence_label: 'High',
      effort_label: 'Medium',
      benefit_label: 'Stabilize gas-side performance.',
      rationale: 'Prioritize cathode-side hardening before scale-up decisions.',
      blockers: ['gas handling validation'],
      measurement_requests: ['flooding inspection'],
      supplier_candidates: ['Supplier A'],
    },
    output_status: {
      report_available: true,
      narrative_available: false,
      modeled: true,
    },
  },
  recent_evaluations: [
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
  recent_reports: [
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
      report_href: '/evaluations/eval-002/report',
    },
  ],
} satisfies DashboardWorkspaceResponse;

describe('dashboard workspace', () => {
  it('renders a compact client workspace with report access inside the dashboard tabs', () => {
    const overviewHtml = renderToStaticMarkup(
      React.createElement(DashboardWorkspaceView, {
        activeTab: 'overview',
        workspace,
      }),
    );
    const reportsHtml = renderToStaticMarkup(
      React.createElement(DashboardWorkspaceView, {
        activeTab: 'reports',
        workspace,
      }),
    );

    expect(overviewHtml).toContain('Decision workspace');
    expect(overviewHtml).toContain('Client workspace');
    expect(overviewHtml).toContain('Overview');
    expect(overviewHtml).toContain('Runs');
    expect(overviewHtml).toContain('Reports');
    expect(overviewHtml).toContain('Saved evaluations');
    expect(overviewHtml).toContain('Latest defaults');
    expect(overviewHtml).toContain('Missing-data flags');
    expect(overviewHtml).toContain('Parameter controls');
    expect(overviewHtml).toContain('CASE-002');
    expect(overviewHtml).toContain('Start or continue');
    expect(overviewHtml).toContain('Latest saved run');
    expect(overviewHtml).toContain('Latest run posture');
    expect(overviewHtml).toContain('Run context');
    expect(overviewHtml).toContain('Traceability');
    expect(overviewHtml).toContain('Next action Cathode hardening');
    expect(overviewHtml).toContain('Open latest run');
    expect(overviewHtml).toContain('Open case history');
    expect(overviewHtml).toContain('Configure stack');
    expect(overviewHtml).toContain('Open evaluations');
    expect(overviewHtml).toContain('Open reports');
    expect(overviewHtml).not.toContain('Evidence catalog total');
    expect(overviewHtml).not.toContain('System-accepted evidence');
    expect(overviewHtml).not.toContain('Review exceptions');
    expect(overviewHtml).not.toContain('Decision-ready facts');
    expect(overviewHtml).not.toContain('Canonicalization progress');
    expect(overviewHtml).not.toContain('Run momentum');
    expect(overviewHtml).not.toContain('Confidence posture');
    expect(overviewHtml).not.toContain('Accepted sidestream benchmark');
    expect(overviewHtml).not.toContain('Primary modules');

    expect(reportsHtml).toContain('Report outputs');
    expect(reportsHtml).toContain('Open full report registry');
    expect(reportsHtml).toContain('CASE-002 report');
  });

  it('renders a clean empty-state dashboard after the local registry is reset', () => {
    const emptyHtml = renderToStaticMarkup(
      React.createElement(DashboardWorkspaceView, {
        activeTab: 'overview',
        workspace: {
          ...workspace,
          presentation: {
            ...workspace.presentation,
            short_summary:
              'No deterministic evaluation is saved yet. Configure a stack to generate diagnosis, modeling, reports, and audit output.',
            copy: {
              ...workspace.presentation.copy,
              summary:
                'No deterministic evaluation is saved yet. Configure a stack to generate diagnosis, modeling, reports, and audit output.',
              detail: 'The local evaluation registry is currently clean.',
            },
          },
          summary: {
            total_runs: 0,
            total_cases: 0,
            high_confidence_runs: 0,
            modeled_runs: 0,
          },
          hero: {
            ...workspace.hero,
            latest_case_id: null,
            latest_summary: null,
          },
          trends: {
            run_growth: [],
            confidence: [],
            model_coverage: [],
          },
          quick_actions: {
            ...workspace.quick_actions,
            latest_evaluation_href: null,
            latest_case_history_href: null,
          },
          latest_run_overview: null,
          recent_evaluations: [],
          recent_reports: [],
        },
      }),
    );

    expect(emptyHtml).toContain('Start the first stack');
    expect(emptyHtml).toContain('What appears after the first run');
    expect(emptyHtml).toContain('Diagnosis and prioritized recommendations');
    expect(emptyHtml).toContain(
      'No saved evaluations remain in this local workspace.',
    );
    expect(emptyHtml).toContain('Open evaluations');
  });
});
