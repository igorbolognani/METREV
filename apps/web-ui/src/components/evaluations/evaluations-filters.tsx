'use client';

import * as React from 'react';

import type {
    EvaluationConfidenceFilter,
    EvaluationSortDirection,
    EvaluationSortKey,
} from '@/lib/evaluations-list-query-state';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { WorkspaceDataCard } from '@/components/workspace-chrome';

void React;

export interface EvaluationsFiltersProps {
  confidenceFilter: EvaluationConfidenceFilter;
  filteredCount: number;
  onConfidenceFilterChange: (nextValue: EvaluationConfidenceFilter) => void;
  onNextPage: () => void;
  onPageSizeChange: (nextValue: number) => void;
  onPreviousPage: () => void;
  onSearchInputChange: (nextValue: string) => void;
  onSortDirectionChange: (nextValue: EvaluationSortDirection) => void;
  onSortKeyChange: (nextValue: EvaluationSortKey) => void;
  page: number;
  pageSize: number;
  searchInput: string;
  sortDirection: EvaluationSortDirection;
  sortKey: EvaluationSortKey;
  totalCount: number;
  totalPages: number;
  visibleCount: number;
}

export function EvaluationsFilters({
  confidenceFilter,
  filteredCount,
  onConfidenceFilterChange,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
  onSearchInputChange,
  onSortDirectionChange,
  onSortKeyChange,
  page,
  pageSize,
  searchInput,
  sortDirection,
  sortKey,
  totalCount,
  totalPages,
  visibleCount,
}: EvaluationsFiltersProps) {
  return (
    <WorkspaceDataCard>
      <div className="workspace-data-card__header">
        <div>
          <span className="badge subtle">Filters</span>
          <h3>Server-driven sorting and filtering</h3>
        </div>
        <span className="meta-chip">
          Page {page} of {totalPages}
        </span>
      </div>

      <div className="evaluations-toolbar">
        <Input
          className="workspace-form-field--wide"
          hint="Search by evaluation ID, case ID, summary, technology, or objective"
          label="Search evaluations"
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="eval, case, wastewater, fuel cell"
          value={searchInput}
        />
        <Select
          label="Confidence"
          onValueChange={(value) =>
            onConfidenceFilterChange(value as EvaluationConfidenceFilter)
          }
          options={[
            { label: 'All confidence levels', value: 'all' },
            { label: 'High confidence', value: 'high' },
            { label: 'Medium confidence', value: 'medium' },
            { label: 'Low confidence', value: 'low' },
          ]}
          value={confidenceFilter}
        />
        <Select
          label="Sort by"
          onValueChange={(value) => onSortKeyChange(value as EvaluationSortKey)}
          options={[
            { label: 'Created time', value: 'created_at' },
            { label: 'Confidence level', value: 'confidence_level' },
            { label: 'Case ID', value: 'case_id' },
          ]}
          value={sortKey}
        />
        <Select
          label="Direction"
          onValueChange={(value) =>
            onSortDirectionChange(value as EvaluationSortDirection)
          }
          options={[
            { label: 'Descending', value: 'desc' },
            { label: 'Ascending', value: 'asc' },
          ]}
          value={sortDirection}
        />
        <Select
          label="Rows per page"
          onValueChange={(value) =>
            onPageSizeChange(Number.parseInt(value, 10))
          }
          options={[
            { label: '25 rows', value: '25' },
            { label: '50 rows', value: '50' },
            { label: '100 rows', value: '100' },
          ]}
          value={String(pageSize)}
        />
        <div className="detail-table-actions">
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
            disabled={page >= totalPages}
            onClick={onNextPage}
            type="button"
          >
            Next page
          </button>
        </div>
      </div>

      <p className="workspace-inline-copy">
        Showing {visibleCount} of {filteredCount} filtered and {totalCount}{' '}
        total evaluations.
      </p>
    </WorkspaceDataCard>
  );
}
