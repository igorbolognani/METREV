'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';
import { useDeferredValue } from 'react';

import type { Role } from '@metrev/auth';
import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  const [searchInput, setSearchInput] = React.useState('');
  const [systemType, setSystemType] = React.useState('');
  const [material, setMaterial] = React.useState('');
  const [page, setPage] = React.useState(1);
  const deferredSearch = useDeferredValue(searchInput);
  const deferredMaterial = useDeferredValue(material);
  const query = useQuery({
    queryKey: [
      'external-evidence',
      'accepted-intake-selector',
      deferredSearch,
      systemType,
      deferredMaterial,
      page,
    ],
    queryFn: () =>
      fetchExternalEvidenceCatalog({
        status: 'accepted',
        query: deferredSearch,
        systemType: systemType || undefined,
        material: deferredMaterial || undefined,
        page,
        pageSize: 25,
      }),
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

  function handleSearchInputChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleSystemTypeChange(value: string) {
    setSystemType(value === 'all' ? '' : value);
    setPage(1);
  }

  function handleMaterialChange(value: string) {
    setMaterial(value);
    setPage(1);
  }

  const summary = query.data?.summary;

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

      <div className="workspace-form-grid workspace-form-grid--two">
        <Input
          className="workspace-form-field--wide"
          hint="Title, DOI, publisher, material, metric, or operating context"
          label="Search accepted evidence"
          onChange={(event) => handleSearchInputChange(event.target.value)}
          placeholder="carbon anode, MEC hydrogen, wastewater"
          value={searchInput}
        />
        <Select
          label="System type"
          onValueChange={handleSystemTypeChange}
          options={[
            { label: 'All accepted systems', value: 'all' },
            { label: 'MFC', value: 'MFC' },
            { label: 'MEC', value: 'MEC' },
            { label: 'MET', value: 'MET' },
            { label: 'BES', value: 'BES' },
          ]}
          value={systemType || 'all'}
        />
        <Input
          hint="Normalized or partial material name"
          label="Material"
          onChange={(event) => handleMaterialChange(event.target.value)}
          placeholder="carbon felt, platinum, membrane"
          value={material}
        />
      </div>

      {summary ? (
        <div className="workspace-action-row">
          <span className="meta-chip">
            Page {summary.page} of {summary.total_pages}; showing{' '}
            {summary.returned} of {summary.filtered_total} accepted match(es).
          </span>
          <button
            className="secondary"
            disabled={page <= 1}
            onClick={() =>
              setPage((currentValue) => Math.max(1, currentValue - 1))
            }
            type="button"
          >
            Previous page
          </button>
          <button
            className="secondary"
            disabled={page >= summary.total_pages}
            onClick={() =>
              setPage((currentValue) =>
                Math.min(summary.total_pages, currentValue + 1),
              )
            }
            type="button"
          >
            Next page
          </button>
        </div>
      ) : null}

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
          primaryHref={
            canOpenInternalEvidence
              ? '/admin/intelligence/evidence/review'
              : undefined
          }
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
                      href={`/admin/intelligence/evidence/review/${item.id}`}
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
