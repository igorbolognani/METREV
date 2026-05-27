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

vi.mock('@/components/evidence-quality/evidence-quality-workspace', () => ({
  EvidenceQualityWorkspace: () =>
    React.createElement('div', null, 'quality-workspace'),
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

import ExternalEvidenceExplorerDetailPage from '../../apps/web-ui/src/app/admin/intelligence/evidence/explorer/[id]/page';
import ExternalEvidenceExplorerPage from '../../apps/web-ui/src/app/admin/intelligence/evidence/explorer/page';
import AdminEvidenceQualityPage from '../../apps/web-ui/src/app/admin/intelligence/evidence/quality/page';
import ExternalEvidenceReviewDetailPage from '../../apps/web-ui/src/app/admin/intelligence/evidence/review/[id]/page';
import ExternalEvidenceReviewPage from '../../apps/web-ui/src/app/admin/intelligence/evidence/review/page';
import ResearchReviewDetailPage from '../../apps/web-ui/src/app/admin/intelligence/research/reviews/[id]/page';
import ResearchReviewsPage from '../../apps/web-ui/src/app/admin/intelligence/research/reviews/page';
import EvidenceWorkspacePage from '../../apps/web-ui/src/app/evidence/page';
import EvidenceQualityPage from '../../apps/web-ui/src/app/evidence/quality/page';
import EvidenceReviewPage from '../../apps/web-ui/src/app/evidence/review/page';
import ResearchWorkspacePage from '../../apps/web-ui/src/app/research/page';

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
      AdminEvidenceQualityPage(),
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
      expect(html).toContain('Back to home');
    }
  });

  it('redirects legacy evidence and research routes to admin intelligence pages', async () => {
    await expect(
      EvidenceWorkspacePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining('/admin/intelligence/evidence/explorer'),
    });
    await expect(
      EvidenceQualityPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining('/admin/intelligence/evidence/quality'),
    });
    await expect(
      EvidenceReviewPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining('/admin/intelligence/evidence/review'),
    });
    await expect(
      ResearchWorkspacePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining('/admin/intelligence/research/reviews'),
    });
  });

  it('preserves legacy route query filters when redirecting to admin intelligence pages', async () => {
    await expect(
      EvidenceReviewPage({
        searchParams: Promise.resolve({ status: 'accepted' }),
      }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining(
        '/admin/intelligence/evidence/review?status=accepted',
      ),
    });

    await expect(
      ResearchWorkspacePage({
        searchParams: Promise.resolve({
          status: 'completed',
          paper: 'fixture',
        }),
      }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining(
        '/admin/intelligence/research/reviews?status=completed&paper=fixture',
      ),
    });
  });
});
