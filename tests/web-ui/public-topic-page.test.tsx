import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { getPublicTopicConfig } from '../../apps/web-ui/src/components/public-topic-content';
import { PublicTopicPage } from '../../apps/web-ui/src/components/public-topic-page';

let currentPathname = '/learn/problem';

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

describe('public topic page', () => {
  it('renders the problem topic with an active nav state and infographic-first topic layout', () => {
    currentPathname = '/learn/problem';

    const topic = getPublicTopicConfig('problem');

    if (!topic) {
      throw new Error('expected problem topic config');
    }

    const html = renderToStaticMarkup(
      React.createElement(PublicTopicPage, { topic }),
    );

    expect(html).toContain('Public topic routes');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(
      'See the full operating pressure around a bioelectrochemical decision.',
    );
    expect(html).toContain(
      'wastewater chemistry, conductivity, pH, temperature, hydraulic regime, biofilm maturity, transport losses, maintenance burden, and observability',
    );
    expect(html).toContain('Problem · Pressure map');
    expect(html).toContain('public-topic-board-problem-1');
    expect(html).toContain('public-topic-board-problem-6');
    expect(html).toContain('Influent chemistry');
    expect(html).toContain('Biofilm stability');
    expect(html).toContain('Evidence gaps');
    expect(html).toContain('Scale-up economics');
    expect(html).toContain('influent chemistry');
    expect(html).toContain('Why this page matters');
    expect(html).toContain('Frame the wastewater boundary first.');
    expect(html).toContain(
      'missing measurements, fouling exposure, startup uncertainty, and monitoring burden',
    );
    expect(html).toContain('Within METREV');
    expect(html).toContain('/learn/technology');
    expect(html).toContain('Back to overview');
  });
});
