'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { fetchExternalEvidenceCatalog } from '@/lib/api';

export function ExternalEvidenceQueue() {
  const query = useQuery({
    queryKey: ['external-evidence', 'dashboard-queue'],
    queryFn: () => fetchExternalEvidenceCatalog({ status: 'pending' }),
  });

  if (query.isLoading) {
    return <p className="muted">Loading evidence review queue...</p>;
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  if (!query.data) {
    return null;
  }

  return (
    <section className="panel grid">
      <div className="stack split compact">
        <div>
          <span className="badge">Evidence queue</span>
          <h2>Imported catalog review</h2>
        </div>
        <Link className="button secondary" href="/evidence/review">
          Open review queue
        </Link>
      </div>

      <div className="cockpit-strip">
        <article className="metric-card">
          <span className="muted">Pending</span>
          <strong>{query.data.summary.pending}</strong>
          <p className="muted">Records blocked from intake</p>
        </article>
        <article className="metric-card">
          <span className="muted">Accepted</span>
          <strong>{query.data.summary.accepted}</strong>
          <p className="muted">Eligible for intake selection</p>
        </article>
        <article className="metric-card">
          <span className="muted">Rejected</span>
          <strong>{query.data.summary.rejected}</strong>
          <p className="muted">Explicitly excluded</p>
        </article>
      </div>

      {query.data.items.length > 0 ? (
        <div className="lens-stack">
          {query.data.items.slice(0, 2).map((item) => (
            <article className="lens-card" key={item.id}>
              <div className="stack split compact">
                <h3>{item.title}</h3>
                <span className="badge subtle">pending</span>
              </div>
              <p className="muted">{item.summary}</p>
              <div className="hero-actions">
                <Link
                  className="button secondary"
                  href={`/evidence/review/${item.id}`}
                >
                  Review record
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted empty-state">
          No pending catalog evidence is waiting for review.
        </p>
      )}
    </section>
  );
}
