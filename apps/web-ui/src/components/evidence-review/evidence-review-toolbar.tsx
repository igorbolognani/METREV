'use client';

import type { ExternalEvidenceReviewAction } from '@metrev/domain-contracts';
import * as React from 'react';

import type { EvidenceReviewFilter } from '@/lib/evidence-review-query-state';

import { Input } from '@/components/ui/input';
import { PanelTabs } from '@/components/workbench/panel-tabs';
import { WorkspaceDataCard } from '@/components/workspace-chrome';

void React;

const reviewFilters = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
] as const satisfies ReadonlyArray<{
  id: EvidenceReviewFilter;
  label: string;
}>;

export interface EvidenceReviewToolbarProps {
  filter: EvidenceReviewFilter;
  onClearSelection: () => void;
  onFilterChange: (nextFilter: EvidenceReviewFilter) => void;
  onRequestBulkAction: (action: ExternalEvidenceReviewAction) => void;
  onSearchInputChange: (nextValue: string) => void;
  onSelectAllVisible: () => void;
  searchInput: string;
  selectedCount: number;
  totalCount: number;
  visibleCount: number;
  visibleSummary: {
    accepted: number;
    pending: number;
    rejected: number;
    total: number;
  };
}

export function EvidenceReviewToolbar({
  filter,
  onClearSelection,
  onFilterChange,
  onRequestBulkAction,
  onSearchInputChange,
  onSelectAllVisible,
  searchInput,
  selectedCount,
  totalCount,
  visibleCount,
  visibleSummary,
}: EvidenceReviewToolbarProps) {
  return (
    <WorkspaceDataCard>
      <div className="workspace-data-card__header">
        <div>
          <span className="badge subtle">Queue controls</span>
          <h3>Dense review workflow</h3>
        </div>
        <span className="meta-chip">{selectedCount} selected</span>
      </div>

      <div className="evidence-review-toolbar">
        <div className="evidence-review-toolbar__filters">
          <Input
            className="workspace-form-field--wide"
            hint="Title, DOI, publisher, category, or summary"
            label="Search catalog"
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder="benchmark, wastewater, doi, publisher"
            value={searchInput}
          />
          <PanelTabs
            activeTab={filter}
            label="Evidence review state"
            onChange={onFilterChange}
            tabs={reviewFilters.map((entry) => ({
              badge:
                entry.id === 'all'
                  ? visibleSummary.total
                  : visibleSummary[entry.id],
              id: entry.id,
              label: entry.label,
            }))}
          />
        </div>

        <div className="evidence-review-toolbar__actions">
          <p className="evidence-review-toolbar__summary">
            Showing {visibleCount} of {totalCount} records. Select visible rows
            to batch review without hiding partial failures.
          </p>
          <div className="evidence-review-toolbar__action-row">
            <button
              className="secondary"
              onClick={onSelectAllVisible}
              type="button"
            >
              Select all visible
            </button>
            <button
              className="secondary"
              disabled={selectedCount === 0}
              onClick={onClearSelection}
              type="button"
            >
              Clear selection
            </button>
            <button
              disabled={selectedCount === 0}
              onClick={() => onRequestBulkAction('accept')}
              type="button"
            >
              Accept selected
            </button>
            <button
              className="secondary"
              disabled={selectedCount === 0}
              onClick={() => onRequestBulkAction('reject')}
              type="button"
            >
              Reject selected
            </button>
          </div>
        </div>
      </div>
    </WorkspaceDataCard>
  );
}
