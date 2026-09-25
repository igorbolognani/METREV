import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from '../../apps/web-ui/node_modules/react-dom/server.node.js';

import { PUBLIC_TOPIC_ARTICLES } from '../../apps/web-ui/src/components/public-topic-articles';
import {
  PUBLIC_TOPIC_PAGES,
  getPublicTopicConfig,
} from '../../apps/web-ui/src/components/public-topic-content';
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

function pageMarkup(slug: string) {
  const topic = getPublicTopicConfig(slug);

  if (!topic) throw new Error(`expected topic config for ${slug}`);

  currentPathname = `/learn/${slug}`;
  return renderToStaticMarkup(React.createElement(PublicTopicPage, { topic }));
}

describe('public topic articles', () => {
  it('renders the problem chapter as long-form content with linked interactive diagrams', () => {
    const html = pageMarkup('problem');
    const article = PUBLIC_TOPIC_ARTICLES.problem;

    expect(html).toContain('Public topic routes');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('METREV field guide');
    expect(html).toContain('On this page');
    expect(html).toContain('Define the wastewater before the reactor');
    expect(html).toContain('A case starts with a measured boundary');
    expect(html).toContain(
      'Select each node to inspect what the boundary must specify.',
    );
    expect(html).toContain('public-article-diagram-define-the-wastewater');
    expect(html).toContain('public-article-diagram-node-1');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Sources, scope, and review status');
    expect(html).toContain('https://doi.org/10.1007/s10529-020-03050-5');
    expect(html).toContain('Back to overview');
    expect(html).toContain('/learn/technology');
    expect(
      (html.match(/data-testid="public-article-section"/g) ?? []).length,
    ).toBe(article.sections.length);
    expect((html.match(/class="public-article-diagram"/g) ?? []).length).toBe(
      article.sections.length,
    );
    expect(html).not.toContain('public-topic-infographic');
  });

  it('provides a substantial source-linked chapter and one interactive SVG per section on all six routes', () => {
    for (const topic of PUBLIC_TOPIC_PAGES) {
      const html = pageMarkup(topic.slug);
      const article = PUBLIC_TOPIC_ARTICLES[topic.slug];

      expect(html).toContain(`<h1>${topic.heroTitle}</h1>`);
      expect(article.sections.length).toBeGreaterThanOrEqual(5);
      expect(
        article.sections.every((section) => section.paragraphs.length === 3),
      ).toBe(true);
      expect((html.match(/class="public-article-diagram"/g) ?? []).length).toBe(
        article.sections.length,
      );
      expect(html).toContain('Sources, scope, and review status');
      const sourceWithDoi = article.sources.find((source) => source.doi);
      expect(sourceWithDoi).toBeDefined();
      expect(html).toContain(`https://doi.org/${sourceWithDoi?.doi}`);
    }
  });

  it('labels Impact consistently and explains that journal strata need an explicit scheme and cycle', () => {
    expect(
      PUBLIC_TOPIC_PAGES.find((topic) => topic.slug === 'impact')?.navLabel,
    ).toBe('Impact');
    const comparison = pageMarkup('comparison');

    expect(comparison).toContain(
      'A1–A4 may refer to historical CAPES Qualis Periódicos strata',
    );
    expect(comparison).toContain('A1–A8');
    expect(comparison).toContain(
      'https://www.gov.br/capes/pt-br/assuntos/noticias/avaliacao-da-producao-intelectual-e-ampliada',
    );
  });
});
