import * as React from 'react';

import Link from 'next/link';

void React;

export function AnalystRoleRequiredPanel({ email }: { email: string }) {
  return (
    <main>
      <section className="panel">
        <span className="badge">Access policy</span>
        <h1>Analyst role required</h1>
        <p className="muted">
          {email} is authenticated, but only analyst-level users can access this
          Advanced/Internal workspace. Dashboard, evaluations, and reports
          remain available.
        </p>
        <div className="hero-actions">
          <Link className="button secondary" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
