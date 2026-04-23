'use client';

import type { ExternalEvidenceReviewAction } from '@metrev/domain-contracts';
import * as React from 'react';

import type { ExternalEvidenceSourceTypeFilter } from '@/lib/api';
import type { EvidenceReviewFilter } from '@/lib/evidence-review-query-state';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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

export type EvidenceReviewSourceFilter =
  | 'all'
  | ExternalEvidenceSourceTypeFilter;

const sourceFilters = [
  { label: 'All sources', value: 'all' },
  { label: 'OpenAlex', value: 'openalex' },
  { label: 'Crossref', value: 'crossref' },
  { label: 'Europe PMC', value: 'europe_pmc' },
  { label: 'Supplier profiles', value: 'supplier_profile' },
  { label: 'Market snapshots', value: 'market_snapshot' },
  { label: 'Curated manifests', value: 'curated_manifest' },
  { label: 'Manual', value: 'manual' },
] as const;

const pageSizeOptions = [
  { label: '25 rows', value: '25' },
  { label: '50 rows', value: '50' },
  { label: '100 rows', value: '100' },
];

export interface EvidenceReviewToolbarProps {
  filter: EvidenceReviewFilter;
  onClearSelection: () => void;
  onFilterChange: (nextFilter: EvidenceReviewFilter) => void;
  onNextPage: () => void;
  onPageSizeChange: (nextValue: number) => void;
  onPreviousPage: () => void;
  onRequestBulkAction: (action: ExternalEvidenceReviewAction) => void;
  onSearchInputChange: (nextValue: string) => void;
  onSelectAllVisible: () => void;
  onSourceTypeChange: (nextValue: EvidenceReviewSourceFilter) => void;
  page: number;
  pageSize: number;
  searchInput: string;
  selectedCount: number;
  sourceType: EvidenceReviewSourceFilter;
  totalCount: number;
  visibleCount: number;
  visibleSummary: {
    accepted: number;
    filtered_total: number;
    page: number;
    page_size: number;
    pending: number;
    rejected: number;
    total: number;
    total_pages: number;
    returned: number;
  };
}

export function EvidenceReviewToolbar({
  filter,
  onClearSelection,
  onFilterChange,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
  onRequestBulkAction,
  onSearchInputChange,
  onSelectAllVisible,
  onSourceTypeChange,
  page,
  pageSize,
  searchInput,
  selectedCount,
  sourceType,
  totalCount,
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
          <Select
            label="Source type"
            onValueChange={(value) =>
              onSourceTypeChange(value as EvidenceReviewSourceFilter)
            }
            options={sourceFilters.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={sourceType}
          />
          <Select
            label="Rows per page"
            onValueChange={(value) =>
              onPageSizeChange(Number.parseInt(value, 10))
            }
            options={pageSizeOptions}
            value={String(pageSize)}
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
            Page {page} of {visibleSummary.total_pages}. Showing{' '}
            {visibleSummary.returned} of {visibleSummary.filtered_total}{' '}
            filtered records and {totalCount} total records. Select visible rows
            to batch review without hiding partial failures.
          </p>
          <div className="evidence-review-toolbar__action-row">
            <button
              className="secondary"
              disabled={page <= 1}
              onClick={onPreviousPage}
              type="button"
            >
              Previous page
            </button>
            <button
              className="secondary"
              disabled={page >= visibleSummary.total_pages}
              onClick={onNextPage}
              type="button"
            >
              Next page
            </button>
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
