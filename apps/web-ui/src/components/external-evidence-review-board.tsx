'use client';

import { useDeferredValue } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
    EvidenceReviewWorkspaceResponse,
    ExternalEvidenceReviewAction,
} from '@metrev/domain-contracts';

import { EvidenceReviewBulkActionDialog } from '@/components/evidence-review/evidence-review-bulk-action-dialog';
import { EvidenceReviewBulkResultDialog } from '@/components/evidence-review/evidence-review-bulk-result-dialog';
import { EvidenceReviewTable } from '@/components/evidence-review/evidence-review-table';
import type { EvidenceReviewSourceFilter } from '@/components/evidence-review/evidence-review-toolbar';
import { EvidenceReviewToolbar } from '@/components/evidence-review/evidence-review-toolbar';
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
import { fetchEvidenceReviewWorkspace } from '@/lib/api';
import {
    runBulkEvidenceReview,
    type BulkEvidenceReviewSummary,
} from '@/lib/evidence-review-actions';
import {
    useEvidenceReviewQueryState,
    type EvidenceReviewFilter,
} from '@/lib/evidence-review-query-state';
import {
    useEvidenceReviewTab,
    type EvidenceReviewTab,
} from '@/lib/evidence-review-view-query-state';

void React;

export function ExternalEvidenceReviewBoard() {
  const queryClient = useQueryClient();
  const { filter, searchInput, setFilter, setSearchInput } =
    useEvidenceReviewQueryState();
  const [activeTab, setActiveTab] = useEvidenceReviewTab();
  const deferredSearch = useDeferredValue(searchInput);
  const [sourceType, setSourceType] =
    React.useState<EvidenceReviewSourceFilter>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkAction, setBulkAction] =
    React.useState<ExternalEvidenceReviewAction | null>(null);
  const [bulkNote, setBulkNote] = React.useState('');
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [resultDialogOpen, setResultDialogOpen] = React.useState(false);
  const [bulkResult, setBulkResult] =
    React.useState<BulkEvidenceReviewSummary | null>(null);

  const query = useQuery({
    queryKey: [
      'evidence-review-workspace',
      filter,
      deferredSearch,
      sourceType,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchEvidenceReviewWorkspace({
        status: filter === 'all' ? undefined : filter,
        query: deferredSearch,
        sourceType: sourceType === 'all' ? undefined : sourceType,
        page,
        pageSize,
      }),
  });

  const visibleWorkspace = query.data ?? null;
  const visibleIds = React.useMemo(
    () => visibleWorkspace?.items.map((item) => item.id) ?? [],
    [visibleWorkspace],
  );
  const visibleIdsKey = visibleIds.join('|');

  React.useEffect(() => {
    setSelectedIds((currentValue) => {
      const nextValue = currentValue.filter((id) => visibleIds.includes(id));
      return nextValue.length === currentValue.length
        ? currentValue
        : nextValue;
    });
  }, [visibleIds, visibleIdsKey]);

  React.useEffect(() => {
    if (!query.data) {
      return;
    }

    if (page > query.data.summary.total_pages) {
      setPage(query.data.summary.total_pages);
    }
  }, [page, query.data]);

  function handleFilterChange(nextFilter: EvidenceReviewFilter) {
    setPage(1);
    void setFilter(nextFilter);
  }

  function handleSearchInputChange(nextValue: string) {
    setPage(1);
    void setSearchInput(nextValue);
  }

  function handleSourceTypeChange(nextValue: EvidenceReviewSourceFilter) {
    setPage(1);
    setSourceType(nextValue);
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
        visibleWorkspace?.summary.total_pages ?? currentValue,
        currentValue + 1,
      ),
    );
  }

  const bulkReviewMutation = useMutation({
    mutationFn: ({
      action,
      ids,
      note,
    }: {
      action: ExternalEvidenceReviewAction;
      ids: string[];
      note?: string;
    }) => runBulkEvidenceReview({ action, ids, note }),
    onSuccess: async (result) => {
      setBulkResult(result);
      setResultDialogOpen(true);
      setSelectedIds([]);
      setBulkAction(null);
      setBulkNote('');

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['evidence-review-workspace'],
        }),
        queryClient.invalidateQueries({ queryKey: ['external-evidence'] }),
        queryClient.invalidateQueries({
          queryKey: ['external-evidence-detail'],
        }),
      ]);
    },
  });

  function toggleSelection(id: string) {
    setSelectedIds((currentValue) =>
      currentValue.includes(id)
        ? currentValue.filter((entry) => entry !== id)
        : [...currentValue, id],
    );
  }

  function handleSelectAllVisible() {
    setSelectedIds(visibleIds);
  }

  function handleClearSelection() {
    setSelectedIds([]);
  }

  function handleRequestBulkAction(action: ExternalEvidenceReviewAction) {
    if (selectedIds.length === 0) {
      return;
    }

    setBulkAction(action);
    setBulkDialogOpen(true);
  }

  function handleBulkDialogOpenChange(open: boolean) {
    setBulkDialogOpen(open);

    if (!open) {
      setBulkAction(null);
      setBulkNote('');
    }
  }

  function handleConfirmBulkAction() {
    if (!bulkAction || selectedIds.length === 0) {
      return;
    }

    const ids = [...selectedIds];
    setBulkDialogOpen(false);
    bulkReviewMutation.mutate({
      action: bulkAction,
      ids,
      note: bulkNote,
    });
  }

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
  if (!workspace || !visibleWorkspace) {
    return (
      <WorkspaceEmptyState
        title="Evidence review unavailable"
        description="The evidence review workspace payload could not be loaded."
      />
    );
  }

  return (
    <EvidenceReviewWorkspaceView
      bulkAction={bulkAction}
      bulkActionError={bulkReviewMutation.error?.message ?? null}
      bulkDialogOpen={bulkDialogOpen}
      bulkNote={bulkNote}
      bulkResult={bulkResult}
      filter={filter}
      isBulkActionPending={bulkReviewMutation.isPending}
      onBulkDialogOpenChange={handleBulkDialogOpenChange}
      onBulkNoteChange={setBulkNote}
      onClearSelection={handleClearSelection}
      onConfirmBulkAction={handleConfirmBulkAction}
      onFilterChange={handleFilterChange}
      onNextPage={handleNextPage}
      onPageSizeChange={handlePageSizeChange}
      onPreviousPage={handlePreviousPage}
      onRequestBulkAction={handleRequestBulkAction}
      onResultDialogOpenChange={setResultDialogOpen}
      onSearchInputChange={handleSearchInputChange}
      onSelectAllVisible={handleSelectAllVisible}
      onSourceTypeChange={handleSourceTypeChange}
      onToggleSelection={toggleSelection}
      page={page}
      pageSize={pageSize}
      resultDialogOpen={resultDialogOpen}
      searchInput={searchInput}
      selectedIds={selectedIds}
      sourceType={sourceType}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      visibleItems={visibleWorkspace.items}
      visibleSpotlight={visibleWorkspace.spotlight}
      visibleSummary={visibleWorkspace.summary}
      workspace={workspace}
    />
  );
}

