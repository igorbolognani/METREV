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
      'Engineer better bioelectrochemical systems from evidence, not guesswork.',
    );
    expect(html).toContain('Dashboard, Configure Stack, Evaluations, Reports');
    expect(html).toContain('Configure stack');
    expect(html).toContain(
      'Generate a report-ready recommendation with traceable rationale.',
    );
    expect(html).toContain('Ask this report');
    expect(html).toContain(
      'Evidence review, research tables, ingestion, and raw audit tools remain available for internal/advanced users',
    );
    expect(html).toContain('/login?callbackUrl=%2Fdashboard');
    expect(html).not.toContain('AI-first');
    expect(html).not.toContain('generic chat-first copilot');
  });
});
