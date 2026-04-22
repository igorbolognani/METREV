import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { PublicLandingPage } from '../../apps/web-ui/src/components/public-landing';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('public landing page', () => {
  it('describes the live METREV routes, workflow, and audit posture without generic AI-first claims', () => {
    const html = renderToStaticMarkup(React.createElement(PublicLandingPage));

    expect(html).toContain(
      'Auditable decision-support for bioelectrochemical evaluation.',
    );
    expect(html).toContain('Current workspace map');
    expect(html).toContain('Input Deck');
    expect(html).toContain('Evidence Review');
    expect(html).toContain('All Evaluations');
    expect(html).toContain('Overview');
    expect(html).toContain('Roadmap &amp; Suppliers');
    expect(html).toContain('Defaults and missing data stay visible');
    expect(html).toContain('Not presented as live product scope');
    expect(html).toContain('/dashboard');
    expect(html).toContain('/login?callbackUrl=%2Fdashboard');
    expect(html).toContain('generic chat-first copilot');
  });
});
