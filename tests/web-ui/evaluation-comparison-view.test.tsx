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
      const html = renderToStaticMarkup(
        React.createElement(EvaluationComparisonWorkspaceView, {
          comparison,
        }),
      );

      expect(html).toContain('run comparison');
      expect(html).toContain('Key metric changes');
      expect(html).toContain('Priority ordering changes');
      expect(html).toContain('Supplier / material delta');
      expect(html).toContain('Current run');
      expect(html).toContain('Baseline run');
    } finally {
      await repository.disconnect();
    }
  });
});
