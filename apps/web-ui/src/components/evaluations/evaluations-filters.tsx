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
  onConfidenceFilterChange: (nextValue: EvaluationConfidenceFilter) => void;
  onSearchInputChange: (nextValue: string) => void;
  onSortDirectionChange: (nextValue: EvaluationSortDirection) => void;
  onSortKeyChange: (nextValue: EvaluationSortKey) => void;
  searchInput: string;
  sortDirection: EvaluationSortDirection;
  sortKey: EvaluationSortKey;
  totalCount: number;
  visibleCount: number;
}

export function EvaluationsFilters({
  confidenceFilter,
  onConfidenceFilterChange,
  onSearchInputChange,
  onSortDirectionChange,
  onSortKeyChange,
  searchInput,
  sortDirection,
  sortKey,
  totalCount,
  visibleCount,
}: EvaluationsFiltersProps) {
  return (
    <WorkspaceDataCard>
      <div className="workspace-data-card__header">
        <div>
          <span className="badge subtle">Filters</span>
          <h3>Client-side sorting and filtering</h3>
        </div>
        <span className="meta-chip">
          {visibleCount} of {totalCount} visible
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
      </div>
    </WorkspaceDataCard>
  );
}
