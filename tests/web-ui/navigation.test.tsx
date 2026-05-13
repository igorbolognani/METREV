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
  usePathname: () => '/home',
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
      'home',
      'evaluate',
      'reports',
      'evidence',
      'evidence-quality',
      'evidence-review',
      'research',
      'admin',
    ]);

    expect(NAV_ITEMS.find((item) => item.id === 'evaluate')?.disabled).toBe(
      undefined,
    );

    expect(getNavItemsForRole('VIEWER').map((item) => item.id)).toEqual([
      'home',
      'evaluate',
      'reports',
    ]);

    expect(getNavItemsForRole('VIEWER').some((item) => item.minimumRole)).toBe(
      false,
    );

    expect(
      getNavItemsForRole('ANALYST')
        .filter((item) => item.section === 'advanced')
        .map((item) => item.href),
    ).toEqual(['/evidence/quality', '/evidence/review']);
  });

  it('builds breadcrumbs for all required route patterns', () => {
    expect(buildBreadcrumbs('/dashboard', {})).toEqual([]);

    expect(buildBreadcrumbs('/cases/new', {})).toEqual([
      { href: '/home', label: 'Home' },
    ]);

    expect(buildBreadcrumbs('/cases/new/submitting', {})).toEqual([
      { href: '/home', label: 'Home' },
      { href: '/evaluate', label: 'Evaluate' },
    ]);

    expect(
      buildBreadcrumbs('/cases/CASE-001/history', { caseId: 'CASE-001' }),
    ).toEqual([
      { href: '/home', label: 'Home' },
      { href: '/cases/CASE-001/history', label: 'Case #CASE-001' },
    ]);

    expect(buildBreadcrumbs('/evaluations', {})).toEqual([
      { href: '/home', label: 'Home' },
    ]);

    expect(buildBreadcrumbs('/home', {})).toEqual([]);

    expect(buildBreadcrumbs('/evaluate', {})).toEqual([
      { href: '/home', label: 'Home' },
    ]);

    expect(buildBreadcrumbs('/evidence/quality', {})).toEqual([
      { href: '/home', label: 'Home' },
      { href: '/evidence', label: 'Evidence' },
    ]);

    expect(buildBreadcrumbs('/research', {})).toEqual([
      { href: '/home', label: 'Home' },
    ]);

    expect(
      buildBreadcrumbs('/admin/intelligence/evidence/explorer', {}),
    ).toEqual([
      { href: '/home', label: 'Home' },
      { label: 'Admin Intelligence' },
    ]);

    expect(
      buildBreadcrumbs('/admin/intelligence/evidence/explorer/evidence-001', {
        id: 'evidence-001',
      }),
    ).toEqual([
      { href: '/home', label: 'Home' },
      {
        href: '/admin/intelligence/evidence/explorer',
        label: 'Evidence Explorer',
      },
      { label: '#evidence-001' },
    ]);

    expect(
      buildBreadcrumbs('/evaluations/eval-001', { id: 'eval-001' }),
    ).toEqual([
      { href: '/home', label: 'Home' },
      { href: '/evaluations', label: 'Evaluations' },
      { label: '#eval-001' },
    ]);

    expect(
      buildBreadcrumbs('/evaluations/eval-001/report', { id: 'eval-001' }),
    ).toEqual([
      { href: '/home', label: 'Home' },
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
      { href: '/home', label: 'Home' },
      { href: '/evaluations', label: 'Evaluations' },
      { href: '/evaluations/eval-001', label: '#eval-001' },
      { label: 'Compare' },
    ]);

    expect(buildBreadcrumbs('/admin/intelligence/evidence/review', {})).toEqual(
      [{ href: '/home', label: 'Home' }, { label: 'Admin Intelligence' }],
    );

    expect(
      buildBreadcrumbs('/admin/intelligence/research/reviews', {}),
    ).toEqual([
      { href: '/home', label: 'Home' },
      { label: 'Admin Intelligence' },
    ]);

    expect(
      buildBreadcrumbs('/admin/intelligence/research/reviews/review-001', {
        id: 'review-001',
      }),
    ).toEqual([
      { href: '/home', label: 'Home' },
      {
        href: '/admin/intelligence/research/reviews',
        label: 'Research Tables',
      },
      { label: '#review-001' },
    ]);

    expect(
      buildBreadcrumbs('/admin/intelligence/evidence/review/evidence-001', {
        id: 'evidence-001',
      }),
    ).toEqual([
      { href: '/home', label: 'Home' },
      {
        href: '/admin/intelligence/evidence/review',
        label: 'Evidence Review',
      },
      { label: '#evidence-001' },
    ]);
  });

  it('renders client and admin navigation groups for analyst users', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrimaryNav, { role: 'ANALYST' }),
    );

    expect(html).toContain('Client workspace');
    expect(html).toContain('Admin intelligence');
    expect(html).toContain('Evaluate');
    expect(html).toContain('Evidence');
    expect(html).toContain('Research');
  });
});
