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
      const catalogHtml = renderToStaticMarkup(
        React.createElement(EvidenceExplorerView, {
          activeTab: 'catalog',
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

      const facetsHtml = renderToStaticMarkup(
        React.createElement(EvidenceExplorerView, {
          activeTab: 'facets',
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
          onTabChange: vi.fn(),
          page: 1,
          pageSize: 25,
          searchInput: 'benchmark',
          sourceType: 'all',
          workspace: evidenceExplorerWorkspace,
        }),
      );

      const assistantHtml = renderToStaticMarkup(
        React.createElement(EvidenceExplorerView, {
          activeTab: 'assistant',
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
          onTabChange: vi.fn(),
          page: 1,
          pageSize: 25,
          searchInput: 'benchmark',
          sourceType: 'all',
          workspace: evidenceExplorerWorkspace,
        }),
      );

      const exportHtml = renderToStaticMarkup(
        React.createElement(EvidenceExplorerView, {
          activeTab: 'exports',
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
          onTabChange: vi.fn(),
          page: 1,
          pageSize: 25,
          searchInput: 'benchmark',
          sourceType: 'all',
          workspace: evidenceExplorerWorkspace,
        }),
      );

      expect(catalogHtml).toContain('Evidence explorer');
      expect(catalogHtml).toContain('Explorer layers');
      expect(catalogHtml).toContain('Catalog');
      expect(catalogHtml).toContain('Facets');
      expect(catalogHtml).toContain('Assistant');
      expect(catalogHtml).toContain('Exports');
      expect(catalogHtml).toContain('Curated spotlight');
      expect(catalogHtml).toContain('Intake-ready records');
      expect(catalogHtml).toContain('Recently published on this page');
      expect(catalogHtml).toContain('Full explorer catalog');
      expect(catalogHtml).toContain('Open review queue');
      expect(catalogHtml).toContain('Open evidence detail');

      expect(facetsHtml).toContain('Filtered warehouse snapshot');
      expect(facetsHtml).toContain('Source types');
      expect(assistantHtml).toContain('Warehouse-aware evidence briefing');
      expect(assistantHtml).toContain('Generate assistant brief');
      expect(exportHtml).toContain('Export current slice CSV');
      expect(exportHtml).toContain(
        'http://localhost:4000/api/exports/evidence/explorer/csv?status=accepted&amp;q=benchmark&amp;sourceType=crossref&amp;page=1&amp;pageSize=25',
      );
      expect(catalogHtml).toContain(
        '/evidence/explorer/catalog-item-accepted-001',
      );
    } finally {
      await repository.disconnect();
    }
  });
});
