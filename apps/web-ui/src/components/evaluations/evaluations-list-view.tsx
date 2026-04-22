'use client';

import { useDeferredValue } from 'react';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { EvaluationListResponse } from '@metrev/domain-contracts';

import { EvaluationsFilters } from '@/components/evaluations/evaluations-filters';
import {
  EvaluationsTable,
  sortEvaluations,
} from '@/components/evaluations/evaluations-table';
import {
  WorkspaceEmptyState,
  WorkspacePageHeader,
  WorkspaceSection,
  WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { fetchEvaluationList } from '@/lib/api';
import {
  type EvaluationConfidenceFilter,
  useEvaluationsListQueryState,
} from '@/lib/evaluations-list-query-state';

void React;

function matchesConfidence(
  item: EvaluationListResponse['items'][number],
  confidenceFilter: EvaluationConfidenceFilter,
) {
  return (
    confidenceFilter === 'all' || item.confidence_level === confidenceFilter
  );
}

function matchesSearch(
  item: EvaluationListResponse['items'][number],
  searchInput: string,
) {
  const normalizedSearch = searchInput.trim().toLocaleLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const haystack = [
    item.evaluation_id,
    item.case_id,
    item.summary,
    item.technology_family,
    item.primary_objective,
  ]
    .join(' ')
    .toLocaleLowerCase();

  return haystack.includes(normalizedSearch);
}

export function EvaluationsListView() {
  const {
    confidenceFilter,
    searchInput,
    setConfidenceFilter,
    setSearchInput,
    setSortDirection,
    setSortKey,
    sortDirection,
    sortKey,
  } = useEvaluationsListQueryState();
  const deferredSearch = useDeferredValue(searchInput);
  const query = useQuery({
    queryFn: fetchEvaluationList,
    queryKey: ['evaluation-list'],
  });

  const filteredItems = React.useMemo(() => {
    const items = query.data?.items ?? [];
    const visibleItems = items.filter(
      (item) =>
        matchesConfidence(item, confidenceFilter) &&
        matchesSearch(item, deferredSearch),
    );

    return sortEvaluations(visibleItems, sortKey, sortDirection);
  }, [
    confidenceFilter,
    deferredSearch,
    query.data?.items,
    sortDirection,
    sortKey,
  ]);

  if (query.isLoading) {
    return (
      <div className="workspace-page">
        <WorkspaceSkeleton lines={5} />
      </div>
    );
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  const list = query.data;
  if (!list) {
    return (
      <WorkspaceEmptyState
        description="The evaluation list payload could not be loaded."
        title="Evaluations unavailable"
      />
    );
  }

  return (
    <EvaluationsWorkspaceView
      confidenceFilter={confidenceFilter}
      items={filteredItems}
      onConfidenceFilterChange={setConfidenceFilter}
      onSearchInputChange={setSearchInput}
      onSortDirectionChange={setSortDirection}
      onSortKeyChange={setSortKey}
      searchInput={searchInput}
      sortDirection={sortDirection}
      sortKey={sortKey}
      totalCount={list.items.length}
    />
  );
}

export function EvaluationsWorkspaceView({
  confidenceFilter,
  items,
  onConfidenceFilterChange,
  onSearchInputChange,
  onSortDirectionChange,
  onSortKeyChange,
  searchInput,
  sortDirection,
  sortKey,
  totalCount,
}: {
  confidenceFilter: EvaluationConfidenceFilter;
  items: EvaluationListResponse['items'];
  onConfidenceFilterChange: (nextValue: EvaluationConfidenceFilter) => void;
  onSearchInputChange: (nextValue: string) => void;
  onSortDirectionChange: (nextValue: 'asc' | 'desc') => void;
  onSortKeyChange: (
    nextValue: 'created_at' | 'confidence_level' | 'case_id',
  ) => void;
  searchInput: string;
  sortDirection: 'asc' | 'desc';
  sortKey: 'created_at' | 'confidence_level' | 'case_id';
  totalCount: number;
}) {
  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <Link className="button" href="/cases/new">
            New evaluation
          </Link>
        }
        badge="Evaluations"
        chips={[`${items.length} visible`, `${totalCount} total`]}
        description="All saved evaluations remain searchable, sortable, and directly connected to case history."
        title="All evaluations"
      />

      <WorkspaceSection
        description="Filters and sort order persist in the URL so this list can be shared or revisited without losing state."
        eyebrow="Workspace list"
        title="Evaluation registry"
      >
        <EvaluationsFilters
          confidenceFilter={confidenceFilter}
          onConfidenceFilterChange={onConfidenceFilterChange}
          onSearchInputChange={onSearchInputChange}
          onSortDirectionChange={onSortDirectionChange}
          onSortKeyChange={onSortKeyChange}
          searchInput={searchInput}
          sortDirection={sortDirection}
          sortKey={sortKey}
          totalCount={totalCount}
          visibleCount={items.length}
        />
        <EvaluationsTable items={items} />
      </WorkspaceSection>
    </div>
  );
}
