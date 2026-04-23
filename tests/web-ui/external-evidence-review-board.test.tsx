import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { EvidenceReviewWorkspaceView } from '../../apps/web-ui/src/components/external-evidence-review-board';
import type { BulkEvidenceReviewSummary } from '../../apps/web-ui/src/lib/evidence-review-actions';
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
  it('renders the dense queue workflow with toolbar and review tables', async () => {
    const { evidenceWorkspace, repository } =
      await buildWorkspaceViewFixtures();
    const bulkResult: BulkEvidenceReviewSummary = {
      action: 'accept',
      attemptedIds: [],
      failed: [],
      succeededIds: [],
    };

    try {
      const html = renderToStaticMarkup(
        React.createElement(EvidenceReviewWorkspaceView, {
          bulkAction: null,
          bulkActionError: null,
          bulkDialogOpen: false,
          bulkNote: '',
          bulkResult,
          isBulkActionPending: false,
          onBulkDialogOpenChange: vi.fn(),
          onBulkNoteChange: vi.fn(),
          onClearSelection: vi.fn(),
          onConfirmBulkAction: vi.fn(),
          workspace: evidenceWorkspace,
          filter: 'accepted',
          onNextPage: vi.fn(),
          onPageSizeChange: vi.fn(),
          onPreviousPage: vi.fn(),
          onRequestBulkAction: vi.fn(),
          onResultDialogOpenChange: vi.fn(),
          searchInput: 'benchmark',
          onFilterChange: vi.fn(),
          onSearchInputChange: vi.fn(),
          onSelectAllVisible: vi.fn(),
          onSourceTypeChange: vi.fn(),
          onToggleSelection: vi.fn(),
          page: 1,
          pageSize: 25,
          resultDialogOpen: false,
          selectedIds: ['evidence-1'],
          sourceType: 'all',
          visibleItems: evidenceWorkspace.items,
          visibleSpotlight: evidenceWorkspace.spotlight,
          visibleSummary: evidenceWorkspace.summary,
        }),
      );

      expect(html).toContain('Imported evidence control surface');
      expect(html).toContain('Dense review workflow');
      expect(html).toContain('Select all visible');
      expect(html).toContain('Rows per page');
      expect(html).toContain('Source type');
      expect(html).toContain('Previous page');
      expect(html).toContain('Accept selected');
      expect(html).toContain('Priority records');
      expect(html).toContain('Evidence catalog');
      expect(html).toContain('Review State');
      expect(html).toContain('Open input deck');
      expect(html).toContain('Open review detail');
    } finally {
      await repository.disconnect();
    }
  });
});
