'use client';

import { useDeferredValue, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
    EvidenceReviewWorkspaceResponse,
    ExternalEvidenceReviewStatus,
} from '@metrev/domain-contracts';

import { PanelTabs } from '@/components/workbench/panel-tabs';
import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
import { fetchEvidenceReviewWorkspace } from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

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
    queryKey: ['evidence-review-workspace', filter, deferredSearch],
    queryFn: () =>
      fetchEvidenceReviewWorkspace({
        status: filter === 'all' ? undefined : filter,
        query: deferredSearch,
      }),
  });

  if (query.isLoading) {
    return (
      <div className="workspace-page">
        <WorkspaceSkeleton lines={6} />
      </div>
    );
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  const workspace = query.data;
  if (!workspace) {
    return (
      <WorkspaceEmptyState
        title="Evidence review unavailable"
        description="The evidence review workspace payload could not be loaded."
      />
    );
  }

  return (
    <EvidenceReviewWorkspaceView
      filter={filter}
      onFilterChange={setFilter}
      onSearchInputChange={setSearchInput}
      searchInput={searchInput}
      workspace={workspace}
    />
  );
}

export function EvidenceReviewWorkspaceView({
  workspace,
  filter,
  searchInput,
  onFilterChange,
  onSearchInputChange,
}: {
  workspace: EvidenceReviewWorkspaceResponse;
  filter: ReviewFilter;
  searchInput: string;
  onFilterChange: (nextFilter: ReviewFilter) => void;
  onSearchInputChange: (nextValue: string) => void;
}) {
  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Evidence review"
        title="Imported evidence control surface"
        description="Review imported records before they can enter intake. Accepted items remain explicit and selectable; rejected and pending records stay blocked from deterministic evaluation."
        chips={[
          `${workspace.summary.pending} pending`,
          `${workspace.summary.accepted} accepted`,
          `${workspace.summary.rejected} rejected`,
        ]}
        actions={
          <Link className="button secondary" href="/cases/new">
            Open input deck
          </Link>
        }
      />

      <section className="workspace-stats-grid">
        <WorkspaceStatCard
          label="Pending review"
          value={workspace.summary.pending}
          detail="Records blocked from intake until an analyst accepts or rejects them."
          tone="warning"
        />
        <WorkspaceStatCard
          label="Accepted"
          value={workspace.summary.accepted}
          detail="Eligible for explicit attachment in the input deck."
          tone="success"
        />
        <WorkspaceStatCard
          label="Rejected"
          value={workspace.summary.rejected}
          detail="Visible for auditability, but excluded from intake."
        />
        <WorkspaceStatCard
          label="Catalog total"
          value={workspace.summary.total}
          detail="All persisted external-evidence records currently stored in the local runtime."
          tone="accent"
        />
      </section>

      <WorkspaceSection
        eyebrow="Queue filters"
        title="Search and triage"
        description="Use one filter system for the whole review queue."
      >
        <div className="workspace-form-grid workspace-form-grid--two">
          <label>
            Search catalog
            <input
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              placeholder="title, DOI, publisher, summary"
            />
          </label>
          <div className="workspace-filter-tabs">
            <PanelTabs
              activeTab={filter}
              label="Evidence review state"
              onChange={onFilterChange}
              tabs={reviewTabs}
            />
          </div>
        </div>
      </WorkspaceSection>

      <div className="workspace-split-grid">
        <WorkspaceSection
          eyebrow="Spotlight"
          title="Priority records"
          description="The first items in the queue are surfaced here for fast triage."
        >
          {workspace.spotlight.length > 0 ? (
            <div className="workspace-card-list">
              {workspace.spotlight.map((item) => (
                <WorkspaceDataCard key={item.id}>
                  <div className="workspace-data-card__header">
                    <div>
                      <span className="badge subtle">
                        {formatToken(item.review_status)}
                      </span>
                      <h3>{item.title}</h3>
                    </div>
                    <span className="meta-chip">
                      {formatToken(item.source_type)}
                    </span>
                  </div>
                  <p>{item.summary}</p>
                  <div className="workspace-action-row">
                    <Link
                      className="ghost-button"
                      href={`/evidence/review/${item.id}`}
                    >
                      Open review detail
                    </Link>
                  </div>
                </WorkspaceDataCard>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState
              title="No spotlight items"
              description="No records match the current filter."
            />
          )}
        </WorkspaceSection>

        <WorkspaceSection
          eyebrow="Full queue"
          title="Evidence catalog"
          description="Every record remains explicit and reviewable."
        >
          {workspace.items.length > 0 ? (
            <div className="workspace-card-list">
              {workspace.items.map((item) => (
                <WorkspaceDataCard key={item.id}>
                  <div className="workspace-data-card__header">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                    </div>
                    <span className="meta-chip">
                      {formatToken(item.strength_level)}
                    </span>
                  </div>
                  <div className="workspace-chip-list compact">
                    <span className="meta-chip">
                      {formatToken(item.review_status)}
                    </span>
                    <span className="meta-chip">
                      {formatToken(item.evidence_type)}
                    </span>
                    <span className="meta-chip">
                      {formatToken(item.source_type)}
                    </span>
                  </div>
                  <div className="workspace-action-row">
                    <Link
                      className="ghost-button"
                      href={`/evidence/review/${item.id}`}
                    >
                      Open detail
                    </Link>
                  </div>
                </WorkspaceDataCard>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState
              title="No catalog items"
              description="Adjust the current filter to widen the queue."
            />
          )}
        </WorkspaceSection>
      </div>
    </div>
  );
}
