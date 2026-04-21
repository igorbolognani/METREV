import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, buildBreadcrumbs } from '../../apps/web-ui/src/lib/navigation';

describe('navigation registry', () => {
  it('registers the four global destinations in the expected order', () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
      'dashboard',
      'input-deck',
      'evidence-review',
      'evaluations',
    ]);
  });

  it('builds breadcrumbs for all required route patterns', () => {
    expect(buildBreadcrumbs('/', {})).toEqual([]);

    expect(buildBreadcrumbs('/cases/new', {})).toEqual([
      { href: '/', label: 'Dashboard' },
    ]);

    expect(buildBreadcrumbs('/cases/new/submitting', {})).toEqual([
      { href: '/', label: 'Dashboard' },
      { href: '/cases/new', label: 'Input Deck' },
    ]);

    expect(
      buildBreadcrumbs('/cases/CASE-001/history', { caseId: 'CASE-001' }),
    ).toEqual([
      { href: '/', label: 'Dashboard' },
      { href: '/cases/CASE-001/history', label: 'Case #CASE-001' },
    ]);

    expect(buildBreadcrumbs('/evaluations', {})).toEqual([
      { href: '/', label: 'Dashboard' },
    ]);

    expect(buildBreadcrumbs('/evaluations/eval-001', { id: 'eval-001' })).toEqual([
      { href: '/', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      { label: '#eval-001' },
    ]);

    expect(
      buildBreadcrumbs('/evaluations/eval-001/report', { id: 'eval-001' }),
    ).toEqual([
      { href: '/', label: 'Dashboard' },
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
      { href: '/', label: 'Dashboard' },
      { href: '/evaluations', label: 'Evaluations' },
      { href: '/evaluations/eval-001', label: '#eval-001' },
      { label: 'Compare' },
    ]);

    expect(buildBreadcrumbs('/evidence/review', {})).toEqual([
      { href: '/', label: 'Dashboard' },
    ]);

    expect(buildBreadcrumbs('/evidence/review/evidence-001', { id: 'evidence-001' })).toEqual([
      { href: '/', label: 'Dashboard' },
      { href: '/evidence/review', label: 'Evidence Review' },
      { label: '#evidence-001' },
    ]);
  });
});