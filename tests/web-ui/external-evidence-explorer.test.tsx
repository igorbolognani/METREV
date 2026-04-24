import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { EvidenceExplorerView } from '../../apps/web-ui/src/components/external-evidence-explorer';
import { buildWorkspaceViewFixtures } from '../fixtures/workspace-view-fixtures';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('external evidence explorer', () => {
  it('renders the read-first evidence explorer with spotlight and explorer detail links', async () => {
    const { evidenceExplorerWorkspace, repository } =
      await buildWorkspaceViewFixtures();

    try {
      const html = renderToStaticMarkup(
        React.createElement(EvidenceExplorerView, {
          assistant: null,
          assistantError: null,
          assistantRequested: false,
          assistantRunning: false,
          filter: 'all',
          onFilterChange: vi.fn(),
          onNextPage: vi.fn(),
          onPageSizeChange: vi.fn(),
          onPreviousPage: vi.fn(),
          onRequestAssistant: vi.fn(),
          onSearchInputChange: vi.fn(),
          onSourceTypeChange: vi.fn(),
          page: 1,
          pageSize: 25,
          searchInput: 'benchmark',
          sourceType: 'all',
          workspace: evidenceExplorerWorkspace,
        }),
      );

      expect(html).toContain('Evidence intelligence explorer');
      expect(html).toContain('Generate assistant brief');
      expect(html).toContain('Export current slice CSV');
      expect(html).toContain('Warehouse facets');
      expect(html).toContain('Filtered warehouse snapshot');
      expect(html).toContain('Source types');
      expect(html).toContain('Warehouse-aware evidence briefing');
      expect(html).toContain('Curated spotlight');
      expect(html).toContain('Intake-ready records');
      expect(html).toContain('Recently published on this page');
      expect(html).toContain('Full explorer catalog');
      expect(html).toContain('Open review queue');
      expect(html).toContain('Open evidence detail');
      expect(html).toContain(
        'http://localhost:4000/api/exports/evidence/explorer/csv?status=accepted&amp;q=benchmark&amp;sourceType=crossref&amp;page=1&amp;pageSize=25',
      );
      expect(html).toContain('/evidence/explorer/catalog-item-accepted-001');
    } finally {
      await repository.disconnect();
    }
  });
});
