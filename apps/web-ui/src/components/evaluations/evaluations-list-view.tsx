'use client';

import { useDeferredValue } from 'react';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { EvaluationListResponse } from '@metrev/domain-contracts';

import { EvaluationsFilters } from '@/components/evaluations/evaluations-filters';
import { EvaluationsTable } from '@/components/evaluations/evaluations-table';
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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const query = useQuery({
    queryFn: () =>
      fetchEvaluationList({
        confidence: confidenceFilter === 'all' ? undefined : confidenceFilter,
        query: deferredSearch,
        sortKey,
        sortDirection,
        page,
        pageSize,
      }),
    queryKey: [
      'evaluation-list',
      confidenceFilter,
      deferredSearch,
      sortKey,
      sortDirection,
      page,
      pageSize,
    ],
  });

  React.useEffect(() => {
    if (!query.data) {
      return;
    }

    if (page > query.data.summary.total_pages) {
      setPage(query.data.summary.total_pages);
    }
  }, [page, query.data]);

  function handleConfidenceFilterChange(nextValue: EvaluationConfidenceFilter) {
    setPage(1);
    void setConfidenceFilter(nextValue);
  }

  function handleSearchInputChange(nextValue: string) {
    setPage(1);
    void setSearchInput(nextValue);
  }

  function handleSortKeyChange(
    nextValue: 'created_at' | 'confidence_level' | 'case_id',
  ) {
    setPage(1);
    void setSortKey(nextValue);
  }

  function handleSortDirectionChange(nextValue: 'asc' | 'desc') {
    setPage(1);
    void setSortDirection(nextValue);
  }

  function handlePageSizeChange(nextValue: number) {
    setPage(1);
    setPageSize(nextValue);
  }

  function handlePreviousPage() {
    setPage((currentValue) => Math.max(1, currentValue - 1));
  }

  function handleNextPage() {
    setPage((currentValue) =>
      Math.min(
        query.data?.summary.total_pages ?? currentValue,
        currentValue + 1,
      ),
    );
  }

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
      items={list.items}
      onConfidenceFilterChange={handleConfidenceFilterChange}
      onNextPage={handleNextPage}
      onPageSizeChange={handlePageSizeChange}
      onPreviousPage={handlePreviousPage}
      onSearchInputChange={handleSearchInputChange}
      onSortDirectionChange={handleSortDirectionChange}
      onSortKeyChange={handleSortKeyChange}
      page={page}
      pageSize={pageSize}
      searchInput={searchInput}
      summary={list.summary}
      sortDirection={sortDirection}
      sortKey={sortKey}
    />
  );
}

export function EvaluationsWorkspaceView({
  confidenceFilter,
  items,
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
  summary,
  sortDirection,
  sortKey,
}: {
  confidenceFilter: EvaluationConfidenceFilter;
  items: EvaluationListResponse['items'];
  onConfidenceFilterChange: (nextValue: EvaluationConfidenceFilter) => void;
  onNextPage: () => void;
  onPageSizeChange: (nextValue: number) => void;
  onPreviousPage: () => void;
  onSearchInputChange: (nextValue: string) => void;
  onSortDirectionChange: (nextValue: 'asc' | 'desc') => void;
  onSortKeyChange: (
    nextValue: 'created_at' | 'confidence_level' | 'case_id',
  ) => void;
  page: number;
  pageSize: number;
  searchInput: string;
  summary: EvaluationListResponse['summary'];
  sortDirection: 'asc' | 'desc';
  sortKey: 'created_at' | 'confidence_level' | 'case_id';
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
        chips={[`${summary.filtered_total} filtered`, `${summary.total} total`]}
        description="All saved evaluations remain searchable, sortable, and directly connected to case history."
        title="All evaluations"
      />

      <WorkspaceSection
        description="Confidence, search, and sort state persist in the URL while the backend owns filtering, sorting, and pagination."
        eyebrow="Workspace list"
        title="Evaluation registry"
      >
        <EvaluationsFilters
          confidenceFilter={confidenceFilter}
          filteredCount={summary.filtered_total}
          onConfidenceFilterChange={onConfidenceFilterChange}
          onNextPage={onNextPage}
          onPageSizeChange={onPageSizeChange}
          onPreviousPage={onPreviousPage}
          onSearchInputChange={onSearchInputChange}
          onSortDirectionChange={onSortDirectionChange}
          onSortKeyChange={onSortKeyChange}
          page={page}
          pageSize={pageSize}
          searchInput={searchInput}
          sortDirection={sortDirection}
          sortKey={sortKey}
          totalCount={summary.total}
          totalPages={summary.total_pages}
          visibleCount={summary.returned}
        />
        <EvaluationsTable items={items} />
      </WorkspaceSection>
    </div>
  );
}
