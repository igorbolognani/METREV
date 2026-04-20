import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { EvidenceReviewWorkspaceView } from '../../apps/web-ui/src/components/external-evidence-review-board';
import { buildWorkspaceViewFixtures } from '../fixtures/workspace-view-fixtures';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('external evidence review board', () => {
  it('renders the workspace review surface with spotlight and full queue sections', async () => {
    const { evidenceWorkspace, repository } =
      await buildWorkspaceViewFixtures();

    try {
      const html = renderToStaticMarkup(
        React.createElement(EvidenceReviewWorkspaceView, {
          workspace: evidenceWorkspace,
          filter: 'accepted',
          searchInput: 'benchmark',
          onFilterChange: vi.fn(),
          onSearchInputChange: vi.fn(),
        }),
      );

      expect(html).toContain('Imported evidence control surface');
      expect(html).toContain('Priority records');
      expect(html).toContain('Evidence catalog');
      expect(html).toContain('Open input deck');
      expect(html).toContain('Open review detail');
    } finally {
      await repository.disconnect();
    }
  });
});
