import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

const useQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('accepted evidence selector', () => {
  it('renders the normalized workspace empty state when no accepted evidence is available', async () => {
    useQuery.mockReturnValue({
      data: {
        items: [],
      },
      error: null,
      isLoading: false,
    });

    const { AcceptedEvidenceSelector } =
      await import('../../apps/web-ui/src/components/accepted-evidence-selector');
    const html = renderToStaticMarkup(
      React.createElement(AcceptedEvidenceSelector, {
        actorRole: 'VIEWER',
        onSelectionChange: vi.fn(),
        selectedEvidence: [],
      }),
    );

    expect(html).toContain('No accepted catalog evidence');
    expect(html).toContain('saved reports and evaluation history');
    expect(html).not.toContain('Open evidence review queue');
    expect(html).not.toContain('/evidence/review');
  });
});
