import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { PrimaryNav } from '../../apps/web-ui/src/components/primary-nav';
import {
    NAV_ITEMS,
    buildBreadcrumbs,
    getNavItemsForRole,
} from '../../apps/web-ui/src/lib/navigation';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('navigation registry', () => {
  it('registers the global destinations in the expected order', () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
      'dashboard',
      'input-deck',
      'evaluations',
      'reports',
      'evidence-explorer',
      'evidence-review',
      'research-tables',
    ]);

    expect(NAV_ITEMS.find((item) => item.id === 'evaluations')?.disabled).toBe(
      undefined,
    );

    expect(getNavItemsForRole('VIEWER').map((item) => item.id)).toEqual([
      'dashboard',
      'input-deck',
      'evaluations',
      'reports',
    ]);
  });

  it('builds breadcrumbs for all required route patterns', () => {
    expect(buildBreadcrumbs('/dashboard', {})).toEqual([]);

    expect(buildBreadcrumbs('/cases/new', {})).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
    ]);

    expect(buildBreadcrumbs('/cases/new/submitting', {})).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/cases/new', label: 'Configure Stack' },
    ]);

    expect(
      buildBreadcrumbs('/cases/CASE-001/history', { caseId: 'CASE-001' }),
    ).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/cases/CASE-001/history', label: 'Case #CASE-001' },
    ]);

    expect(buildBreadcrumbs('/evaluations', {})).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
    ]);

    expect(buildBreadcrumbs('/evidence/explorer', {})).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
    ]);

    expect(
      buildBreadcrumbs('/evidence/explorer/evidence-001', {
        id: 'evidence-001',
      }),
    ).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evidence/explorer', label: 'Evidence Explorer' },
      { label: '#evidence-001' },
    ]);

    expect(
      buildBreadcrumbs('/evaluations/eval-001', { id: 'eval-001' }),
    ).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      { label: '#eval-001' },
    ]);

    expect(
      buildBreadcrumbs('/evaluations/eval-001/report', { id: 'eval-001' }),
    ).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      { href: '/evaluations/eval-001', label: '#eval-001' },
      { label: 'Report' },
    ]);

    expect(
      buildBreadcrumbs('/evaluations/eval-001/compare/eval-000', {
        baselineId: 'eval-000',
        id: 'eval-001',
      }),
    ).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      { href: '/evaluations/eval-001', label: '#eval-001' },
      { label: 'Compare' },
    ]);

    expect(buildBreadcrumbs('/evidence/review', {})).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
    ]);

    expect(buildBreadcrumbs('/research/reviews', {})).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
    ]);

    expect(
      buildBreadcrumbs('/research/reviews/review-001', { id: 'review-001' }),
    ).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/research/reviews', label: 'Research Tables' },
      { label: '#review-001' },
    ]);

    expect(
      buildBreadcrumbs('/evidence/review/evidence-001', { id: 'evidence-001' }),
    ).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/evidence/review', label: 'Evidence Review' },
      { label: '#evidence-001' },
    ]);
  });

  it('renders client and admin navigation groups for analyst users', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryNav, { role: 'ANALYST' }),
    );

    expect(html).toContain('Client workspace');
    expect(html).toContain('Admin intelligence');
    expect(html).toContain('Configure Stack');
    expect(html).toContain('Evidence Explorer');
    expect(html).toContain('Research Tables');
  });
});
