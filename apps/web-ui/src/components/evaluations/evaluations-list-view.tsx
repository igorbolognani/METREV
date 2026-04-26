'use client';

import { useDeferredValue } from 'react';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { EvaluationListResponse } from '@metrev/domain-contracts';

import { EvaluationsFilters } from '@/components/evaluations/evaluations-filters';
import { EvaluationsTable } from '@/components/evaluations/evaluations-table';
import { TabsContent } from '@/components/ui/tabs';
import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { SummaryRail } from '@/components/workspace/summary-rail';
import { WorkspaceTabShell } from '@/components/workspace/workspace-tab-shell';
import { fetchEvaluationList } from '@/lib/api';
import {
    useEvaluationsListQueryState,
    type EvaluationConfidenceFilter,
} from '@/lib/evaluations-list-query-state';
import {
    useEvaluationsViewTab,
    type EvaluationsViewTab,
} from '@/lib/evaluations-view-query-state';

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
  const [activeTab, setActiveTab] = useEvaluationsViewTab();
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
      activeTab={activeTab}
      onTabChange={setActiveTab}
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
  activeTab = 'catalog',
  confidenceFilter,
  items,
  onConfidenceFilterChange,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
  onSearchInputChange,
  onSortDirectionChange,
  onSortKeyChange,
  onTabChange,
  page,
  pageSize,
  searchInput,
  summary,
  sortDirection,
  sortKey,
}: {
  activeTab?: EvaluationsViewTab;
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
  onTabChange?: (nextTab: EvaluationsViewTab) => void;
  page: number;
  pageSize: number;
  searchInput: string;
  summary: EvaluationListResponse['summary'];
  sortDirection: 'asc' | 'desc';
  sortKey: 'created_at' | 'confidence_level' | 'case_id';
}) {
  const summaryItems = [
    {
      detail:
        'Rows returned on the current page for the active search and confidence state.',
      key: 'returned',
      label: 'Visible rows',
      tone: 'accent' as const,
      value: summary.returned,
    },
    {
      detail: 'Records matching the current server-side filter state.',
      key: 'filtered',
      label: 'Filtered rows',
      tone: 'success' as const,
      value: summary.filtered_total,
    },
    {
      detail: 'All persisted evaluations currently saved in the runtime.',
      key: 'total',
      label: 'Total rows',
      tone: 'default' as const,
      value: summary.total,
    },
    {
      detail: 'Server-owned page count for the current filter slice.',
      key: 'pages',
      label: 'Pages',
      tone: 'warning' as const,
      value: summary.total_pages,
    },
  ];

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

      <SummaryRail items={summaryItems} label="Evaluations registry summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={[
          { value: 'catalog', label: 'Catalog', badge: summary.returned },
          { value: 'audit', label: 'Audit', badge: summary.filtered_total },
        ]}
        label="Evaluation registry tabs"
        onTabChange={(value) => {
          if (value === 'catalog' || value === 'audit') {
            onTabChange?.(value);
          }
        }}
        summary="Keep the registry table and the current server-owned state separate so filtering logic stays legible."
        title="Registry layers"
      >
        <TabsContent value="catalog">
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
        </TabsContent>

        <TabsContent value="audit">
          <div className="workspace-detail-grid">
            <WorkspaceDataCard>
              <span className="badge subtle">Current filter state</span>
              <div className="workspace-chip-list compact">
                <span className="meta-chip">
                  Confidence: {confidenceFilter}
                </span>
                <span className="meta-chip">
                  Search: {searchInput || 'none'}
                </span>
                <span className="meta-chip">Sort: {sortKey}</span>
                <span className="meta-chip">Direction: {sortDirection}</span>
              </div>
              <p>
                Page {page} of {summary.total_pages} with {summary.returned}{' '}
                visible row(s).
              </p>
            </WorkspaceDataCard>
            <WorkspaceDataCard>
              <span className="badge subtle">Registry posture</span>
              <p>
                {summary.filtered_total} filtered row(s) remain connected to
                case history and direct result navigation.
              </p>
              <div className="workspace-chip-list compact">
                <span className="meta-chip">
                  Total records: {summary.total}
                </span>
                <span className="meta-chip">Page size: {pageSize}</span>
              </div>
            </WorkspaceDataCard>
          </div>
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
