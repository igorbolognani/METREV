import { describe, expect, it, vi } from 'vitest';

import { buildNavigationPaletteItems } from '../../apps/web-ui/src/components/command-palette';

describe('command palette navigation items', () => {
  it('hides admin intelligence routes from viewer users', () => {
    const onSelectHref = vi.fn();
    const items = buildNavigationPaletteItems({
      role: 'VIEWER',
      onSelectHref,
    });

    expect(items.map((item) => item.id)).toEqual([
      'home',
      'evaluate',
      'reports',
    ]);
    expect(
      items.some((item) => item.hint?.startsWith('/admin/intelligence')),
    ).toBe(false);
  });

  it('includes admin intelligence routes for analyst users', () => {
    const onSelectHref = vi.fn();
    const items = buildNavigationPaletteItems({
      role: 'ANALYST',
      onSelectHref,
    });

    expect(
      items
        .filter((item) => item.hint?.startsWith('/evidence'))
        .map((item) => item.hint),
    ).toEqual(['/evidence', '/evidence/quality', '/evidence/review']);

    items.find((item) => item.id === 'research')?.onSelect();
    expect(onSelectHref).toHaveBeenCalledWith('/research');
  });
});
