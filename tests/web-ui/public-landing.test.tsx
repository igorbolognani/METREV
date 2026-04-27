import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { PublicOverviewHub } from '../../apps/web-ui/src/components/public-overview-hub';

let currentPathname = '/';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

describe('public landing page', () => {
  it('renders the public overview hub with links to the six infographic topic pages', () => {
    currentPathname = '/';

    const html = renderToStaticMarkup(React.createElement(PublicOverviewHub));

    expect(html).toContain('Public topic routes');
    expect(html).toContain('Overview');
    expect(html).toContain('METREV');
    expect(html).toContain(
      'Explore the scientific instrument one engineering lens at a time.',
    );
    expect(html).toContain('/learn/problem');
    expect(html).toContain('/learn/technology');
    expect(html).toContain('/learn/stack');
    expect(html).toContain('/learn/comparison');
    expect(html).toContain('/learn/impact');
    expect(html).toContain('/learn/metrev');
    expect(html).toContain(
      'The public front door now separates the BES story into six focused pages',
    );
    expect(html).toContain('Six separate public lenses');
    expect(html).toContain(
      'Map the real BES pressure before choosing a stack.',
    );
    expect(html).toContain('Pressure map');
    expect(html).toContain('Workflow instrument');
    expect(html).toContain(
      'See the full METREV workflow as one scientific instrument.',
    );
    expect(html).toContain(
      'The public layer teaches the system. The workspace evaluates it.',
    );
    expect(html).toContain('/login?callbackUrl=%2Fdashboard');
    expect(html).not.toContain('Client path after login');
    expect(html).not.toContain('AI-first');
    expect(html).not.toContain('generic chat-first copilot');
  });
});
