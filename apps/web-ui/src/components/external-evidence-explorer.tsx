'use client';

import { useDeferredValue } from 'react';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
    EvidenceExplorerAssistantResponse,
    EvidenceExplorerFacetBucket,
    EvidenceExplorerWorkspaceResponse,
} from '@metrev/domain-contracts';

import type { EvidenceExplorerSourceFilter } from '@/components/evidence-explorer/evidence-explorer-toolbar';
import { EvidenceExplorerToolbar } from '@/components/evidence-explorer/evidence-explorer-toolbar';
import { EvidenceReviewTable } from '@/components/evidence-review/evidence-review-table';
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
import {
    apiBaseUrl,
    fetchEvidenceExplorerAssistant,
    fetchEvidenceExplorerWorkspace,
} from '@/lib/api';
import {
    useEvidenceExplorerTab,
    type EvidenceExplorerTab,
} from '@/lib/evidence-explorer-view-query-state';
import {
    useEvidenceReviewQueryState,
    type EvidenceReviewFilter,
} from '@/lib/evidence-review-query-state';
import { formatToken } from '@/lib/formatting';

void React;

function resolveWorkspaceHref(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  return `${apiBaseUrl}${href}`;
}

function assistantMeta(
  assistantResponse: EvidenceExplorerAssistantResponse | null,
) {
  if (!assistantResponse) {
    return [];
  }

  const metadata = assistantResponse.assistant.narrative_metadata;

  return [
    metadata.mode ? `${formatToken(metadata.mode)} mode` : null,
    metadata.status ? `${formatToken(metadata.status)} status` : null,
    metadata.provider ?? null,
    metadata.model ?? null,
    `Prompt ${metadata.prompt_version}`,
    metadata.fallback_used ? 'Fallback used' : null,
  ].filter(Boolean) as string[];
}

