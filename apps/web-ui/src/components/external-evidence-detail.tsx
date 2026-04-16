'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import {
    fetchExternalEvidenceCatalogItem,
    reviewExternalEvidenceCatalogItem,
} from '@/lib/api';

function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function prettyUnknown(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function ExternalEvidenceDetail({
  catalogItemId,
  canReview,
}: {
  catalogItemId: string;
  canReview: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['external-evidence', 'detail', catalogItemId],
    queryFn: () => fetchExternalEvidenceCatalogItem(catalogItemId),
  });

  const mutation = useMutation({
    mutationFn: (action: 'accept' | 'reject') =>
      reviewExternalEvidenceCatalogItem(catalogItemId, { action }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['external-evidence'],
      });
    },
  });

  if (query.isLoading) {
    return <p className="muted">Loading external-evidence detail...</p>;
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  if (!query.data) {
    return <p className="muted">The requested catalog item was not found.</p>;
  }

  const item = query.data;

  return (
    <div className="grid">
      <section className="hero cockpit-hero">
        <div className="stack split compact">
          <div className="section-group">
            <span className="badge">Evidence review detail</span>
            <h1>{item.title}</h1>
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

        <div className="hero-actions">
          <Link className="button secondary" href="/evidence/review">
            Back to queue
          </Link>
          <Link className="button secondary" href="/cases/new">
            Open case intake
          </Link>
        </div>

        {canReview ? (
          <div className="hero-actions">
            <button
              disabled={mutation.isPending || item.review_status === 'accepted'}
              type="button"
              onClick={() => mutation.mutate('accept')}
            >
              {mutation.isPending ? 'Saving review...' : 'Accept for intake'}
            </button>
            <button
              className="secondary"
              disabled={mutation.isPending || item.review_status === 'rejected'}
              type="button"
              onClick={() => mutation.mutate('reject')}
            >
              Reject for intake
            </button>
          </div>
        ) : (
          <p className="muted">
            This view is read-only for your role. Only analysts can change the
            review state.
          </p>
        )}

        {mutation.error ? (
          <p className="error">{mutation.error.message}</p>
        ) : null}
      </section>

      <div className="grid two">
        <section className="panel">
          <div>
            <span className="badge">Source metadata</span>
            <h2>Record posture</h2>
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
              <span className="muted">Source state</span>
              <strong>{formatToken(item.source_state)}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Publisher</span>
              <strong>{item.publisher ?? 'Not stated'}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">DOI</span>
              <strong>{item.doi ?? 'Not stated'}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Published</span>
              <strong>{item.published_at ?? 'Not stated'}</strong>
            </div>
          </div>
          <p className="muted">Provenance note: {item.provenance_note}</p>
          <div className="section-group">
            <h3>Tags</h3>
            <ul className="pill-list">
              {item.tags.map((tag: string) => (
                <li className="pill" key={tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div>
            <span className="badge">Applicability</span>
            <h2>Scope and abstract</h2>
          </div>
          <div className="detail-item">
            <span className="muted">Applicability scope</span>
            <pre className="code-block">
              {prettyUnknown(item.applicability_scope)}
            </pre>
          </div>
          <div className="detail-item">
            <span className="muted">Extracted claims</span>
            <pre className="code-block">
              {prettyUnknown(item.extracted_claims)}
            </pre>
          </div>
          <div className="detail-item">
            <span className="muted">Abstract text</span>
            <p>
              {item.abstract_text ??
                'No abstract text was stored for this record.'}
            </p>
          </div>
        </section>
      </div>

      <section className="panel">
        <details className="disclosure">
          <summary>Stored payload</summary>
          <div className="disclosure-content grid">
            <div className="detail-item">
              <span className="muted">Catalog payload</span>
              <pre className="code-block">{prettyUnknown(item.payload)}</pre>
            </div>
            <div className="detail-item">
              <span className="muted">Raw source payload</span>
              <pre className="code-block">
                {prettyUnknown(item.raw_payload)}
              </pre>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
