import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type {
    AcquisitionStatusResponse,
    DiscoveryStatusResponse,
    EvidenceQualityAuditResponse,
} from '@metrev/domain-contracts/browser';

vi.mock('@metrev/design-system', async () => {
  const ReactModule = await import('react');

  return {
    CoverageHeatmap: ({
      entries,
    }: {
      entries: Array<{
        metric_type: string;
        record_count: number;
        system_type: string | null;
        component_type: string | null;
        material: string | null;
      }>;
    }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'coverage-heatmap' },
        entries.map((entry) =>
          ReactModule.createElement(
            'span',
            { key: `${entry.system_type}-${entry.metric_type}` },
            `${entry.system_type ?? 'any'} / ${entry.component_type ?? 'any'} / ${entry.material ?? 'any'} ${entry.metric_type} ${entry.record_count}`,
          ),
        ),
      ),
    FunnelChart: ({
      stages,
    }: {
      stages: Array<{ stage: string; count: number }>;
    }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'funnel-chart' },
        stages.map((stage) =>
          ReactModule.createElement(
            'span',
            { key: stage.stage },
            `${stage.stage} ${stage.count}`,
          ),
        ),
      ),
    InstrumentPanel: ({
      title,
      meta,
      children,
      className,
    }: React.PropsWithChildren<{
      className?: string;
      meta?: React.ReactNode;
      title?: React.ReactNode;
    }>) =>
      ReactModule.createElement(
        'section',
        { className },
        title,
        meta,
        children,
      ),
    SignalBadge: ({ children }: React.PropsWithChildren) =>
      ReactModule.createElement('span', null, children),
    StatusBar: ({
      items,
    }: {
      items: Array<{ key: string; label: string; value: string }>;
    }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'status-bar' },
        items.map((item) =>
          ReactModule.createElement(
            'span',
            { key: item.key },
            `${item.label} ${item.value}`,
          ),
        ),
      ),
  };
});

import { EvidenceQualityWorkspace } from '../../apps/web-ui/src/components/evidence-quality/evidence-quality-workspace';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

function renderWithClient(element: React.ReactElement, client: QueryClient) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client }, element),
  );
}

const qualityReport = {
  report: {
    report_id: 'quality-report-001',
    trigger_mode: 'manual',
    coverage_matrix: [
      {
        system_type: 'MFC',
        component_type: 'anode',
        material: 'carbon felt',
        metric_type: 'power_density',
        scale: 'pilot',
        trl: 6,
        record_count: 12,
        coverage_level: 'strong',
        newest_publication_year: 2025,
        recency_status: 'current',
      },
    ],
    gaps: [
      {
        gap_id: 'gap-001',
        system_type: 'MFC',
        component_type: 'cathode',
        material: 'air cathode',
        metric_type: 'cod_removal',
        severity: 'critical',
        affects_golden_cases: ['wastewater-retrofit'],
        recommended_query: 'MFC cathode COD removal pilot evidence',
        priority: 95,
      },
    ],
    outliers: [
      {
        fact_id: 'fact-001',
        canonical_key: 'MFC:power_density',
        metric_type: 'power_density',
        normalized_value: 10.5,
        aggregate_median: 0.8,
        z_score: 4.2,
        source_document_id: 'source-001',
        title: 'Outlier paper',
        action: 'review',
      },
    ],
    readiness_scores: [
      {
        case_archetype: 'MFC wastewater retrofit',
        technology_family: 'microbial_fuel_cell',
        primary_objective: 'wastewater_treatment',
        readiness_level: 'partial',
        primary_metrics_coverage: 2,
        material_comparison_count: 5,
        operating_window_count: 3,
        critical_gaps: ['gap-001'],
        recommendation: 'Run targeted discovery for cathode COD removal.',
      },
    ],
    funnel_metrics: [
      {
        stage: 'raw_records',
        count: 100,
        conversion_rate: null,
      },
      {
        stage: 'accepted_records',
        count: 64,
        conversion_rate: 0.64,
      },
    ],
    summary: {
      total_benchmark_records: 64,
      decision_ready_records: 52,
      coverage_ratio: 0.81,
      critical_gap_count: 1,
      stale_metric_count: 0,
      outlier_count: 1,
    },
    created_at: '2026-05-13T12:00:00.000Z',
  },
} satisfies EvidenceQualityAuditResponse;

const discoveryStatus = {
  active_targets: 1,
  queued_targets: 2,
  completed_targets: 3,
  failed_targets: 0,
  total_records_staged: 5,
  targets: [],
} satisfies DiscoveryStatusResponse;

const acquisitionStatus = {
  queued_attempts: 4,
  running_attempts: 1,
  successful_attempts: 8,
  failed_attempts: 0,
  skipped_attempts: 0,
  attempts: [],
} satisfies AcquisitionStatusResponse;

describe('evidence quality workspace', () => {
  it('renders audit coverage, readiness, gaps, outliers, and queue status', () => {
    const client = createQueryClient();
    client.setQueryData(['evidence-quality-report'], qualityReport);
    client.setQueryData(['evidence-discovery-status'], discoveryStatus);
    client.setQueryData(['evidence-acquisition-status'], acquisitionStatus);

    const html = renderWithClient(
      React.createElement(EvidenceQualityWorkspace),
      client,
    );

    expect(html).toContain('Quality audit');
    expect(html).toContain('Readiness scores');
    expect(html).toContain('MFC wastewater retrofit');
    expect(html).toContain('Coverage matrix');
    expect(html).toContain('MFC / anode / carbon felt');
    expect(html).toContain('power_density');
    expect(html).toContain('Gap queue');
    expect(html).toContain('MFC cathode COD removal pilot evidence');
    expect(html).toContain('Outlier review');
    expect(html).toContain('Evidence funnel');
    expect(html).toContain('discovery queue');
    expect(html).toContain('acquisition queue');
  });
});
