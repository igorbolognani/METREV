import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { EvaluationComparisonWorkspaceView } from '../../apps/web-ui/src/components/evaluation-comparison-view';
import { buildWorkspaceViewFixtures } from '../fixtures/workspace-view-fixtures';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('evaluation comparison view', () => {
  it('renders dedicated metric, recommendation, and supplier deltas', async () => {
    const { comparison, repository } = await buildWorkspaceViewFixtures();

    try {
      const summaryHtml = renderToStaticMarkup(
        React.createElement(EvaluationComparisonWorkspaceView, {
          activeTab: 'summary',
          comparison,
        }),
      );

      expect(summaryHtml).toContain('Comparison');
      expect(summaryHtml).toContain('CASE-001 comparison');
      expect(summaryHtml).toContain('Confidence remained Low.');
      expect(summaryHtml).toContain('Summary');
      expect(summaryHtml).toContain('Metrics');
      expect(summaryHtml).toContain('Actions');
      expect(summaryHtml).toContain('Suppliers');
      expect(summaryHtml).toContain('Current versus baseline');
      expect(summaryHtml).toContain(
        'Confidence, defaults, and missing-data shifts',
      );
      expect(summaryHtml).toContain('Current run');
      expect(summaryHtml).toContain('Baseline run');

      const metricsHtml = renderToStaticMarkup(
        React.createElement(EvaluationComparisonWorkspaceView, {
          activeTab: 'metrics',
          comparison,
        }),
      );

      expect(metricsHtml).toContain('Key metric changes');

      const actionsHtml = renderToStaticMarkup(
        React.createElement(EvaluationComparisonWorkspaceView, {
          activeTab: 'actions',
          comparison,
        }),
      );

      expect(actionsHtml).toContain('Priority ordering changes');

      const suppliersHtml = renderToStaticMarkup(
        React.createElement(EvaluationComparisonWorkspaceView, {
          activeTab: 'suppliers',
          comparison,
        }),
      );

      expect(suppliersHtml).toContain('Supplier / material delta');
    } finally {
      await repository.disconnect();
    }
  });
});
