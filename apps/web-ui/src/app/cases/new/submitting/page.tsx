import Link from 'next/link';

import { IntakeSubmittingScreen } from '@/components/intake-submitting-screen';
import { requireRoleSession } from '@/lib/require-session';

export default async function CaseSubmittingPage() {
  const { session, authorized } = await requireRoleSession(
    '/cases/new/submitting',
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
            and monitor new case evaluations.
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
      <IntakeSubmittingScreen />
    </main>
  );
}
