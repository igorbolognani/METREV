'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type {
  ResearchBackfillSummary,
  ResearchPaperMetadata,
  ResearchPaperSearchFailure,
  ResearchPaperSearchResult,
  ResearchReviewSummary,
} from '@metrev/domain-contracts';

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
  createResearchReview,
  fetchResearchBackfills,
  fetchResearchReviews,
  queueResearchBackfill,
  searchResearchPapers,
  stageResearchPapers,
} from '@/lib/api';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

type ResearchReviewListTab = 'create' | 'reviews';

function searchResultKey(result: ResearchPaperSearchResult) {
  return `${result.source_type}:${result.source_key}`;
}

export function ResearchReviewListView({
  activeTab = 'create',
  backfillError,
  backfillMaxPages,
  backfillPending,
  backfills,
  createError,
  createDisabled,
  createPending,
  importError,
  importPending,
  importedPapers,
  limit,
  onBackfillMaxPagesChange,
  onCreate,
  onImportSelected,
  onLimitChange,
  onQueueBackfill,
  onRunSearch,
  onSearchQueryChange,
  onTabChange,
  onToggleSearchResult,
  onTitleChange,
  searchFailures,
  searchPending,
  searchResults,
  selectedSearchResultKeys,
  reviews,
  searchQuery,
  title,
}: {
  activeTab?: ResearchReviewListTab;
  backfillError?: Error | null;
  backfillMaxPages: number;
  backfillPending: boolean;
  backfills: ResearchBackfillSummary[];
  createError?: Error | null;
  createDisabled?: boolean;
  createPending: boolean;
  importError?: Error | null;
  importPending: boolean;
  importedPapers: ResearchPaperMetadata[];
  limit: number;
  onBackfillMaxPagesChange: (pages: number) => void;
  onCreate: () => void;
  onImportSelected: () => void;
  onLimitChange: (limit: number) => void;
  onQueueBackfill: () => void;
  onRunSearch: () => void;
  onSearchQueryChange: (query: string) => void;
  onTabChange?: (nextTab: ResearchReviewListTab) => void;
  onToggleSearchResult: (resultKey: string) => void;
  onTitleChange: (title: string) => void;
  searchFailures: ResearchPaperSearchFailure[];
  searchPending: boolean;
  searchResults: ResearchPaperSearchResult[];
  selectedSearchResultKeys: string[];
  reviews: ResearchReviewSummary[];
  searchQuery: string;
  title: string;
}) {
  const summaryItems = [
    {
      detail: 'Structured review tables currently stored in this workspace.',
      key: 'reviews',
      label: 'Review tables',
      tone: 'accent' as const,
      value: reviews.length,
    },
    {
      detail: 'Papers attached across all listed review tables.',
      key: 'papers',
      label: 'Paper rows',
      tone: 'default' as const,
      value: reviews.reduce((total, review) => total + review.paper_count, 0),
    },
    {
      detail: 'Validated or invalid cell results saved by extraction runs.',
      key: 'results',
      label: 'Extraction results',
      tone: 'success' as const,
      value: reviews.reduce(
        (total, review) => total + review.completed_result_count,
        0,
      ),
    },
  ];

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Research tables"
        chips={[`${reviews.length} reviews`]}
        description="Create structured literature review tables from the local evidence warehouse and promote validated extraction results into evidence packs."
        title="Research intelligence"
      />

      <SummaryRail items={summaryItems} label="Research review summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={[
          {
            value: 'create',
            label: 'Create',
            badge: createPending ? 1 : undefined,
          },
          { value: 'reviews', label: 'Reviews', badge: reviews.length },
        ]}
        label="Research review tabs"
        onTabChange={(value) => {
          if (value === 'create' || value === 'reviews') {
            onTabChange?.(value);
          }
        }}
        summary="Separate authoring a new review from browsing existing tables so the research workspace keeps one active intent at a time."
        title="Research layers"
      >
        <TabsContent value="create">
          <WorkspaceSection title="Create review" eyebrow="Search">
            <WorkspaceDataCard tone="accent">
              <div className="form-grid">
                <label>
                  <span>Title</span>
                  <input
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder="MFC wastewater material review"
                    value={title}
                  />
                </label>
                <label>
                  <span>Query</span>
                  <input
                    onChange={(event) =>
                      onSearchQueryChange(event.target.value)
                    }
                    value={searchQuery}
                  />
                </label>
                <label>
                  <span>Limit</span>
                  <input
                    max={100}
                    min={1}
                    onChange={(event) =>
                      onLimitChange(Number(event.target.value))
                    }
                    type="number"
                    value={limit}
                  />
                </label>
              </div>
              {createError ? (
                <p className="error">{createError.message}</p>
              ) : null}
              {importError ? (
                <p className="error">{importError.message}</p>
              ) : null}
              <div className="workspace-action-row">
                <button
                  disabled={searchPending || searchQuery.trim().length < 3}
                  onClick={onRunSearch}
                  type="button"
                >
                  {searchPending ? 'Searching...' : 'Search external sources'}
                </button>
                <button
                  disabled={
                    createDisabled ??
                    (createPending || searchQuery.trim().length < 3)
                  }
                  onClick={onCreate}
                  type="button"
                >
                  {createPending
                    ? 'Creating...'
                    : importedPapers.length > 0
                      ? 'Create review from imported papers'
                      : 'Create review'}
                </button>
              </div>
            </WorkspaceDataCard>

            <WorkspaceDataCard>
              <div className="workspace-data-card__header">
                <div>
                  <span className="badge subtle">Backfill queue</span>
                  <h3>Warehouse backfill</h3>
                </div>
                <div className="workspace-chip-list compact">
                  <span className="meta-chip">{backfills.length} run(s)</span>
                  <span className="meta-chip">{backfillMaxPages} page(s)</span>
                </div>
              </div>
              <p>
                Queue a resumable multi-page provider import for the current
                query so the evidence warehouse can grow beyond the manually
                selected review rows.
              </p>
              <div className="form-grid">
                <label>
                  <span>Current query</span>
                  <input readOnly value={searchQuery} />
                </label>
                <label>
                  <span>Per-provider limit</span>
                  <input readOnly value={limit} />
                </label>
                <label>
                  <span>Max pages</span>
                  <input
                    max={100}
                    min={1}
                    onChange={(event) =>
                      onBackfillMaxPagesChange(Number(event.target.value))
                    }
                    type="number"
                    value={backfillMaxPages}
                  />
                </label>
              </div>
              {backfillError ? (
                <p className="error">{backfillError.message}</p>
              ) : null}
              <div className="workspace-action-row">
                <button
                  disabled={backfillPending || searchQuery.trim().length < 3}
                  onClick={onQueueBackfill}
                  type="button"
                >
                  {backfillPending ? 'Queueing...' : 'Queue warehouse backfill'}
                </button>
              </div>
              {backfills.length === 0 ? (
                <p className="muted">
                  No resumable backfills are queued yet for this workspace.
                </p>
              ) : (
                <div className="workspace-card-list">
                  {backfills.map((backfill) => (
                    <WorkspaceDataCard key={backfill.run_id} tone="default">
                      <div className="workspace-data-card__header">
                        <div>
                          <span className="badge subtle">
                            {formatToken(backfill.status)}
                          </span>
                          <h3>{backfill.query}</h3>
                        </div>
                      </div>
                      <div className="workspace-chip-list compact">
                        <span className="meta-chip">
                          Providers{' '}
                          {backfill.providers.length > 0
                            ? backfill.providers
                                .map((provider) => formatToken(provider))
                                .join(', ')
                            : 'all'}
                        </span>
                        <span className="meta-chip">
                          Pages {backfill.pages_completed}/{backfill.max_pages}
                        </span>
                        <span className="meta-chip">
                          Stored {backfill.records_stored}
                        </span>
                        <span className="meta-chip">
                          Updated {formatTimestamp(backfill.updated_at)}
                        </span>
                      </div>
                      {backfill.failure_message ? (
                        <p className="error">{backfill.failure_message}</p>
                      ) : null}
                    </WorkspaceDataCard>
                  ))}
                </div>
              )}
            </WorkspaceDataCard>

            <WorkspaceDataCard>
              <div className="workspace-data-card__header">
                <div>
                  <span className="badge subtle">Live search</span>
                  <h3>External paper search</h3>
                </div>
                <div className="workspace-chip-list compact">
                  <span className="meta-chip">
                    {searchResults.length} result(s)
                  </span>
                  <span className="meta-chip">
                    {importedPapers.length} imported
                  </span>
                </div>
              </div>
              <p>
                Search OpenAlex, Crossref, and Europe PMC live, then stage the
                selected records into the canonical METREV evidence warehouse
                before creating the review.
              </p>
              {searchFailures.length > 0 ? (
                <ul className="list-block">
                  {searchFailures.map((failure) => (
                    <li key={failure.provider}>
                      {formatToken(failure.provider)}: {failure.message}
                    </li>
                  ))}
                </ul>
              ) : null}
              {searchResults.length === 0 ? (
                <p className="muted">
                  Run a live search to review external papers before import.
                </p>
              ) : (
                <div className="workspace-card-list">
                  {searchResults.map((result) => {
                    const resultKey = searchResultKey(result);
                    const isSelected =
                      selectedSearchResultKeys.includes(resultKey);
                    const isImported = importedPapers.some(
                      (paper) => paper.doi && paper.doi === result.doi,
                    );

                    return (
                      <WorkspaceDataCard key={resultKey} tone="accent">
                        <label className="workspace-card-checkbox">
                          <input
                            checked={isSelected}
                            onChange={() => onToggleSearchResult(resultKey)}
                            type="checkbox"
                          />
                          <span>Select</span>
                        </label>
                        <h3>{result.title}</h3>
                        <div className="workspace-chip-list compact">
                          <span className="meta-chip">
                            {formatToken(result.source_type)}
                          </span>
                          <span className="meta-chip">
                            Year {result.year ?? 'not stated'}
                          </span>
                          <span className="meta-chip">
                            Citations {result.citation_count ?? 'n/a'}
                          </span>
                          {isImported ? (
                            <span className="meta-chip">Imported</span>
                          ) : null}
                        </div>
                        <p>{result.abstract_text ?? 'No abstract returned.'}</p>
                      </WorkspaceDataCard>
                    );
                  })}
                </div>
              )}
              <div className="workspace-action-row">
                <button
                  disabled={
                    importPending || selectedSearchResultKeys.length === 0
                  }
                  onClick={onImportSelected}
                  type="button"
                >
                  {importPending ? 'Importing...' : 'Import selected papers'}
                </button>
              </div>
            </WorkspaceDataCard>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="reviews">
          <WorkspaceSection title="Review tables" eyebrow="Workspace">
            {reviews.length === 0 ? (
              <WorkspaceEmptyState
                description="No research tables exist yet."
                title="No reviews"
              />
            ) : (
              <div className="workspace-card-list">
                {reviews.map((review) => (
                  <WorkspaceDataCard key={review.review_id}>
                    <div className="workspace-data-card__header">
                      <div>
                        <span className="badge subtle">
                          {formatToken(review.status)}
                        </span>
                        <h3>{review.title}</h3>
                      </div>
                      <Link
                        className="button secondary"
                        href={`/research/reviews/${review.review_id}`}
                      >
                        Open table
                      </Link>
                    </div>
                    <p>{review.query}</p>
                    <div className="workspace-chip-list compact">
                      <span className="meta-chip">
                        {review.paper_count} papers
                      </span>
                      <span className="meta-chip">
                        {review.column_count} columns
                      </span>
                      <span className="meta-chip">
                        {review.completed_result_count} results
                      </span>
                      <span className="meta-chip">
                        Updated {formatTimestamp(review.updated_at)}
                      </span>
                    </div>
                  </WorkspaceDataCard>
                ))}
              </div>
            )}
          </WorkspaceSection>
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}

