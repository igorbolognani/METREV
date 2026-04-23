'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
    ExternalEvidenceCatalogItemDetail,
    ExternalEvidenceReviewAction,
} from '@metrev/domain-contracts';

import { EvidenceClaimsTable } from '@/components/evidence-detail/evidence-claims-table';
import { EvidenceMetadataGrid } from '@/components/evidence-detail/evidence-metadata-grid';
import { PayloadDisclosureCard } from '@/components/evidence-detail/payload-disclosure-card';
import { Textarea } from '@/components/ui/textarea';
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
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

function toStructuredClaimRows(
  item: ExternalEvidenceCatalogItemDetail,
): unknown[] {
  if (item.claims.length > 0) {
    return item.claims.map((claim) => ({
      claim: claim.content,
      detail: [
        formatToken(claim.claim_type),
        claim.extracted_value
          ? `${claim.extracted_value}${claim.unit ? ` ${claim.unit}` : ''}`
          : null,
        `Confidence ${Math.round(claim.confidence * 100)}%`,
        claim.source_snippet,
      ]
        .filter(Boolean)
        .join(' · '),
      id: claim.id,
      scope: claim.source_locator ?? claim.source_document_id,
    }));
  }

  return item.extracted_claims;
}

function buildReviewPayload(
  action: ExternalEvidenceReviewAction,
  note: string,
) {
  const trimmedNote = note.trim();

  return trimmedNote ? { action, note: trimmedNote } : { action };
}

