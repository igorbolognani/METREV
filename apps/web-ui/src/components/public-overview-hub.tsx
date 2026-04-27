import Link from 'next/link';
import * as React from 'react';

import { PublicLandingInfographic } from '@/components/public-topic-infographics';
import { PublicTopicNav } from '@/components/public-topic-nav';
import { Badge } from '@/components/ui/badge';

void React;

function loginHref(callbackPath: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

const overviewSignals = [
  {
    title: 'Six separate public lenses',
    detail:
      'Problem, technology, stack, comparison, impact, and workflow are separated so each page can teach one concept clearly.',
  },
  {
    title: 'Code-built infographic boards',
    detail:
      'The visuals are organized as structured educational diagrams rather than decorative placeholders.',
  },
  {
    title: 'Same product, clearer public story',
    detail:
      'The public layer explains the scientific instrument without changing the signed-in evaluation workflow.',
  },
];

export function PublicOverviewHub() {
  return (
    <div className="public-route-hub" data-testid="public-overview-hub">
      <PublicTopicNav />

      <section className="public-route-hub__hero">
        <div className="public-route-hub__hero-copy">
          <Badge variant="info">Public educational layer</Badge>
          <p className="public-route-kicker">
            METREV - bioelectrochemical decision support
          </p>
          <h1>
            Explore the scientific instrument one engineering lens at a time.
          </h1>
          <p>
            The public front door now separates the BES story into six focused
            pages so each topic can be explained with one organized infographic
            instead of one overloaded scroll.
          </p>

          <div className="landing-actions landing-actions--prominent">
            <Link className="button" href="/login">
              Start evaluation
            </Link>
            <Link className="button secondary" href="#public-topic-rail">
              Browse the 6 lenses
            </Link>
          </div>
        </div>

        <div className="public-route-hub__facts">
          {overviewSignals.map((signal) => (
            <article className="public-route-hub__fact" key={signal.title}>
              <h2>{signal.title}</h2>
              <p>{signal.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-route-hub__topics" id="public-topic-rail">
        <div className="public-route-hub__topics-copy">
          <Badge variant="muted">Linear public infographic</Badge>
          <h2>
            Open each board for the fuller explanation, then use the header to
            jump into the dedicated page.
          </h2>
          <p>
            The landing page now keeps the public story in one readable
            sequence. Each board opens a floating explanation, while the fixed
            route bar stays available for direct navigation into the six
            dedicated topic pages.
          </p>
        </div>

        <PublicLandingInfographic />
      </section>

      <section className="public-route-hub__footer">
        <div>
          <Badge variant="muted">From public page to workspace</Badge>
          <h2>
            The public layer teaches the system. The workspace evaluates it.
          </h2>
          <p>
            Use the six public pages to understand the BES context, then open
            the signed-in workflow to configure a stack, compare treated data,
            inspect outputs, and generate a report-backed recommendation.
          </p>
        </div>

        <div className="landing-actions landing-actions--prominent">
          <Link className="button" href="/login">
            Login
          </Link>
          <Link className="button secondary" href={loginHref('/dashboard')}>
            Go to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
