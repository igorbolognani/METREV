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
import { EvidenceReviewToolbar } from '@/components/evidence-review/evidence-review-toolbar';
import {
  WorkspaceEmptyState,
  WorkspacePageHeader,
  WorkspaceSection,
  WorkspaceSkeleton,
  WorkspaceStatCard,
} from '@/components/workspace-chrome';
import { fetchEvidenceReviewWorkspace } from '@/lib/api';
import {
  runBulkEvidenceReview,
  type BulkEvidenceReviewSummary,
} from '@/lib/evidence-review-actions';
import {
  type EvidenceReviewFilter,
  useEvidenceReviewQueryState,
} from '@/lib/evidence-review-query-state';

void React;

type EvidenceReviewItem = EvidenceReviewWorkspaceResponse['items'][number];

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesSearch(item: EvidenceReviewItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    item.title,
    item.summary,
    item.publisher ?? '',
    item.doi ?? '',
    item.source_category ?? '',
    item.source_url ?? '',
    item.provenance_note,
    item.tags.join(' '),
  ]
    .join(' ')
    .toLocaleLowerCase();

  return haystack.includes(query);
}

function matchesStatus(item: EvidenceReviewItem, filter: EvidenceReviewFilter) {
  return filter === 'all' || item.review_status === filter;
}

function summarizeItems(
  items: EvidenceReviewItem[],
): EvidenceReviewWorkspaceResponse['summary'] {
  return items.reduce<EvidenceReviewWorkspaceResponse['summary']>(
    (summary, item) => {
      summary.total += 1;

      if (item.review_status === 'accepted') {
        summary.accepted += 1;
      } else if (item.review_status === 'rejected') {
        summary.rejected += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    {
      accepted: 0,
      pending: 0,
      rejected: 0,
      total: 0,
    },
  );
}

function buildVisibleWorkspace(
  workspace: EvidenceReviewWorkspaceResponse,
  filter: EvidenceReviewFilter,
  searchInput: string,
) {
  const normalizedSearch = normalizeSearchValue(searchInput);
  const searchMatchedItems = workspace.items.filter((item) =>
    matchesSearch(item, normalizedSearch),
  );
  const searchMatchedSpotlight = workspace.spotlight.filter((item) =>
    matchesSearch(item, normalizedSearch),
  );

  return {
    items: searchMatchedItems.filter((item) => matchesStatus(item, filter)),
    spotlight: searchMatchedSpotlight.filter((item) =>
      matchesStatus(item, filter),
    ),
    summary: summarizeItems(searchMatchedItems),
  };
}

export function ExternalEvidenceReviewBoard() {
  const queryClient = useQueryClient();
  const { filter, searchInput, setFilter, setSearchInput } =
    useEvidenceReviewQueryState();
  const deferredSearch = useDeferredValue(searchInput);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkAction, setBulkAction] =
    React.useState<ExternalEvidenceReviewAction | null>(null);
  const [bulkNote, setBulkNote] = React.useState('');
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [resultDialogOpen, setResultDialogOpen] = React.useState(false);
  const [bulkResult, setBulkResult] =
    React.useState<BulkEvidenceReviewSummary | null>(null);

  const query = useQuery({
    queryKey: ['evidence-review-workspace'],
    queryFn: () => fetchEvidenceReviewWorkspace(),
  });

  const visibleWorkspace = React.useMemo(
    () =>
      query.data
        ? buildVisibleWorkspace(query.data, filter, deferredSearch)
        : null,
    [deferredSearch, filter, query.data],
  );
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
      onFilterChange={setFilter}
      onRequestBulkAction={handleRequestBulkAction}
      onResultDialogOpenChange={setResultDialogOpen}
      onSearchInputChange={setSearchInput}
      onSelectAllVisible={handleSelectAllVisible}
      onToggleSelection={toggleSelection}
      resultDialogOpen={resultDialogOpen}
      searchInput={searchInput}
      selectedIds={selectedIds}
      visibleItems={visibleWorkspace.items}
      visibleSpotlight={visibleWorkspace.spotlight}
      visibleSummary={visibleWorkspace.summary}
      workspace={workspace}
    />
  );
}

export function EvidenceReviewWorkspaceView({
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
  onRequestBulkAction,
  onResultDialogOpenChange,
  onSearchInputChange,
  onSelectAllVisible,
  onToggleSelection,
  resultDialogOpen,
  searchInput,
  selectedIds,
  visibleItems,
  visibleSpotlight,
  visibleSummary,
  workspace,
}: {
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
  onRequestBulkAction: (action: ExternalEvidenceReviewAction) => void;
  onResultDialogOpenChange: (open: boolean) => void;
  onSearchInputChange: (nextValue: string) => void;
  onSelectAllVisible: () => void;
  onToggleSelection: (id: string) => void;
  resultDialogOpen: boolean;
  searchInput: string;
  selectedIds: string[];
  visibleItems: EvidenceReviewWorkspaceResponse['items'];
  visibleSpotlight: EvidenceReviewWorkspaceResponse['spotlight'];
  visibleSummary: EvidenceReviewWorkspaceResponse['summary'];
  workspace: EvidenceReviewWorkspaceResponse;
}) {
  const spotlightIds = workspace.spotlight.map((item) => item.id);

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <Link className="button secondary" href="/cases/new">
            Open input deck
          </Link>
        }
        badge="Evidence review"
        chips={[
          `${workspace.summary.pending} pending`,
          `${workspace.summary.accepted} accepted`,
          `${workspace.summary.rejected} rejected`,
        ]}
        description="Review imported records before they can enter intake. Accepted items remain explicit and selectable; rejected and pending records stay blocked from deterministic evaluation."
        title="Imported evidence control surface"
      />

      <section className="workspace-stats-grid">
        <WorkspaceStatCard
          detail="Records blocked from intake until an analyst accepts or rejects them."
          label="Pending review"
          tone="warning"
          value={workspace.summary.pending}
        />
        <WorkspaceStatCard
          detail="Eligible for explicit attachment in the input deck."
          label="Accepted"
          tone="success"
          value={workspace.summary.accepted}
        />
        <WorkspaceStatCard
          detail="Visible for auditability, but excluded from intake."
          label="Rejected"
          value={workspace.summary.rejected}
        />
        <WorkspaceStatCard
          detail="All persisted external-evidence records currently stored in the local runtime."
          label="Catalog total"
          tone="accent"
          value={workspace.summary.total}
        />
      </section>

      <WorkspaceSection
        description="Use URL-backed filters and one batch-review system for the entire queue."
        eyebrow="Queue filters"
        title="Search, filter, and batch review"
      >
        <EvidenceReviewToolbar
          filter={filter}
          onClearSelection={onClearSelection}
          onFilterChange={onFilterChange}
          onRequestBulkAction={onRequestBulkAction}
          onSearchInputChange={onSearchInputChange}
          onSelectAllVisible={onSelectAllVisible}
          searchInput={searchInput}
          selectedCount={selectedIds.length}
          totalCount={workspace.summary.total}
          visibleCount={visibleItems.length}
          visibleSummary={visibleSummary}
        />
        {bulkActionError ? <p className="error">{bulkActionError}</p> : null}
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
