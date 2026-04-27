import Link from 'next/link';
import * as React from 'react';

import type { PublicTopicConfig } from '@/components/public-topic-content';
import {
  PUBLIC_TOPIC_PAGES,
  getPublicTopicHref,
} from '@/components/public-topic-content';
import { PublicTopicInfographic } from '@/components/public-topic-infographics';
import { PublicTopicNav } from '@/components/public-topic-nav';
import { Badge } from '@/components/ui/badge';

void React;

function loginHref(callbackPath: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

export function PublicTopicPage({ topic }: { topic: PublicTopicConfig }) {
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
      className="public-route-topic"
      data-testid={`public-topic-${topic.slug}`}
      data-topic={topic.slug}
    >
      <PublicTopicNav />

      <section className="public-route-topic__hero">
        <div className="public-route-topic__copy public-route-topic__copy--stacked">
          <Badge variant="info">{topic.heroEyebrow}</Badge>
          <p className="public-route-kicker">{topic.navLabel} page</p>
          <h1>{topic.heroTitle}</h1>
          <p className="public-route-topic__lead">{topic.heroLead}</p>

          <div className="public-route-topic__points">
            {topic.previewPoints.map((point) => (
              <span className="public-route-point" key={point}>
                {point}
              </span>
            ))}
          </div>

          <div className="landing-actions landing-actions--prominent">
            <Link className="button" href="/login">
              Start evaluation
            </Link>
            <Link className="button secondary" href="/">
              Back to overview
            </Link>
          </div>

          <div className="public-route-topic__support-grid">
            {topic.highlights.map((highlight) => (
              <article
                className="public-route-topic__support-card"
                key={highlight.title}
              >
                <h3>{highlight.title}</h3>
                <p>{highlight.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-route-topic__support public-route-topic__support--infographic">
        <div className="public-route-topic__intro">
          <Badge variant="muted">How to read this lens</Badge>
          <h2>{topic.questionTitle}</h2>
          <p>{topic.questionLead}</p>
        </div>

        <div className="public-route-topic__board">
          <PublicTopicInfographic topic={topic} />
        </div>
      </section>

      <section className="public-route-topic__footer">
        <article className="public-route-topic__footer-note">
          <span>Within METREV</span>
          <p>{topic.footerNote}</p>
        </article>

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
              href={loginHref('/dashboard')}
            >
              Open dashboard
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