export function ResearchReviewListWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] =
    React.useState<ResearchReviewListTab>('create');
  const [backfillMaxPages, setBackfillMaxPages] = React.useState(3);
  const [title, setTitle] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState(
    'microbial fuel cell wastewater carbon felt',
  );
  const [limit, setLimit] = React.useState(25);
  const [searchResults, setSearchResults] = React.useState<
    ResearchPaperSearchResult[]
  >([]);
  const [searchFailures, setSearchFailures] = React.useState<
    ResearchPaperSearchFailure[]
  >([]);
  const [selectedSearchResultKeys, setSelectedSearchResultKeys] =
    React.useState<string[]>([]);
  const [importedPapers, setImportedPapers] = React.useState<
    ResearchPaperMetadata[]
  >([]);

  const query = useQuery({
    queryKey: ['research-reviews'],
    queryFn: fetchResearchReviews,
  });
  const backfillsQuery = useQuery({
    queryKey: ['research-backfills'],
    queryFn: fetchResearchBackfills,
  });
  const searchMutation = useMutation({
    mutationFn: () =>
      searchResearchPapers({
        query: searchQuery,
        limit: Math.min(limit, 15),
      }),
    onSuccess: (response) => {
      setSearchResults(response.items);
      setSearchFailures(response.failed_providers);
      setSelectedSearchResultKeys([]);
      setImportedPapers([]);
    },
  });
  const importMutation = useMutation({
    mutationFn: () =>
      stageResearchPapers({
        query: searchQuery,
        items: searchResults.filter((result) =>
          selectedSearchResultKeys.includes(searchResultKey(result)),
        ),
      }),
    onSuccess: (response) => {
      setImportedPapers(response.papers);
    },
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createResearchReview({
        title: title.trim() || undefined,
        query: searchQuery,
        limit,
        source_document_ids:
          importedPapers.length > 0
            ? importedPapers.map((paper) => paper.source_document_id)
            : undefined,
      }),
    onSuccess: async (review) => {
      await queryClient.invalidateQueries({ queryKey: ['research-reviews'] });
      router.push(`/research/reviews/${review.review_id}`);
    },
  });
  const backfillMutation = useMutation({
    mutationFn: () =>
      queueResearchBackfill({
        query: searchQuery,
        per_provider_limit: Math.min(limit, 100),
        max_pages: backfillMaxPages,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['research-backfills'] });
    },
  });

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

  const reviews = query.data?.items ?? [];
  const backfills = backfillsQuery.data?.items ?? [];

  return (
    <ResearchReviewListView
      activeTab={activeTab}
      backfillError={
        backfillsQuery.error instanceof Error
          ? backfillsQuery.error
          : backfillMutation.error instanceof Error
            ? backfillMutation.error
            : null
      }
      backfillMaxPages={backfillMaxPages}
      backfillPending={backfillMutation.isPending}
      backfills={backfills}
      createError={createMutation.error}
      createDisabled={
        createMutation.isPending ||
        searchQuery.trim().length < 3 ||
        (selectedSearchResultKeys.length > 0 && importedPapers.length === 0)
      }
      createPending={createMutation.isPending}
      importError={importMutation.error}
      importPending={importMutation.isPending}
      importedPapers={importedPapers}
      limit={limit}
      onBackfillMaxPagesChange={(pages) =>
        setBackfillMaxPages(
          Number.isFinite(pages) && pages > 0 ? Math.min(pages, 100) : 1,
        )
      }
      onCreate={() => createMutation.mutate()}
      onImportSelected={() => importMutation.mutate()}
      onLimitChange={setLimit}
      onQueueBackfill={() => backfillMutation.mutate()}
      onRunSearch={() => searchMutation.mutate()}
      onSearchQueryChange={setSearchQuery}
      onTabChange={setActiveTab}
      onToggleSearchResult={(resultKey) => {
        setSelectedSearchResultKeys((current) =>
          current.includes(resultKey)
            ? current.filter((entry) => entry !== resultKey)
            : [...current, resultKey],
        );
      }}
      onTitleChange={setTitle}
      searchFailures={searchFailures}
      searchPending={searchMutation.isPending}
      searchResults={searchResults}
      selectedSearchResultKeys={selectedSearchResultKeys}
      reviews={reviews}
      searchQuery={searchQuery}
      title={title}
    />
  );
}
