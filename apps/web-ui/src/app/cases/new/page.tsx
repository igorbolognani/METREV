import Link from 'next/link';

import { CaseForm } from '@/components/case-form';
import { requireRoleSession } from '@/lib/require-session';

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
            <Link className="button secondary" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <CaseForm />
    </main>
  );
}
