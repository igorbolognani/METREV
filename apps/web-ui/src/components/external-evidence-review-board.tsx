'use client';

import { useDeferredValue, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import type { ExternalEvidenceReviewStatus } from '@metrev/domain-contracts';

import { PanelTabs } from '@/components/workbench/panel-tabs';
import { fetchExternalEvidenceCatalog } from '@/lib/api';

function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

type ReviewFilter = ExternalEvidenceReviewStatus | 'all';

const reviewTabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
] as const;

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
      <section className="hero workspace-masthead">
        <div>
          <span className="badge">Evidence review</span>
          <h1>Imported evidence control surface</h1>
          <p className="muted">
            Review imported literature metadata before it can enter the intake
            flow. Accepted records remain explicit and selectable; rejected or
            pending records stay blocked from deterministic evaluation.
          </p>
        </div>
        <div className="workspace-chip-list">
          <span className="meta-chip meta-chip--copper">review-gated</span>
          <span className="meta-chip">local-first evidence</span>
          <span className="meta-chip">intake-safe only</span>
        </div>
      </section>

      {query.data ? (
        <section
          className="workspace-summary-grid"
          aria-label="Evidence review overview"
        >
          <article className="workspace-summary-card workspace-summary-card--copper">
            <span>Pending review</span>
            <strong>{query.data.summary.pending}</strong>
            <p>
              Records blocked from intake until an analyst accepts or rejects
              them.
            </p>
          </article>
          <article className="workspace-summary-card">
            <span>Accepted</span>
            <strong>{query.data.summary.accepted}</strong>
            <p>Eligible for explicit intake selection.</p>
          </article>
          <article className="workspace-summary-card">
            <span>Rejected</span>
            <strong>{query.data.summary.rejected}</strong>
            <p>Kept visible for auditability, but excluded from intake.</p>
          </article>
          <article className="workspace-summary-card workspace-summary-card--wide">
            <span>Review posture</span>
            <strong>{query.data.summary.total} persisted records</strong>
            <p className="muted">
              Use this surface to decide whether imported records are strong
              enough and scoped enough to enter analyst drafting.
            </p>
            <Link className="button secondary" href="/cases/new">
              Open drafting workspace
            </Link>
          </article>
        </section>
      ) : null}

      <section className="panel grid">
        <div className="stack split compact">
          <div>
            <span className="badge">Queue filters</span>
            <h2>Search and triage</h2>
          </div>
          <div className="hero-actions">
            <Link className="button secondary" href="/cases/new">
              Open drafting workspace
            </Link>
          </div>
        </div>

        <div className="grid two workspace-filter-grid">
          <label>
            Search catalog
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="title, DOI, publisher, summary"
            />
          </label>
          <div className="section-group workspace-filter-tabs">
            <h3>Review state</h3>
            <PanelTabs
              activeTab={filter}
              label="Evidence review state"
              onChange={setFilter}
              tabs={reviewTabs}
            />
          </div>
        </div>

        {query.isLoading ? (
          <p className="muted">Loading external-evidence queue...</p>
        ) : query.error ? (
          <p className="error">{query.error.message}</p>
        ) : !query.data || query.data.items.length === 0 ? (
          <div className="workspace-empty-panel">
            <strong>No catalog items matched the current filter</strong>
            <p>
              Adjust the query or switch the review-state tab to widen the
              queue.
            </p>
          </div>
        ) : (
          <div className="workspace-card-grid workspace-card-grid--narrow">
            {query.data.items.map((item) => (
              <article className="workspace-card" key={item.id}>
                <div className="workspace-card__meta">
                  <span className="badge subtle">
                    {formatToken(item.review_status)}
                  </span>
                  <span className="muted">{formatToken(item.source_type)}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
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
                <div className="workspace-chip-list compact">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span className="meta-chip meta-chip--copper" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="hero-actions">
                  <Link
                    className="button secondary"
                    href={`/evidence/review/${item.id}`}
                  >
                    Open review detail
                  </Link>
                  <Link className="button secondary" href="/cases/new">
                    Intake surface
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
