import Link from 'next/link';

import { requireRoleSession } from '@/lib/require-session';
import { CaseForm } from '@/components/case-form';

export default async function NewCasePage() {
  const { session, authorized } = await requireRoleSession(
    '/cases/new',
    'ANALYST',
  );

  if (!authorized) {
    return (
      <main>
        <section className="panel">
          <span className="badge">Access policy</span>
          <h1>Analyst role required</h1>
          <p className="muted">
            {session.user.email} is authenticated, but only analysts can submit
            new case evaluations. Read-only access remains available through the
            persisted history views.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/">
              Back to dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="panel">
        <span className="badge">Case intake</span>
        <h1>New decision run</h1>
        <p className="muted">
          This form intentionally surfaces only a minimal slice. The runtime
          still records defaults, missing data, and confidence changes before
          presenting a recommendation package. A validated wastewater-treatment
          golden-case preset is available below for deterministic smoke testing.
        </p>
        <CaseForm />
      </section>
    </main>
  );
}
