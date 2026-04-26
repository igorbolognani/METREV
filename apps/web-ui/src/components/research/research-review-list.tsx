'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type { ResearchReviewSummary } from '@metrev/domain-contracts';

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
import { createResearchReview, fetchResearchReviews } from '@/lib/api';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

type ResearchReviewListTab = 'create' | 'reviews';

export function ResearchReviewListView({
  activeTab = 'create',
  createError,
  createPending,
  limit,
  onCreate,
  onLimitChange,
  onSearchQueryChange,
  onTabChange,
  onTitleChange,
  reviews,
  searchQuery,
  title,
}: {
  activeTab?: ResearchReviewListTab;
  createError?: Error | null;
  createPending: boolean;
  limit: number;
  onCreate: () => void;
  onLimitChange: (limit: number) => void;
  onSearchQueryChange: (query: string) => void;
  onTabChange?: (nextTab: ResearchReviewListTab) => void;
  onTitleChange: (title: string) => void;
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
              <div className="workspace-action-row">
                <button
                  disabled={createPending || searchQuery.trim().length < 3}
                  onClick={onCreate}
                  type="button"
                >
                  {createPending ? 'Creating...' : 'Create review'}
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
  const [title, setTitle] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState(
    'microbial fuel cell wastewater carbon felt',
  );
  const [limit, setLimit] = React.useState(25);

  const query = useQuery({
    queryKey: ['research-reviews'],
    queryFn: fetchResearchReviews,
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createResearchReview({
        title: title.trim() || undefined,
        query: searchQuery,
        limit,
      }),
    onSuccess: async (review) => {
      await queryClient.invalidateQueries({ queryKey: ['research-reviews'] });
      router.push(`/research/reviews/${review.review_id}`);
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

  return (
    <ResearchReviewListView
      activeTab={activeTab}
      createError={createMutation.error}
      createPending={createMutation.isPending}
      limit={limit}
      onCreate={() => createMutation.mutate()}
      onLimitChange={setLimit}
      onSearchQueryChange={setSearchQuery}
      onTabChange={setActiveTab}
      onTitleChange={setTitle}
      reviews={reviews}
      searchQuery={searchQuery}
      title={title}
    />
  );
}
