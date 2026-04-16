'use client';

import { useDeferredValue, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import type { ExternalEvidenceReviewStatus } from '@metrev/domain-contracts';

import { fetchExternalEvidenceCatalog } from '@/lib/api';

function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

type ReviewFilter = ExternalEvidenceReviewStatus | 'all';

export function ExternalEvidenceReviewBoard() {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);

  const query = useQuery({
    queryKey: ['external-evidence', 'review-board', filter, deferredSearch],
    queryFn: () =>
      fetchExternalEvidenceCatalog({
        status: filter === 'all' ? undefined : filter,
        query: deferredSearch,
      }),
  });

  return (
    <div className="grid">
      <section className="hero cockpit-hero">
        <div className="stack split compact">
          <div className="section-group">
            <span className="badge">Evidence review queue</span>
            <h1>Imported catalog control surface</h1>
            <p className="muted">
              Review imported literature metadata before it can enter the case
              intake flow. The gate is explicit: analysts accept or reject, then
              accepted records become eligible for intake selection.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button secondary" href="/cases/new">
              Open case intake
            </Link>
          </div>
        </div>

        {query.data ? (
          <div className="cockpit-strip">
            <article className="metric-card">
              <span className="muted">Total catalog items</span>
              <strong>{query.data.summary.total}</strong>
              <p className="muted">Persisted imported records</p>
            </article>
            <article className="metric-card">
              <span className="muted">Pending review</span>
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
              <p className="muted">Explicitly excluded from intake</p>
            </article>
          </div>
        ) : null}
      </section>

      <section className="panel grid">
        <div className="grid two">
          <label>
            Search catalog
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="title, DOI, publisher, summary"
            />
          </label>
          <div className="section-group">
            <h3>Filter by review state</h3>
            <div className="hero-actions">
              {(['all', 'pending', 'accepted', 'rejected'] as const).map(
                (value) => (
                  <button
                    className={filter === value ? '' : 'secondary'}
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                  >
                    {formatToken(value)}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {query.isLoading ? (
          <p className="muted">Loading external-evidence queue...</p>
        ) : query.error ? (
          <p className="error">{query.error.message}</p>
        ) : !query.data || query.data.items.length === 0 ? (
          <p className="muted empty-state">
            No catalog items matched the current filter.
          </p>
        ) : (
          <div className="lens-stack">
            {query.data.items.map((item) => (
              <article className="lens-card" key={item.id}>
                <div className="stack split compact">
                  <div className="section-group">
                    <h3>{item.title}</h3>
                    <p className="muted">{item.summary}</p>
                  </div>
                  <div className="stack compact">
                    <span className="badge subtle">
                      {formatToken(item.review_status)}
                    </span>
                    <span className="badge subtle">
                      {formatToken(item.source_type)}
                    </span>
                  </div>
                </div>
                <div className="detail-grid two-columns">
                  <div className="detail-item">
                    <span className="muted">Evidence type</span>
                    <strong>{formatToken(item.evidence_type)}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Strength</span>
                    <strong>{formatToken(item.strength_level)}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Publisher</span>
                    <strong>{item.publisher ?? 'Not stated'}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Published</span>
                    <strong>{item.published_at ?? 'Not stated'}</strong>
                  </div>
                </div>
                <div className="section-group">
                  <h4>Tags</h4>
                  <ul className="pill-list">
                    {item.tags.map((tag) => (
                      <li className="pill" key={tag}>
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="hero-actions">
                  <Link
                    className="button secondary"
                    href={`/evidence/review/${item.id}`}
                  >
                    Open review detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