export function EvidenceReviewWorkspaceView({
  activeTab = 'queue',
  bulkAction,
  bulkActionError,
  bulkDialogOpen,
  bulkNote,
  bulkResult,
  filter,
  isBulkActionPending,
  onBulkDialogOpenChange,
  onBulkNoteChange,
  onClearSelection,
  onConfirmBulkAction,
  onFilterChange,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
  onRequestBulkAction,
  onResultDialogOpenChange,
  onSearchInputChange,
  onSelectAllVisible,
  onSourceTypeChange,
  onToggleSelection,
  onTabChange,
  page,
  pageSize,
  resultDialogOpen,
  searchInput,
  selectedIds,
  sourceType,
  visibleItems,
  visibleSpotlight,
  visibleSummary,
  workspace,
}: {
  activeTab?: EvidenceReviewTab;
  bulkAction: ExternalEvidenceReviewAction | null;
  bulkActionError: string | null;
  bulkDialogOpen: boolean;
  bulkNote: string;
  bulkResult: BulkEvidenceReviewSummary | null;
  filter: EvidenceReviewFilter;
  isBulkActionPending: boolean;
  onBulkDialogOpenChange: (open: boolean) => void;
  onBulkNoteChange: (nextValue: string) => void;
  onClearSelection: () => void;
  onConfirmBulkAction: () => void;
  onFilterChange: (nextFilter: EvidenceReviewFilter) => void;
  onNextPage: () => void;
  onPageSizeChange: (nextValue: number) => void;
  onPreviousPage: () => void;
  onRequestBulkAction: (action: ExternalEvidenceReviewAction) => void;
  onResultDialogOpenChange: (open: boolean) => void;
  onSearchInputChange: (nextValue: string) => void;
  onSelectAllVisible: () => void;
  onSourceTypeChange: (nextValue: EvidenceReviewSourceFilter) => void;
  onToggleSelection: (id: string) => void;
  onTabChange?: (nextTab: EvidenceReviewTab) => void;
  page: number;
  pageSize: number;
  resultDialogOpen: boolean;
  searchInput: string;
  selectedIds: string[];
  sourceType: EvidenceReviewSourceFilter;
  visibleItems: EvidenceReviewWorkspaceResponse['items'];
  visibleSpotlight: EvidenceReviewWorkspaceResponse['spotlight'];
  visibleSummary: EvidenceReviewWorkspaceResponse['summary'];
  workspace: EvidenceReviewWorkspaceResponse;
}) {
  const spotlightIds = workspace.spotlight.map((item) => item.id);
  const selectedItems = visibleItems.filter((item) =>
    selectedIds.includes(item.id),
  );
  const presentation = workspace.presentation;
  const summaryItems = [
    {
      detail:
        'Records blocked from intake until an analyst accepts or rejects them.',
      key: 'pending',
      label: 'Pending review',
      tone: 'warning' as const,
      value: workspace.summary.pending,
    },
    {
      detail: 'Eligible for explicit attachment in the input deck.',
      key: 'accepted',
      label: 'Accepted',
      tone: 'success' as const,
      value: workspace.summary.accepted,
    },
    {
      detail: 'Visible for auditability, but excluded from intake.',
      key: 'rejected',
      label: 'Rejected',
      tone: 'critical' as const,
      value: workspace.summary.rejected,
    },
    {
      detail:
        'All persisted external-evidence records currently stored in the local runtime.',
      key: 'total',
      label: 'Catalog total',
      tone: 'accent' as const,
      value: workspace.summary.total,
    },
  ];
  const tabItems = presentation?.tabs.map((tab) => ({
    value: tab.key,
    label: tab.label,
    badge:
      tab.key === 'selected'
        ? selectedIds.length
        : tab.key === 'audit'
          ? visibleSummary.filtered_total
          : visibleItems.length,
  })) ?? [
    { value: 'queue', label: 'Queue', badge: visibleItems.length },
    { value: 'selected', label: 'Selected', badge: selectedIds.length },
    { value: 'audit', label: 'Audit', badge: visibleSummary.filtered_total },
  ];

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            {presentation?.primary_actions.map((action) => (
              <Link
                className="button secondary"
                href={action.href}
                key={action.key}
              >
                {action.label}
              </Link>
            ))}
            <Link className="button secondary" href="/cases/new">
              Open input deck
            </Link>
          </>
        }
        badge="Evidence review"
        chips={
          presentation?.badges.map((badge) => badge.label) ?? [
            `${workspace.summary.pending} pending`,
            `${workspace.summary.accepted} accepted`,
            `${workspace.summary.rejected} rejected`,
          ]
        }
        description={
          presentation?.short_summary ??
          'Review imported records before they can enter intake. Accepted items remain explicit and selectable; rejected and pending records stay blocked from deterministic evaluation.'
        }
        title={presentation?.page_title ?? 'Imported evidence control surface'}
      />

      <SummaryRail items={summaryItems} label="Evidence review summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={tabItems}
        label="Evidence review tabs"
        onTabChange={(value) => {
          if (value === 'queue' || value === 'selected' || value === 'audit') {
            onTabChange?.(value);
          }
        }}
        summary="Separate the live queue, current selection, and slice audit so batch review context stays explicit."
        title="Review layers"
      >
        <TabsContent value="queue">
          <WorkspaceSection
            description="Use server-backed filters and one batch-review system for the entire queue."
            eyebrow="Queue filters"
            title="Search, filter, and batch review"
          >
            <EvidenceReviewToolbar
              filter={filter}
              onClearSelection={onClearSelection}
              onFilterChange={onFilterChange}
              onNextPage={onNextPage}
              onPageSizeChange={onPageSizeChange}
              onPreviousPage={onPreviousPage}
              onRequestBulkAction={onRequestBulkAction}
              onSearchInputChange={onSearchInputChange}
              onSelectAllVisible={onSelectAllVisible}
              onSourceTypeChange={onSourceTypeChange}
              page={page}
              pageSize={pageSize}
              searchInput={searchInput}
              selectedCount={selectedIds.length}
              sourceType={sourceType}
              totalCount={workspace.summary.total}
              visibleCount={visibleItems.length}
              visibleSummary={visibleSummary}
            />
            {bulkActionError ? (
              <p className="error">{bulkActionError}</p>
            ) : null}
          </WorkspaceSection>

          <div className="workspace-split-grid">
            <WorkspaceSection
              description="The spotlight list stays available, but the dense table removes the old card stack."
              eyebrow="Spotlight"
              title="Priority records"
            >
              <EvidenceReviewTable
                emptyDescription="No spotlight records match the current search and filter state."
                emptyTitle="No spotlight items"
                items={visibleSpotlight}
              />
            </WorkspaceSection>

            <WorkspaceSection
              description="Every record stays explicit and reviewable, with selection kept separate from filter state."
              eyebrow="Full queue"
              title="Evidence catalog"
            >
              <EvidenceReviewTable
                emptyDescription="Adjust the current filter or search string to widen the queue."
                emptyTitle="No catalog items"
                highlightIds={spotlightIds}
                items={visibleItems}
                onToggleSelection={onToggleSelection}
                selectedIds={selectedIds}
                selectable
              />
            </WorkspaceSection>
          </div>
        </TabsContent>

        <TabsContent value="selected">
          <WorkspaceSection
            description="Keep batch actions scoped to the current selected slice before accepting or rejecting it."
            eyebrow="Selected slice"
            title="Selected records"
          >
            <EvidenceReviewToolbar
              filter={filter}
              onClearSelection={onClearSelection}
              onFilterChange={onFilterChange}
              onNextPage={onNextPage}
              onPageSizeChange={onPageSizeChange}
              onPreviousPage={onPreviousPage}
              onRequestBulkAction={onRequestBulkAction}
              onSearchInputChange={onSearchInputChange}
              onSelectAllVisible={onSelectAllVisible}
              onSourceTypeChange={onSourceTypeChange}
              page={page}
              pageSize={pageSize}
              searchInput={searchInput}
              selectedCount={selectedIds.length}
              sourceType={sourceType}
              totalCount={workspace.summary.total}
              visibleCount={visibleItems.length}
              visibleSummary={visibleSummary}
            />
          </WorkspaceSection>

          <WorkspaceSection
            description="Only currently selected rows appear here, so the final batch action remains inspectable."
            eyebrow="Selected queue"
            title="Selection review"
          >
            <EvidenceReviewTable
              emptyDescription="Select visible records from the queue to prepare a batch review."
              emptyTitle="No selected records"
              items={selectedItems}
              onToggleSelection={onToggleSelection}
              selectedIds={selectedIds}
              selectable
            />
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="audit">
          <div className="workspace-detail-grid">
            <WorkspaceDataCard>
              <span className="badge subtle">Filter state</span>
              <div className="workspace-chip-list compact">
                <span className="meta-chip">Status: {filter}</span>
                <span className="meta-chip">Source: {sourceType}</span>
                <span className="meta-chip">
                  Query: {searchInput || 'none'}
                </span>
              </div>
              <p>
                Page {page} of {visibleSummary.total_pages} with{' '}
                {visibleSummary.returned} returned rows from{' '}
                {visibleSummary.filtered_total} filtered records.
              </p>
            </WorkspaceDataCard>
            <WorkspaceDataCard>
              <span className="badge subtle">Selection posture</span>
              <p>
                {selectedIds.length} row(s) are currently selected for batch
                review.
              </p>
              <div className="workspace-chip-list compact">
                {selectedIds.length > 0 ? (
                  selectedIds.map((id) => (
                    <span className="meta-chip" key={id}>
                      {id}
                    </span>
                  ))
                ) : (
                  <span className="muted">No rows are currently selected.</span>
                )}
              </div>
            </WorkspaceDataCard>
          </div>

          <WorkspaceSection
            description="Spotlight rows remain explicit so reviewers can distinguish curated priority from the full filtered queue."
            eyebrow="Audit"
            title="Spotlight inventory"
          >
            <EvidenceReviewTable
              emptyDescription="No spotlight rows are available for the current queue slice."
              emptyTitle="No spotlight rows"
              items={visibleSpotlight}
            />
          </WorkspaceSection>
        </TabsContent>
      </WorkspaceTabShell>

      <EvidenceReviewBulkActionDialog
        action={bulkAction}
        isPending={isBulkActionPending}
        note={bulkNote}
        onConfirm={onConfirmBulkAction}
        onNoteChange={onBulkNoteChange}
        onOpenChange={onBulkDialogOpenChange}
        open={bulkDialogOpen}
        selectionCount={selectedIds.length}
      />

      <EvidenceReviewBulkResultDialog
        onOpenChange={onResultDialogOpenChange}
        open={resultDialogOpen}
        result={bulkResult}
      />
    </div>
  );
}
