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
        summary: {
          accepted: 0,
          filtered_total: 0,
          page: 1,
          page_size: 25,
          pending: 0,
          rejected: 0,
          returned: 0,
          total: 0,
          total_pages: 1,
        },
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
    expect(html).toContain('Search accepted evidence');
    expect(html).toContain('System type');
    expect(html).toContain('Material');
    expect(html).toContain('Page 1 of 1');
    expect(html).toContain('saved reports and evaluation history');
    expect(html).not.toContain('Open evidence review queue');
    expect(html).not.toContain('/evidence/review');
  });

  it('requests a paged accepted evidence slice for stack cockpit selection', async () => {
    useQuery.mockReturnValue({
      data: {
        items: [],
        summary: {
          accepted: 42,
          filtered_total: 42,
          page: 1,
          page_size: 25,
          pending: 0,
          rejected: 0,
          returned: 25,
          total: 42,
          total_pages: 2,
        },
      },
      error: null,
      isLoading: false,
    });

    const { AcceptedEvidenceSelector } =
      await import('../../apps/web-ui/src/components/accepted-evidence-selector');
    renderToStaticMarkup(
      React.createElement(AcceptedEvidenceSelector, {
        actorRole: 'ANALYST',
        onSelectionChange: vi.fn(),
        selectedEvidence: [],
      }),
    );

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'external-evidence',
          'accepted-intake-selector',
          '',
          '',
          '',
          1,
        ],
      }),
    );
  });
});
