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
      const queueHtml = renderToStaticMarkup(
        React.createElement(EvidenceReviewWorkspaceView, {
          activeTab: 'queue',
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

      const selectedHtml = renderToStaticMarkup(
        React.createElement(EvidenceReviewWorkspaceView, {
          activeTab: 'selected',
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
          onTabChange: vi.fn(),
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

      expect(queueHtml).toContain('Evidence review queue');
      expect(queueHtml).toContain('Review layers');
      expect(queueHtml).toContain('Queue');
      expect(queueHtml).toContain('Selected');
      expect(queueHtml).toContain('Audit');
      expect(queueHtml).toContain('Dense review workflow');
      expect(queueHtml).toContain('Select all visible');
      expect(queueHtml).toContain('Rows per page');
      expect(queueHtml).toContain('Source type');
      expect(queueHtml).toContain('Previous page');
      expect(queueHtml).toContain('Accept selected');
      expect(queueHtml).toContain('Priority records');
      expect(queueHtml).toContain('Evidence catalog');
      expect(queueHtml).toContain('Review State');
      expect(queueHtml).toContain('Open stack cockpit');
      expect(queueHtml).toContain('Open review detail');

      expect(selectedHtml).toContain('Selected records');
      expect(selectedHtml).toContain('Selection review');
      expect(selectedHtml).toContain('No selected records');
    } finally {
      await repository.disconnect();
    }
  });
});
