import Link from 'next/link';

import { requireAuthenticatedSession } from '@/lib/require-session';
import { RecentEvaluations } from '@/components/recent-evaluations';

export default async function HomePage() {
  const session = await requireAuthenticatedSession('/');

  return (
    <main>
      <section className="hero">
        <span className="badge">Auditable decision runtime</span>
        <h1>METREV decision-support runtime</h1>
        <p className="muted">
          Signed in as {session.user.email} with {session.user.role} access.
          Intake, normalization, deterministic evaluation, provenance capture,
          and history retrieval are connected through one authenticated runtime
          path grounded in the canonical domain and contract assets.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/cases/new">
            Start a case evaluation
          </Link>
          <Link className="button secondary" href="https://fastify.dev">
            Runtime stack reference
          </Link>
        </div>
      </section>

      <RecentEvaluations />
    </main>
  );
}
