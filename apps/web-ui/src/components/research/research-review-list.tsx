'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type { ResearchReviewSummary } from '@metrev/domain-contracts';

import {
  WorkspaceDataCard,
  WorkspaceEmptyState,
  WorkspacePageHeader,
  WorkspaceSection,
  WorkspaceSkeleton,
  WorkspaceStatCard,
} from '@/components/workspace-chrome';
import { createResearchReview, fetchResearchReviews } from '@/lib/api';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

export function ResearchReviewListView({
  createError,
  createPending,
  limit,
  onCreate,
  onLimitChange,
  onSearchQueryChange,
  onTitleChange,
  reviews,
  searchQuery,
  title,
}: {
  createError?: Error | null;
  createPending: boolean;
  limit: number;
  onCreate: () => void;
  onLimitChange: (limit: number) => void;
  onSearchQueryChange: (query: string) => void;
  onTitleChange: (title: string) => void;
  reviews: ResearchReviewSummary[];
  searchQuery: string;
  title: string;
}) {
  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Research tables"
        chips={[`${reviews.length} reviews`]}
        description="Create structured literature review tables from the local evidence warehouse and promote validated extraction results into evidence packs."
        title="Research intelligence"
      />

      <section className="workspace-stats-grid">
        <WorkspaceStatCard
          detail="Structured review tables currently stored in this workspace."
          label="Review tables"
          tone="accent"
          value={reviews.length}
        />
        <WorkspaceStatCard
          detail="Papers attached across all listed review tables."
          label="Paper rows"
          value={reviews.reduce((total, review) => total + review.paper_count, 0)}
        />
        <WorkspaceStatCard
          detail="Validated or invalid cell results saved by extraction runs."
          label="Extraction results"
          tone="success"
          value={reviews.reduce(
            (total, review) => total + review.completed_result_count,
            0,
          )}
        />
      </section>

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
                onChange={(event) => onSearchQueryChange(event.target.value)}
                value={searchQuery}
              />
            </label>
            <label>
              <span>Limit</span>
              <input
                max={100}
                min={1}
                onChange={(event) => onLimitChange(Number(event.target.value))}
                type="number"
                value={limit}
              />
            </label>
          </div>
          {createError ? <p className="error">{createError.message}</p> : null}
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
                  <span className="meta-chip">{review.paper_count} papers</span>
                  <span className="meta-chip">{review.column_count} columns</span>
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
    </div>
  );
}

export function ResearchReviewListWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      createError={createMutation.error}
      createPending={createMutation.isPending}
      limit={limit}
      onCreate={() => createMutation.mutate()}
      onLimitChange={setLimit}
      onSearchQueryChange={setSearchQuery}
      onTitleChange={setTitle}
      reviews={reviews}
      searchQuery={searchQuery}
      title={title}
    />
  );
}
