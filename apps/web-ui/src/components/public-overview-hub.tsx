import Link from 'next/link';
import * as React from 'react';

import { PublicLandingInfographic } from '@/components/public-topic-infographics';
import { PublicTopicNav } from '@/components/public-topic-nav';

void React;

export function PublicOverviewHub() {
  return (
    <div className="public-route-hub" data-testid="public-overview-hub">
      <PublicTopicNav />

      <section className="public-route-hub__hero">
        <div className="public-route-hub__hero-copy">
          <h1 className="public-route-hub__hero-title">
            METREV BIOELETROCHEMICAL DECISION SUPPORT
          </h1>
          <p className="public-route-hub__hero-subtitle">
            Explore the scientific instrument one engineering lens at a time.
          </p>
          <p className="public-route-hub__hero-intro">
            Follow the same decision path METREV uses in practice: bound
            influent and operating uncertainty, distinguish the relevant BES
            family, anchor the configured stack, compare against baselines,
            frame defensible impact, and carry the result into a traceable
            report.
          </p>
        </div>

        <div className="public-route-hub__hero-actions">
          <div className="landing-actions landing-actions--prominent">
            <Link className="button" href="/login">
              <span>Start evaluation</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="public-route-hub__topics" id="public-topic-rail">
        <div className="public-route-hub__topics-copy">
          <h2>Linear Public Infographic</h2>
        </div>

        <PublicLandingInfographic />
      </section>
    </div>
  );
}
