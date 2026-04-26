import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/components/evidence-explorer/external-evidence-explorer', () => ({
  ExternalEvidenceExplorer: () => React.createElement('div', null, 'explorer'),
}));

vi.mock('@/components/evidence-review/external-evidence-review-board', () => ({
  ExternalEvidenceReviewBoard: () =>
    React.createElement('div', null, 'review-board'),
}));

vi.mock('@/components/evidence-detail/external-evidence-detail', () => ({
  ExternalEvidenceDetail: () => React.createElement('div', null, 'detail'),
}));

vi.mock('@/components/research/research-review-list', () => ({
  ResearchReviewListWorkspace: () =>
    React.createElement('div', null, 'research-list'),
}));

vi.mock('@/components/research/research-review-detail', () => ({
  ResearchReviewDetailWorkspace: () =>
    React.createElement('div', null, 'research-detail'),
}));

import ExternalEvidenceExplorerDetailPage from '../../apps/web-ui/src/app/evidence/explorer/[id]/page';
import ExternalEvidenceExplorerPage from '../../apps/web-ui/src/app/evidence/explorer/page';
import ExternalEvidenceReviewDetailPage from '../../apps/web-ui/src/app/evidence/review/[id]/page';
import ExternalEvidenceReviewPage from '../../apps/web-ui/src/app/evidence/review/page';
import ResearchReviewDetailPage from '../../apps/web-ui/src/app/research/reviews/[id]/page';
import ResearchReviewsPage from '../../apps/web-ui/src/app/research/reviews/page';

describe('advanced route pages', () => {
  it('shows the analyst-required state for viewer sessions on advanced/internal pages', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'user-viewer-001',
        email: 'viewer@metrev.local',
        role: 'VIEWER',
      },
      sessionId: 'session-viewer-001',
    });

    const pages = await Promise.all([
      ExternalEvidenceExplorerPage(),
      ExternalEvidenceReviewPage(),
      ExternalEvidenceExplorerDetailPage({
        params: Promise.resolve({ id: 'evidence-001' }),
      }),
      ExternalEvidenceReviewDetailPage({
        params: Promise.resolve({ id: 'evidence-001' }),
      }),
      ResearchReviewsPage(),
      ResearchReviewDetailPage({
        params: Promise.resolve({ id: 'review-001' }),
      }),
    ]);

    for (const page of pages) {
      const html = renderToStaticMarkup(page);
      expect(html).toContain('Analyst role required');
      expect(html).toContain('viewer@metrev.local');
      expect(html).toContain('Back to dashboard');
    }
  });
});
