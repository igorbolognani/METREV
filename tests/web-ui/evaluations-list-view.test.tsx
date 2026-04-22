import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import type { EvaluationListResponse } from '@metrev/domain-contracts';
import { EvaluationsWorkspaceView } from '../../apps/web-ui/src/components/evaluations/evaluations-list-view';
import { sortEvaluations } from '../../apps/web-ui/src/components/evaluations/evaluations-table';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

const items: EvaluationListResponse['items'] = [
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
  {
    case_id: 'CASE-001',
    confidence_level: 'low',
    created_at: '2026-04-12T08:00:00.000Z',
    evaluation_id: 'eval-001',
    narrative_available: true,
    primary_objective: 'hydrogen_recovery',
    simulation_summary: {
      confidence_level: 'medium',
      derived_observation_count: 0,
      has_series: false,
      model_version: 'internal-v1',
      status: 'failed',
    },
    summary: 'Early hydrogen-recovery screening run.',
    technology_family: 'microbial_electrolysis_cell',
  },
];

describe('evaluations list view', () => {
  it('sorts evaluations by client-side confidence order', () => {
    const sorted = sortEvaluations(items, 'confidence_level', 'desc');

    expect(sorted[0]?.confidence_level).toBe('high');
    expect(sorted[1]?.confidence_level).toBe('low');
  });

  it('renders the evaluations registry with filters and row actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(EvaluationsWorkspaceView, {
        confidenceFilter: 'all',
        items,
        onConfidenceFilterChange: vi.fn(),
        onSearchInputChange: vi.fn(),
        onSortDirectionChange: vi.fn(),
        onSortKeyChange: vi.fn(),
        searchInput: '',
        sortDirection: 'desc',
        sortKey: 'created_at',
        totalCount: items.length,
      }),
    );

    expect(html).toContain('All evaluations');
    expect(html).toContain('Client-side sorting and filtering');
    expect(html).toContain('Evaluation registry');
    expect(html).toContain('Open result');
    expect(html).toContain('Case history');
  });
});
