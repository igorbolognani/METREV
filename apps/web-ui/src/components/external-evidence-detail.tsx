'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import {
  WorkspaceDataCard,
  WorkspaceEmptyState,
  WorkspacePageHeader,
  WorkspaceSection,
  WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import {
  fetchExternalEvidenceCatalogItem,
  reviewExternalEvidenceCatalogItem,
} from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

function prettyUnknown(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function ExternalEvidenceDetail({
  catalogItemId,
  canReview,
}: {
  catalogItemId: string;
  canReview: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['external-evidence-detail', catalogItemId],
    queryFn: () => fetchExternalEvidenceCatalogItem(catalogItemId),
  });

  const mutation = useMutation({
    mutationFn: (action: 'accept' | 'reject') =>
      reviewExternalEvidenceCatalogItem(catalogItemId, { action }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['evidence-review-workspace'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['external-evidence'],
      });
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

  const item = query.data;
  if (!item) {
    return (
      <WorkspaceEmptyState
        title="Record not found"
        description="The requested catalog item does not exist anymore."
        primaryHref="/evidence/review"
        primaryLabel="Back to review queue"
      />
    );
  }

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Evidence detail"
        title={item.title}
        description={item.summary}
        chips={[
          formatToken(item.review_status),
          formatToken(item.source_type),
          formatToken(item.strength_level),
        ]}
        actions={
          <>
            <Link className="button secondary" href="/evidence/review">
              Back to queue
            </Link>
            <Link className="button secondary" href="/cases/new">
              Open input deck
            </Link>
            {canReview ? (
              <>
                <button
                  type="button"
                  onClick={() => mutation.mutate('accept')}
                  disabled={mutation.isPending || item.review_status === 'accepted'}
                >
                  {mutation.isPending ? 'Saving...' : 'Accept for intake'}
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => mutation.mutate('reject')}
                  disabled={mutation.isPending || item.review_status === 'rejected'}
                >
                  Reject
                </button>
              </>
            ) : null}
          </>
        }
      />

      {mutation.error ? <p className="error">{mutation.error.message}</p> : null}

      <div className="workspace-split-grid">
        <WorkspaceSection
          eyebrow="Source metadata"
          title="Record posture"
        >
          <WorkspaceDataCard>
            <div className="workspace-form-grid workspace-form-grid--two">
              <div>
                <span className="muted">Evidence type</span>
                <strong>{formatToken(item.evidence_type)}</strong>
              </div>
              <div>
                <span className="muted">Source state</span>
                <strong>{formatToken(item.source_state)}</strong>
              </div>
              <div>
                <span className="muted">Publisher</span>
                <strong>{item.publisher ?? 'Not stated'}</strong>
              </div>
              <div>
                <span className="muted">Published</span>
                <strong>{item.published_at ?? 'Not stated'}</strong>
              </div>
            </div>
            <p className="muted">Provenance note: {item.provenance_note}</p>
          </WorkspaceDataCard>
        </WorkspaceSection>

        <WorkspaceSection eyebrow="Applicability" title="Scope and abstract">
          <WorkspaceDataCard>
            <h3>Applicability scope</h3>
            <pre className="code-block">{prettyUnknown(item.applicability_scope)}</pre>
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Extracted claims</h3>
            <pre className="code-block">{prettyUnknown(item.extracted_claims)}</pre>
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Abstract</h3>
            <p>{item.abstract_text ?? 'No abstract text was stored for this record.'}</p>
          </WorkspaceDataCard>
        </WorkspaceSection>
      </div>

      <WorkspaceSection eyebrow="Stored payloads" title="Audit view">
        <div className="workspace-detail-grid">
          <WorkspaceDataCard>
            <h3>Catalog payload</h3>
            <pre className="code-block">{prettyUnknown(item.payload)}</pre>
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Raw source payload</h3>
            <pre className="code-block">{prettyUnknown(item.raw_payload)}</pre>
          </WorkspaceDataCard>
        </div>
      </WorkspaceSection>
    </div>
  );
}
