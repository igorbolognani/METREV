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
      <section className="hero workspace-banner">
        <span className="badge">Input workspace</span>
        <h1>Draft a new deterministic evaluation</h1>
        <p className="muted">
          Configure context, operating envelope, and supporting evidence in a
          denser drafting surface before handing the case into the decision
          workspace. Golden-case presets remain available for deterministic
          smoke validation.
        </p>
      </section>

      <CaseForm />
    </main>
  );
}
