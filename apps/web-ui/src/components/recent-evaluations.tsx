'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { fetchEvaluationList } from '@/lib/api';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function RecentEvaluations() {
  const query = useQuery({
    queryKey: ['evaluations'],
    queryFn: fetchEvaluationList,
  });

  if (query.isLoading) {
    return <p className="muted">Loading recent evaluations...</p>;
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  if (!query.data || query.data.items.length === 0) {
    return (
      <div className="panel">
        <h2>Recent evaluations</h2>
        <p className="muted">
          No decision runs have been stored yet. Start a case to populate the
          recent activity feed.
        </p>
      </div>
    );
  }

  return (
    <section className="panel grid">
      <div className="stack split">
        <div>
          <span className="badge">Recent activity</span>
          <h2>Stored evaluation runs</h2>
        </div>
        <Link className="button secondary" href="/cases/new">
          New evaluation
        </Link>
      </div>

      <ul className="list">
        {query.data.items.map((item) => (
          <li key={item.evaluation_id}>
            <div className="stack split compact">
              <span className="badge">{item.confidence_level} confidence</span>
              <span className="muted">{formatTimestamp(item.created_at)}</span>
            </div>
            <h3>{item.case_id}</h3>
            <p>{item.summary}</p>
            <p className="muted">
              {item.technology_family} for {item.primary_objective}
            </p>
            <p className="muted">
              Model status:{' '}
              {item.simulation_summary
                ? item.simulation_summary.status
                : 'unavailable'}
            </p>
            <div className="hero-actions">
              <Link
                className="button secondary"
                href={`/evaluations/${item.evaluation_id}`}
              >
                Open evaluation
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
