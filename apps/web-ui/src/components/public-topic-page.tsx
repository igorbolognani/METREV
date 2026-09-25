import Link from 'next/link';
import * as React from 'react';

import { PublicArticleDiagram } from '@/components/public-article-diagram';
import { PUBLIC_TOPIC_ARTICLES } from '@/components/public-topic-articles';
import type { PublicArticleSource } from '@/components/public-topic-articles';
import { PublicModelProfileCatalog } from '@/components/public-model-profile-catalog';
import type { PublicTopicConfig } from '@/components/public-topic-content';
import {
  PUBLIC_TOPIC_PAGES,
  getPublicTopicHref,
} from '@/components/public-topic-content';
import { PublicTopicNav } from '@/components/public-topic-nav';

void React;

function loginHref(callbackPath: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

function sourceHref(source: PublicArticleSource) {
  if (source.doi) return `https://doi.org/${source.doi}`;
  return source.href;
}

export function PublicTopicPage({ topic }: { topic: PublicTopicConfig }) {
  const article = PUBLIC_TOPIC_ARTICLES[topic.slug];
  const topicIndex = PUBLIC_TOPIC_PAGES.findIndex(
    (candidate) => candidate.slug === topic.slug,
  );
  const previousTopic =
    topicIndex > 0 ? PUBLIC_TOPIC_PAGES[topicIndex - 1] : null;
  const nextTopic =
    topicIndex >= 0 && topicIndex < PUBLIC_TOPIC_PAGES.length - 1
      ? PUBLIC_TOPIC_PAGES[topicIndex + 1]
      : null;

  return (
    <div
      className="public-route-topic public-route-topic--editorial"
      data-testid={`public-topic-${topic.slug}`}
      data-topic={topic.slug}
    >
      <PublicTopicNav />

      <header className="public-article-hero">
        <div className="public-article-hero__copy">
          <p className="public-article-hero__eyebrow">
            METREV field guide <span aria-hidden="true">/</span>{' '}
            {topic.routeMarker}
          </p>
          <h1>{topic.heroTitle}</h1>
          <p className="public-article-hero__summary">{article.introduction}</p>
          <div className="public-article-hero__meta">
            <span>{article.readingTime}</span>
            <span>{article.sections.length} sections</span>
            <span>Evidence-led · source limits stated</span>
          </div>
        </div>
        <aside className="public-article-hero__aside">
          <span>Decision question</span>
          <h2>{topic.questionTitle}</h2>
          <p>{topic.questionLead}</p>
        </aside>
      </header>

      <div className="public-article-layout">
        <nav aria-label="On this page" className="public-article-toc">
          <p>On this page</p>
          <ol>
            {article.sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </a>
              </li>
            ))}
            {topic.slug === 'stack' ? (
              <li>
                <a href="#model-configurations">
                  <span>
                    {String(article.sections.length + 1).padStart(2, '0')}
                  </span>
                  Model configurations and architectures
                </a>
              </li>
            ) : null}
            <li>
              <a href="#sources">
                <span>↗</span>
                Sources and scope
              </a>
            </li>
          </ol>
          <p className="public-article-toc__note">
            Select a diagram node to inspect its assumptions and boundaries.
          </p>
        </nav>

        <main className="public-article-content">
          {article.sections.map((section, index) => (
            <section
              aria-labelledby={`${section.id}-title`}
              className="public-article-section"
              data-testid="public-article-section"
              id={section.id}
              key={section.id}
            >
              <div className="public-article-section__heading">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h2 id={`${section.id}-title`}>{section.title}</h2>
              </div>
              <div className="public-article-section__body">
                <div className="public-article-section__copy">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <div className="public-article-section__source-tags">
                    <span>Related sources</span>
                    {section.sources.map((sourceKey) => (
                      <span
                        className="public-article-section__source-tag"
                        key={sourceKey}
                      >
                        {sourceKey}
                      </span>
                    ))}
                  </div>
                </div>
                <PublicArticleDiagram
                  section={section}
                  topicSlug={topic.slug}
                />
              </div>
            </section>
          ))}

          {topic.slug === 'stack' ? <PublicModelProfileCatalog /> : null}

          <section
            aria-labelledby="sources-title"
            className="public-article-sources"
            id="sources"
          >
            <p className="public-article-sources__eyebrow">Traceable reading</p>
            <h2 id="sources-title">Sources, scope, and review status</h2>
            <p>
              These sources support the specific formulations, operating
              boundaries, or study observations named in the chapter. They do
              not establish that the current METREV solver reproduces their
              results. Candidate evidence stays separate from reviewed inputs.
            </p>
            <ul>
              {article.sources.map((source) => {
                const href = sourceHref(source);
                return (
                  <li key={source.doi || source.title}>
                    <div>
                      <strong>{source.citation}</strong>
                      <span>{source.title}</span>
                      <small>{source.role}</small>
                    </div>
                    {href ? (
                      <a href={href} rel="noreferrer" target="_blank">
                        {source.doi ? `DOI ${source.doi}` : 'Official source'}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="public-article-sources__policy">
              Journal rankings are scheme-, discipline-, and cycle-dependent.
              METREV records them only with their official context; a journal
              label does not approve an individual claim.
            </p>
          </section>

          <section className="public-route-topic__footer">
            <div className="public-route-topic__footer-note">
              <p>{topic.footerNote}</p>
            </div>
            <div className="public-route-topic__pager">
              {previousTopic ? (
                <Link
                  className="public-route-topic__pager-link public-route-topic__pager-link--muted"
                  href={getPublicTopicHref(previousTopic.slug)}
                >
                  Previous: {previousTopic.navLabel}
                </Link>
              ) : (
                <Link
                  className="public-route-topic__pager-link public-route-topic__pager-link--muted"
                  href="/"
                >
                  Back to overview
                </Link>
              )}
              {nextTopic ? (
                <Link
                  className="public-route-topic__pager-link"
                  href={getPublicTopicHref(nextTopic.slug)}
                >
                  Next: {nextTopic.navLabel}
                </Link>
              ) : (
                <Link
                  className="public-route-topic__pager-link"
                  href={loginHref('/home')}
                >
                  Open workspace
                </Link>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
