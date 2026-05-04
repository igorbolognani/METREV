import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type { EvaluationListResponse } from '@metrev/domain-contracts';
import { ReportsWorkspaceView } from '../../apps/web-ui/src/components/reports/reports-list-view';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

const list: EvaluationListResponse = {
  items: [
    {
      case_id: 'CASE-002',
      confidence_level: 'high',
      created_at: '2026-04-16T11:00:00.000Z',
      evaluation_id: 'eval-002',
      narrative_available: false,
      primary_objective: 'wastewater_treatment',
      simulation_summary: {
        confidence_level: 'high',
        derived_observation_count: 4,
        has_series: true,
        model_version: 'internal-v1',
        status: 'completed',
      },
      summary: 'Retrofit run with modeled uplift and higher confidence.',
      technology_family: 'microbial_fuel_cell',
    },
  ],
  summary: {
    total: 1,
    filtered_total: 1,
    page: 1,
    page_size: 25,
    total_pages: 1,
    returned: 1,
  },
};

describe('reports list view', () => {
  it('renders route-fallback actions and report registry rows', () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsWorkspaceView, { list }),
    );

    expect(html).toContain('Reports');
    expect(html).toContain('Dashboard workspace');
    expect(html).toContain('Configure stack');
    expect(html).toContain('Report registry');
    expect(html).toContain('CASE-002 report');
    expect(html).toContain('Open report');
    expect(html).toContain('Case history');
  });

  it('renders a clean empty state when no saved reports exist', () => {
    const emptyHtml = renderToStaticMarkup(
      React.createElement(ReportsWorkspaceView, {
        list: {
          items: [],
          summary: {
            total: 0,
            filtered_total: 0,
            page: 1,
            page_size: 25,
            total_pages: 0,
            returned: 0,
          },
        },
      }),
    );

    expect(emptyHtml).toContain('No reports yet');
    expect(emptyHtml).toContain('Open dashboard workspace');
  });
});
