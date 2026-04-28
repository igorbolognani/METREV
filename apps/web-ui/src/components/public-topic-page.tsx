import Link from 'next/link';
import * as React from 'react';

import type { PublicTopicConfig } from '@/components/public-topic-content';
import {
  PUBLIC_TOPIC_PAGES,
  getPublicTopicHref,
} from '@/components/public-topic-content';
import { PublicTopicInfographic } from '@/components/public-topic-infographics';
import { PublicTopicNav } from '@/components/public-topic-nav';

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

      <section className="public-route-topic__canvas">
        <PublicTopicInfographic topic={topic} />
      </section>

      <section className="public-route-topic__details">
        <article className="public-route-topic__detail">
          <span>Why this page matters</span>
          <h2>{topic.questionTitle}</h2>
          <p>{topic.heroLead}</p>
          <p>{topic.questionLead}</p>
        </article>

        <article className="public-route-topic__detail">
          <span>Within METREV</span>
          <p>{topic.footerNote}</p>
        </article>
      </section>

      <section className="public-route-topic__footer">
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
