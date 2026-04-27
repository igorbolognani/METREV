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
  it('renders the problem topic with an active nav state and infographic callout panels', () => {
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
    expect(html).toContain('Wastewater BES decision');
    expect(html).toContain('Read the pressure map from stream to deployment.');
    expect(html).toContain('influent reality');
    expect(html).toContain('biofilm response');
    expect(html).toContain('Influent chemistry');
    expect(html).toContain('Biofilm stability');
    expect(html).toContain('Scale-up economics');
    expect(html).toContain('Within METREV');
    expect(html).toContain('/learn/technology');
    expect(html).toContain('/login');
  });
});
