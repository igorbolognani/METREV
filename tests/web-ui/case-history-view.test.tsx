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
  it('renders timeline tables, collapsed audit disclosures, and structured evidence context', async () => {
    const { historyWorkspace, repository } = await buildWorkspaceViewFixtures();

    try {
      const html = renderToStaticMarkup(
        React.createElement(CaseHistoryWorkspaceView, {
          workspace: historyWorkspace,
        }),
      );

      expect(html).toContain('Case history');
      expect(html).toContain('Defaults used');
      expect(html).toContain('Stored evaluation runs');
      expect(html).toContain('Compare pair');
      expect(html).toContain('Persisted provenance and snapshots');
      expect(html).toContain(
        'Accepted benchmark source imported into the workspace.',
      );
      expect(html).toContain('Audit payload disclosures');
      expect(html).toContain('Attached evidence table');
    } finally {
      await repository.disconnect();
    }
  });
});