function ExplorerFacetCard({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: EvidenceExplorerFacetBucket[];
  title: string;
}) {
  return (
    <WorkspaceDataCard>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul className="list-block">
          {items.slice(0, 5).map((item) => (
            <li key={`${title}-${item.value}`}>
              {item.label} ({item.count})
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{emptyLabel}</p>
      )}
    </WorkspaceDataCard>
  );
}

export function ExternalEvidenceExplorer() {
  const { filter, searchInput, setFilter, setSearchInput } =
    useEvidenceReviewQueryState();
  const [activeTab, setActiveTab] = useEvidenceExplorerTab();
  const deferredSearch = useDeferredValue(searchInput);
  const [sourceType, setSourceType] =
    React.useState<EvidenceExplorerSourceFilter>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [assistantRequested, setAssistantRequested] = React.useState(false);

  const query = useQuery({
    queryKey: [
      'evidence-explorer-workspace',
      filter,
      deferredSearch,
      sourceType,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchEvidenceExplorerWorkspace({
        status: filter === 'all' ? undefined : filter,
        query: deferredSearch,
        sourceType: sourceType === 'all' ? undefined : sourceType,
        page,
        pageSize,
      }),
  });

  const assistantQuery = useQuery({
    queryKey: [
      'evidence-explorer-assistant',
      filter,
      deferredSearch,
      sourceType,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchEvidenceExplorerAssistant({
        status: filter === 'all' ? undefined : filter,
        query: deferredSearch,
        sourceType: sourceType === 'all' ? undefined : sourceType,
        page,
        pageSize,
      }),
    enabled: assistantRequested,
  });

  React.useEffect(() => {
    setAssistantRequested(false);
  }, [filter, deferredSearch, sourceType, page, pageSize]);

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

  function handleSourceTypeChange(nextValue: EvidenceExplorerSourceFilter) {
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
        query.data?.summary.total_pages ?? currentValue,
        currentValue + 1,
      ),
    );
  }

  function handleAssistantRequest() {
    setAssistantRequested(true);
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
  if (!workspace) {
    return (
      <WorkspaceEmptyState
        description="The explorer workspace payload could not be loaded."
        title="Evidence explorer unavailable"
      />
    );
  }

  return (
    <EvidenceExplorerView
      filter={filter}
      onFilterChange={handleFilterChange}
      onNextPage={handleNextPage}
      onPageSizeChange={handlePageSizeChange}
      onPreviousPage={handlePreviousPage}
      onRequestAssistant={handleAssistantRequest}
      onSearchInputChange={handleSearchInputChange}
      onSourceTypeChange={handleSourceTypeChange}
      page={page}
      pageSize={pageSize}
      searchInput={searchInput}
      sourceType={sourceType}
      assistant={assistantRequested ? (assistantQuery.data ?? null) : null}
      assistantError={
        assistantRequested && assistantQuery.error
          ? assistantQuery.error.message
          : null
      }
      assistantRequested={assistantRequested}
      assistantRunning={assistantQuery.isFetching}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      workspace={workspace}
    />
  );
}

export function EvidenceExplorerView({
  activeTab = 'catalog',
  assistant,
  assistantError,
  assistantRequested,
  assistantRunning,
  filter,
  onFilterChange,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
  onRequestAssistant,
  onSearchInputChange,
  onSourceTypeChange,
  onTabChange,
  page,
  pageSize,
  searchInput,
  sourceType,
  workspace,
}: {
  activeTab?: EvidenceExplorerTab;
  assistant: EvidenceExplorerAssistantResponse | null;
  assistantError: string | null;
  assistantRequested: boolean;
  assistantRunning: boolean;
  filter: EvidenceReviewFilter;
  onFilterChange: (nextFilter: EvidenceReviewFilter) => void;
  onNextPage: () => void;
  onPageSizeChange: (nextValue: number) => void;
  onPreviousPage: () => void;
  onRequestAssistant: () => void;
  onSearchInputChange: (nextValue: string) => void;
  onSourceTypeChange: (nextValue: EvidenceExplorerSourceFilter) => void;
  onTabChange?: (nextTab: EvidenceExplorerTab) => void;
  page: number;
  pageSize: number;
  searchInput: string;
  sourceType: EvidenceExplorerSourceFilter;
  workspace: EvidenceExplorerWorkspaceResponse;
}) {
  const spotlightIds = workspace.spotlight.map((item) => item.id);
  const visibleItems = workspace.items;
  const presentation = workspace.presentation;
  const exportHref = resolveWorkspaceHref(workspace.export_csv_href);
  const summaryItems = [
    {
      detail:
        'Rows currently visible on the returned page for the active filter state.',
      key: 'returned',
      label: 'Visible page rows',
      tone: 'accent' as const,
      value: workspace.warehouse_snapshot.returned_item_count,
    },
    {
      detail:
        'Claims represented across the full filtered warehouse, not just the current page slice.',
      key: 'claims',
      label: 'Warehouse claims',
      tone: 'success' as const,
      value: workspace.warehouse_snapshot.claim_count,
    },
    {
      detail:
        'Matching warehouse rows that retain a DOI for citation-aware follow-up.',
      key: 'doi',
      label: 'Warehouse rows with DOI',
      tone: 'default' as const,
      value: workspace.warehouse_snapshot.doi_count,
    },
    {
      detail:
        'Matching warehouse rows that expose an external source URL for direct inspection.',
      key: 'linked',
      label: 'Linked warehouse rows',
      tone: 'warning' as const,
      value: workspace.warehouse_snapshot.linked_source_count,
    },
  ];
  const tabItems = presentation?.tabs.map((tab) => ({
    value: tab.key,
    label: tab.label,
    badge:
      tab.key === 'facets'
        ? workspace.warehouse_facets.source_types.length +
          workspace.warehouse_facets.evidence_types.length
        : tab.key === 'assistant'
          ? assistantRequested
            ? 1
            : undefined
          : tab.key === 'exports'
            ? 1
            : visibleItems.length,
  })) ?? [
    { value: 'catalog', label: 'Catalog', badge: visibleItems.length },
    {
      value: 'facets',
      label: 'Facets',
      badge:
        workspace.warehouse_facets.source_types.length +
        workspace.warehouse_facets.evidence_types.length,
    },
    { value: 'assistant', label: 'Assistant' },
    { value: 'exports', label: 'Exports', badge: 1 },
  ];

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            {presentation?.primary_actions.map((action) =>
              action.href.startsWith('/api/') ? (
                <a
                  className="button secondary"
                  href={resolveWorkspaceHref(action.href)}
                  key={action.key}
                >
                  {action.label}
                </a>
              ) : (
                <Link
                  className="button secondary"
                  href={action.href}
                  key={action.key}
                >
                  {action.label}
                </Link>
              ),
            )}
            <Link className="button secondary" href="/cases/new">
              Open stack cockpit
            </Link>
          </>
        }
        badge="Evidence explorer"
        chips={
          presentation?.badges.map((badge) => badge.label) ?? [
            `${workspace.summary.total} records`,
            `${workspace.summary.pending} pending review`,
            `${workspace.summary.accepted} intake-ready`,
          ]
        }
        description={
          presentation?.short_summary ??
          'Navigate the local evidence warehouse through server-backed search, source filters, and review posture slices before opening the full record detail. This surface is read-first and keeps provenance explicit.'
        }
        title={presentation?.page_title ?? 'Evidence intelligence explorer'}
      />

      <SummaryRail items={summaryItems} label="Evidence explorer summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={tabItems}
        label="Evidence explorer tabs"
        onTabChange={(value) => {
          if (
            value === 'catalog' ||
            value === 'facets' ||
            value === 'assistant' ||
            value === 'exports'
          ) {
            onTabChange?.(value);
          }
        }}
        summary="Split dense warehouse navigation into catalog, facet, assistant, and export layers without hiding provenance or filters."
        title="Explorer layers"
      >
        <TabsContent value="catalog">
          <WorkspaceSection
            description="Move through the evidence base by status, source, and search terms without switching into batch-review mode."
            eyebrow="Explorer controls"
            title="Search, filter, and navigate"
          >
            <EvidenceExplorerToolbar
              filter={filter}
              onFilterChange={onFilterChange}
              onNextPage={onNextPage}
              onPageSizeChange={onPageSizeChange}
              onPreviousPage={onPreviousPage}
              onSearchInputChange={onSearchInputChange}
              onSourceTypeChange={onSourceTypeChange}
              page={page}
              pageSize={pageSize}
              searchInput={searchInput}
              sourceType={sourceType}
              totalCount={workspace.summary.total}
              visibleSummary={workspace.summary}
            />
          </WorkspaceSection>

          <div className="workspace-split-grid">
            <WorkspaceSection
              description="The spotlight slice keeps the highest-signal records visible while the full catalog stays dense below."
              eyebrow="Spotlight"
              title="Curated spotlight"
            >
              <EvidenceReviewTable
                detailActionLabel="Open evidence detail"
                detailHrefBase="/evidence/explorer"
                emptyDescription="No spotlight records match the current filter state."
                emptyTitle="No spotlight items"
                items={workspace.spotlight}
              />
            </WorkspaceSection>

            <WorkspaceSection
              description="Grouped tables reuse the same slice data to separate intake-ready records from the most recently published records on the current page."
              eyebrow="Grouped tables"
              title="Intake-ready records"
            >
              <EvidenceReviewTable
                detailActionLabel="Open evidence detail"
                detailHrefBase="/evidence/explorer"
                emptyDescription="No accepted records are present on the current slice."
                emptyTitle="No intake-ready items"
                items={workspace.table_groups.intake_ready}
              />
            </WorkspaceSection>
          </div>

          <div className="workspace-split-grid">
            <WorkspaceSection
              description="Publication ordering remains explicit, but only for the currently returned slice."
              eyebrow="Grouped tables"
              title="Recently published on this page"
            >
              <EvidenceReviewTable
                detailActionLabel="Open evidence detail"
                detailHrefBase="/evidence/explorer"
                emptyDescription="No publication timestamps are available on the current slice."
                emptyTitle="No recent publication rows"
                items={workspace.table_groups.recently_published}
              />
            </WorkspaceSection>

            <WorkspaceSection
              description="The explorer keeps the full warehouse slice visible with provenance, review posture, and direct links into the tabbed detail surface."
              eyebrow="Catalog"
              title="Full explorer catalog"
            >
              <EvidenceReviewTable
                detailActionLabel="Open evidence detail"
                detailHrefBase="/evidence/explorer"
                emptyDescription="Adjust the current filter or search string to widen the explorer catalog."
                emptyTitle="No catalog items"
                highlightIds={spotlightIds}
                items={visibleItems}
              />
            </WorkspaceSection>
          </div>
        </TabsContent>

        <TabsContent value="facets">
          <WorkspaceSection
            description="These facet buckets are computed from the filtered warehouse in the repository layer, so their counts stay aligned with the full result set instead of only the current page."
            eyebrow="Warehouse facets"
            title="Filtered warehouse snapshot"
          >
            <div className="workspace-card-list">
              <ExplorerFacetCard
                emptyLabel="No source types are present in this filtered warehouse."
                items={workspace.warehouse_facets.source_types}
                title="Source types"
              />
              <ExplorerFacetCard
                emptyLabel="No evidence types are present in this filtered warehouse."
                items={workspace.warehouse_facets.evidence_types}
                title="Evidence types"
              />
              <ExplorerFacetCard
                emptyLabel="No review states are present in this filtered warehouse."
                items={workspace.warehouse_facets.review_statuses}
                title="Review states"
              />
              <ExplorerFacetCard
                emptyLabel="No publisher metadata is present in this filtered warehouse."
                items={workspace.warehouse_facets.publishers}
                title="Publishers"
              />
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="assistant">
          <WorkspaceSection
            description="Generate an explicit, local-first assistance brief only when needed. The assistant cites current-page spotlight rows and keeps warehouse scope, provenance, and uncertainty visible instead of hiding them in generic prose."
            eyebrow="Assistant"
            title="Evidence assistant"
          >
            <div className="workspace-card-list">
              <WorkspaceDataCard tone="accent">
                <div className="workspace-data-card__header">
                  <div>
                    <span className="badge subtle">Local-first brief</span>
                    <h3>Warehouse-aware evidence briefing</h3>
                  </div>
                  <span className="meta-chip">
                    {workspace.warehouse_snapshot.filtered_item_count} matching
                    row(s)
                  </span>
                </div>
                <p>
                  This brief never upgrades pending evidence into accepted
                  evidence. It summarizes the filtered warehouse snapshot and
                  the current-page spotlight rows only after you request it.
                </p>
                <div className="workspace-action-row">
                  <button
                    className="button secondary"
                    onClick={onRequestAssistant}
                    type="button"
                  >
                    {assistantRunning
                      ? 'Generating assistant brief...'
                      : 'Generate assistant brief'}
                  </button>
                </div>
                {assistantRequested ? (
                  assistant ? (
                    <>
                      <div className="workspace-chip-list compact">
                        {assistantMeta(assistant).map((item) => (
                          <span className="meta-chip" key={item}>
                            {item}
                          </span>
                        ))}
                      </div>
                      <p>
                        {assistant.assistant.summary ??
                          'Assistant generation is disabled for this runtime, so no narrative summary was returned.'}
                      </p>
                      <div className="workspace-detail-grid">
                        <article className="workspace-inline-card">
                          <h3>Provenance</h3>
                          <p>{assistant.assistant.provenance_summary}</p>
                        </article>
                        <article className="workspace-inline-card">
                          <h3>Uncertainty</h3>
                          <p>{assistant.assistant.uncertainty_summary}</p>
                        </article>
                      </div>
                      <div className="workspace-detail-grid">
                        <article className="workspace-inline-card">
                          <h3>Recommended next checks</h3>
                          <ul className="list-block">
                            {assistant.assistant.recommended_next_checks.map(
                              (item) => (
                                <li key={item}>{item}</li>
                              ),
                            )}
                          </ul>
                        </article>
                        <article className="workspace-inline-card">
                          <h3>Cited spotlight rows</h3>
                          {assistant.assistant.cited_evidence_ids.length > 0 ? (
                            <div className="workspace-chip-list compact">
                              {assistant.assistant.cited_evidence_ids.map(
                                (id) => (
                                  <span className="meta-chip" key={id}>
                                    {id}
                                  </span>
                                ),
                              )}
                            </div>
                          ) : (
                            <p className="muted">
                              No current-page spotlight rows were available to
                              cite.
                            </p>
                          )}
                        </article>
                      </div>
                      {assistant.assistant.narrative_metadata.error_message ? (
                        <p className="muted">
                          {assistant.assistant.narrative_metadata.error_message}
                        </p>
                      ) : null}
                    </>
                  ) : assistantError ? (
                    <p className="error">{assistantError}</p>
                  ) : (
                    <p className="muted">
                      The assistant request is still preparing a response.
                    </p>
                  )
                ) : (
                  <p className="muted">
                    Generate the brief when you want a warehouse-aware summary
                    for the current filters.
                  </p>
                )}
              </WorkspaceDataCard>
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="exports">
          <div className="workspace-detail-grid">
            <WorkspaceDataCard>
              <span className="badge subtle">Export current slice</span>
              <h3>CSV handoff</h3>
              <p>
                Export links preserve the current filter state so downstream
                review and offline inspection stay aligned with the visible
                warehouse slice.
              </p>
              <div className="workspace-action-row">
                <a className="button secondary" href={exportHref}>
                  Export current slice CSV
                </a>
              </div>
            </WorkspaceDataCard>
            <WorkspaceDataCard>
              <span className="badge subtle">Current filter state</span>
              <div className="workspace-chip-list compact">
                <span className="meta-chip">Status: {filter}</span>
                <span className="meta-chip">Source: {sourceType}</span>
                <span className="meta-chip">
                  Query: {searchInput || 'none'}
                </span>
                <span className="meta-chip">Page size: {pageSize}</span>
              </div>
              <p>
                {workspace.warehouse_snapshot.filtered_item_count} matching
                record(s) remain in scope for the current export link.
              </p>
            </WorkspaceDataCard>
          </div>
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
