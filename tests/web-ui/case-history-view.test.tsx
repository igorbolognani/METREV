import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { CaseHistoryWorkspaceView } from '../../apps/web-ui/src/components/case-history-view';
import { buildWorkspaceViewFixtures } from '../fixtures/workspace-view-fixtures';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('case history view', () => {
  it('renders timeline, compare actions, and audit context from the workspace payload', async () => {
    const { historyWorkspace, repository } = await buildWorkspaceViewFixtures();

    try {
      const html = renderToStaticMarkup(
        React.createElement(CaseHistoryWorkspaceView, {
          workspace: historyWorkspace,
        }),
      );

      expect(html).toContain('Case history');
      expect(html).toContain('Saved evaluation runs');
      expect(html).toContain('Compare pair');
      expect(html).toContain('Audit trail');
      expect(html).toContain('Attached evidence');
    } finally {
      await repository.disconnect();
    }
  });
});
