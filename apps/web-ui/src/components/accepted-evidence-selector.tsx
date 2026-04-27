'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { Role } from '@metrev/auth';
import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import { WorkspaceEmptyState } from '@/components/workspace-chrome';
import { fetchExternalEvidenceCatalog } from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

export function AcceptedEvidenceSelector({
  actorRole = 'VIEWER',
  selectedEvidence,
  onSelectionChange,
}: {
  actorRole?: Role;
  selectedEvidence: ExternalEvidenceCatalogItemSummary[];
  onSelectionChange: (items: ExternalEvidenceCatalogItemSummary[]) => void;
}) {
  const query = useQuery({
    queryKey: ['external-evidence', 'accepted-intake-selector'],
    queryFn: () => fetchExternalEvidenceCatalog({ status: 'accepted' }),
  });

  const selectedIds = new Set(selectedEvidence.map((item) => item.id));
  const canOpenInternalEvidence =
    actorRole === 'ANALYST' || actorRole === 'ADMIN';

  function toggleItem(item: ExternalEvidenceCatalogItemSummary) {
    if (selectedIds.has(item.id)) {
      onSelectionChange(
        selectedEvidence.filter((entry) => entry.id !== item.id),
      );
      return;
    }

    onSelectionChange([...selectedEvidence, item]);
  }

  return (
    <section className="panel nested-panel grid">
      <div className="stack split compact">
        <div>
          <span className="badge">Reviewed external evidence</span>
          <h2>Accepted catalog records</h2>
        </div>
        <span className="badge subtle">{selectedEvidence.length} selected</span>
      </div>
      <p className="muted">
        Only accepted catalog evidence can enter the intake flow. Selection is
        explicit and additive: reviewed catalog evidence is attached alongside
        any manual typed evidence you enter below.
      </p>

      {query.isLoading ? (
        <p className="muted">Loading accepted catalog evidence...</p>
      ) : query.error ? (
        <p className="error">{query.error.message}</p>
      ) : !query.data || query.data.items.length === 0 ? (
        <WorkspaceEmptyState
          description={
            canOpenInternalEvidence
              ? 'No accepted external-evidence records are available yet. Review the queue first before attaching catalog evidence to a case.'
              : 'No accepted external-evidence records are available yet. Internal evidence review stays with analyst workflows; use saved reports and evaluation history to trace accepted evidence after a run.'
          }
          primaryHref={canOpenInternalEvidence ? '/evidence/review' : undefined}
          primaryLabel={
            canOpenInternalEvidence ? 'Open evidence review queue' : undefined
          }
          title="No accepted catalog evidence"
        />
      ) : (
        <div className="preset-grid">
          {query.data.items.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <article
                className={`preset-card${isSelected ? ' active' : ''}`}
                key={item.id}
              >
                <div className="stack split compact">
                  <h3>{item.title}</h3>
                  <span className="badge subtle">
                    {formatToken(item.source_type)}
                  </span>
                </div>
                <p className="muted">{item.summary}</p>
                <div className="detail-grid two-columns">
                  <div className="detail-item">
                    <span className="muted">Strength</span>
                    <strong>{formatToken(item.strength_level)}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Publisher</span>
                    <strong>{item.publisher ?? 'Not stated'}</strong>
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
                  <button
                    className={isSelected ? '' : 'secondary'}
                    type="button"
                    onClick={() => toggleItem(item)}
                  >
                    {isSelected ? 'Included in intake' : 'Include evidence'}
                  </button>
                  {canOpenInternalEvidence ? (
                    <Link
                      className="button secondary"
                      href={`/evidence/review/${item.id}`}
                    >
                      Inspect record
                    </Link>
                  ) : (
                    <span className="muted">
                      Trace this evidence later through saved reports and audit
                      history.
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