export function ExternalEvidenceDetail({
  catalogItemId,
  canReview,
}: {
  catalogItemId: string;
  canReview: boolean;
}) {
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = React.useState('');
  const query = useQuery({
    queryKey: ['external-evidence-detail', catalogItemId],
    queryFn: () => fetchExternalEvidenceCatalogItem(catalogItemId),
  });

  const mutation = useMutation({
    mutationFn: (action: ExternalEvidenceReviewAction) =>
      reviewExternalEvidenceCatalogItem(
        catalogItemId,
        buildReviewPayload(action, reviewNote),
      ),
    onSuccess: async () => {
      setReviewNote('');

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
        description="The requested catalog item does not exist anymore."
        primaryHref="/evidence/review"
        primaryLabel="Back to review queue"
        title="Record not found"
      />
    );
  }

  return (
    <ExternalEvidenceDetailView
      canReview={canReview}
      item={item}
      mutationError={mutation.error?.message ?? null}
      mutationPending={mutation.isPending}
      onReviewAction={(action) => mutation.mutate(action)}
      onReviewNoteChange={setReviewNote}
      reviewNote={reviewNote}
    />
  );
}

export function ExternalEvidenceDetailView({
  canReview,
  item,
  mutationError,
  mutationPending,
  onReviewAction,
  onReviewNoteChange,
  reviewNote,
}: {
  canReview: boolean;
  item: ExternalEvidenceCatalogItemDetail;
  mutationError: string | null;
  mutationPending: boolean;
  onReviewAction: (action: ExternalEvidenceReviewAction) => void;
  onReviewNoteChange: (nextValue: string) => void;
  reviewNote: string;
}) {
  const metadataFields = [
    {
      detail: 'Declared evidence class',
      label: 'Evidence type',
      value: formatToken(item.evidence_type),
    },
    {
      detail: 'Review processing state',
      label: 'Source state',
      value: formatToken(item.source_state),
    },
    {
      detail: 'Origin provider',
      label: 'Source type',
      value: formatToken(item.source_type),
    },
    {
      detail: 'Local category mapping',
      label: 'Source category',
      value:
        item.source_document?.source_category ??
        item.source_category ??
        'Not stated',
    },
    {
      detail: 'Publisher or source owner',
      label: 'Publisher',
      value: item.source_document?.publisher ?? item.publisher ?? 'Not stated',
    },
    {
      detail: 'Publication timestamp',
      label: 'Published',
      value:
        item.source_document?.published_at ?? item.published_at ?? 'Not stated',
    },
    {
      detail: 'Digital object identifier',
      label: 'DOI',
      value: item.source_document?.doi ?? item.doi ?? 'Not stated',
    },
    {
      detail: 'External source URL',
      label: 'Source URL',
      value:
        (item.source_document?.source_url ?? item.source_url) ? (
          <a
            href={item.source_document?.source_url ?? item.source_url ?? '#'}
            rel="noreferrer"
            target="_blank"
          >
            Open source record
          </a>
        ) : (
          'Not stated'
        ),
    },
    {
      detail: 'Catalog insertion time',
      label: 'Created',
      value: formatTimestamp(item.created_at),
    },
    {
      detail: 'Most recent update',
      label: 'Updated',
      value: formatTimestamp(item.updated_at),
    },
  ];
  const applicabilityEntryCount = Object.keys(
    item.applicability_scope ?? {},
  ).length;
  const structuredClaims = toStructuredClaimRows(item);
  const sourceDocument = item.source_document;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button secondary" href="/evidence/review">
              Back to queue
            </Link>
            <Link className="button secondary" href="/cases/new">
              Open input deck
            </Link>
          </>
        }
        badge="Evidence detail"
        chips={[
          formatToken(item.review_status),
          formatToken(item.source_type),
          formatToken(item.strength_level),
        ]}
        description={item.summary}
        title={item.title}
      />

      {mutationError ? <p className="error">{mutationError}</p> : null}

      <WorkspaceSection
        description="Attach an optional analyst note before accepting or rejecting this record. The note travels with the review mutation instead of staying implicit in chat."
        eyebrow="Review controls"
        title="Analyst review action bar"
      >
        <WorkspaceDataCard tone="accent">
          <div className="workspace-data-card__header">
            <div>
              <span className="badge subtle">Current posture</span>
              <h3>{formatToken(item.review_status)}</h3>
            </div>
            <span className="meta-chip">
              {formatToken(item.strength_level)}
            </span>
          </div>
          <Textarea
            disabled={!canReview}
            hint={
              canReview
                ? 'Optional review note attached to this accept/reject action.'
                : 'This session can inspect evidence but cannot submit review decisions.'
            }
            label="Review note"
            onChange={(event) => onReviewNoteChange(event.target.value)}
            placeholder="Reason for the decision, missing credibility signal, or scope caveat"
            value={reviewNote}
          />
          <div className="workspace-action-row">
            {canReview ? (
              <>
                <button
                  disabled={
                    mutationPending || item.review_status === 'accepted'
                  }
                  onClick={() => onReviewAction('accept')}
                  type="button"
                >
                  {mutationPending ? 'Saving...' : 'Accept for intake'}
                </button>
                <button
                  className="secondary"
                  disabled={
                    mutationPending || item.review_status === 'rejected'
                  }
                  onClick={() => onReviewAction('reject')}
                  type="button"
                >
                  Reject
                </button>
              </>
            ) : null}
          </div>
        </WorkspaceDataCard>
      </WorkspaceSection>

      <WorkspaceSection
        description="Source identity, state, and timestamps remain explicit before any downstream intake use."
        eyebrow="Metadata"
        title="Source identity and timestamps"
      >
        <EvidenceMetadataGrid fields={metadataFields} />
      </WorkspaceSection>

      <div className="workspace-split-grid">
        <WorkspaceSection
          description="Structured rows surface extracted claims first, while the raw payload stays available below when the structure is sparse."
          eyebrow="Claims"
          title="Structured claims"
        >
          <EvidenceClaimsTable claims={structuredClaims} />
        </WorkspaceSection>

        <WorkspaceSection
          description="Narrative summary stays readable while the applicability object remains one click away instead of filling the whole page."
          eyebrow="Summary"
          title="Applicability and abstract"
        >
          <WorkspaceDataCard>
            <h3>Abstract</h3>
            <p>
              {item.abstract_text ??
                'No abstract text was stored for this record.'}
            </p>
          </WorkspaceDataCard>
          <WorkspaceDataCard tone="warning">
            <h3>Provenance note</h3>
            <p>{item.provenance_note}</p>
            {item.tags.length > 0 ? (
              <div className="workspace-chip-list compact">
                {item.tags.map((tag) => (
                  <span className="meta-chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Source document record</h3>
            {sourceDocument ? (
              <ul className="list-block">
                <li>Source ID {sourceDocument.id}</li>
                <li>
                  Access status {formatToken(sourceDocument.access_status)}
                </li>
                <li>Journal {sourceDocument.journal ?? 'Not stated'}</li>
                <li>License {sourceDocument.license ?? 'Not stated'}</li>
                <li>{sourceDocument.authors.length} author record(s)</li>
              </ul>
            ) : (
              <p className="muted">
                No source document metadata was stored for this record.
              </p>
            )}
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Supplier-linked documents</h3>
            {item.supplier_documents.length > 0 ? (
              <div className="workspace-card-list">
                {item.supplier_documents.map((document) => (
                  <article className="workspace-inline-card" key={document.id}>
                    <h3>{formatToken(document.document_type)}</h3>
                    <p>
                      Supplier {document.supplier_id}
                      {document.product_id
                        ? ` · Product ${document.product_id}`
                        : ''}
                    </p>
                    <p className="muted">
                      {document.note ?? 'No analyst note was stored.'}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">
                No supplier-linked documents were attached to this evidence
                record.
              </p>
            )}
          </WorkspaceDataCard>
          <PayloadDisclosureCard
            countBadge={applicabilityEntryCount}
            description="Applicability stays explicit but collapsed until the analyst needs the raw object."
            meta={item.source_category ?? 'Uncategorized'}
            title="Applicability scope"
            value={item.applicability_scope}
          />
        </WorkspaceSection>
      </div>

      <WorkspaceSection eyebrow="Stored payloads" title="Audit disclosures">
        <div className="workspace-detail-grid">
          <PayloadDisclosureCard
            description="Normalized catalog payload used by the runtime review surface."
            meta={`Updated ${formatTimestamp(item.updated_at)}`}
            title="Catalog payload"
            value={item.payload}
          />
          <PayloadDisclosureCard
            description="Raw imported source payload retained for auditability and future parser refinement."
            meta={formatToken(item.source_type)}
            title="Raw source payload"
            value={item.raw_payload}
          />
        </div>
      </WorkspaceSection>
    </div>
  );
}
