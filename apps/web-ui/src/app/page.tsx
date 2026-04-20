import Link from 'next/link';

import { DashboardWorkspace } from '@/components/dashboard-workspace';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function HomePage() {
  const session = await requireAuthenticatedSession('/');

  return (
    <main>
      <section className="hero workspace-banner">
        <div>
          <span className="badge">Authenticated runtime</span>
          <h1>METREV analyst workspace</h1>
          <p className="muted">
            Signed in as {session.user.email} with {session.user.role} access.
            The full analyst journey now starts from one denser workspace home
            for drafting, review, evidence control, and saved-run inspection.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button" href="/cases/new">
            Open input deck
          </Link>
          <Link className="button secondary" href="/evidence/review">
            Open evidence review
          </Link>
        </div>
      </section>

      <DashboardWorkspace />
    </main>
  );
}
