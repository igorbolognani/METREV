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
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
    fetchExternalEvidenceCatalogItem,
    reviewExternalEvidenceCatalogItem,
} from '@/lib/api';
import {
    useExternalEvidenceDetailTab,
    type ExternalEvidenceDetailTab,
} from '@/lib/external-evidence-detail-view-query-state';
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

function reviewStatusTone(
  value: ExternalEvidenceCatalogItemDetail['review_status'],
) {
  switch (value) {
    case 'accepted':
      return 'success' as const;
    case 'rejected':
      return 'critical' as const;
    default:
      return 'warning' as const;
  }
}

export function ExternalEvidenceDetail({
  catalogItemId,
  canReview,
}: {
  catalogItemId: string;
  canReview: boolean;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useExternalEvidenceDetailTab();
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
      activeTab={activeTab}
      canReview={canReview}
      item={item}
      mutationError={mutation.error?.message ?? null}
      mutationPending={mutation.isPending}
      onTabChange={(nextTab) => {
        void setActiveTab(nextTab);
      }}
      onReviewAction={(action) => mutation.mutate(action)}
      onReviewNoteChange={setReviewNote}
      reviewNote={reviewNote}
    />
  );
}

export function ExternalEvidenceDetailView({
  activeTab,
  canReview,
  defaultTab = 'overview',
  item,
  mutationError,
  mutationPending,
  onReviewAction,
  onReviewNoteChange,
  onTabChange,
  reviewNote,
}: {
  activeTab?: ExternalEvidenceDetailTab;
  canReview: boolean;
  defaultTab?: ExternalEvidenceDetailTab;
  item: ExternalEvidenceCatalogItemDetail;
  mutationError: string | null;
  mutationPending: boolean;
  onReviewAction: (action: ExternalEvidenceReviewAction) => void;
  onReviewNoteChange: (nextValue: string) => void;
  onTabChange?: (nextTab: ExternalEvidenceDetailTab) => void;
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
  const resolvedActiveTab = activeTab ?? defaultTab;
  const tabs = [
    { label: 'Overview', value: 'overview' },
    { badge: structuredClaims.length, label: 'Claims', value: 'claims' },
    {
      badge: sourceDocument
        ? 1 + item.supplier_documents.length
        : item.supplier_documents.length,
      label: 'Provenance',
      value: 'provenance',
    },
    { badge: 2, label: 'Payloads', value: 'payloads' },
  ] as const;
  const summaryItems = [
    {
      detail: `${formatToken(item.source_state)} source state`,
      key: 'review-status',
      label: 'Review status',
      tone: reviewStatusTone(item.review_status),
      value: formatToken(item.review_status),
    },
    {
      detail: `${item.reviewed_claim_count} reviewed claim(s) recorded.`,
      key: 'claims',
      label: 'Structured claims',
      tone: 'accent' as const,
      value: structuredClaims.length,
    },
    {
      detail: sourceDocument
        ? 'Source document plus supplier linkage remains preserved.'
        : 'Supplier-linked provenance remains preserved without a source document record.',
      key: 'provenance-links',
      label: 'Provenance links',
      tone: 'success' as const,
      value: (sourceDocument ? 1 : 0) + item.supplier_documents.length,
    },
    {
      detail:
        item.publisher ??
        item.source_category ??
        'No publisher metadata stated.',
      key: 'tags',
      label: 'Tags',
      value: item.tags.length,
    },
  ];

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/evidence/explorer">Open explorer</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/evidence/review">Back to queue</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/cases/new">Open stack cockpit</Link>
            </Button>
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

      <SummaryRail items={summaryItems} label="Evidence detail summary" />

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
                <Button
                  disabled={
                    mutationPending || item.review_status === 'accepted'
                  }
                  loading={mutationPending}
                  onClick={() => onReviewAction('accept')}
                >
                  Accept for intake
                </Button>
                <Button
                  disabled={
                    mutationPending || item.review_status === 'rejected'
                  }
                  loading={mutationPending}
                  onClick={() => onReviewAction('reject')}
                  variant="outline"
                >
                  Reject
                </Button>
              </>
            ) : null}
          </div>
        </WorkspaceDataCard>
      </WorkspaceSection>

      <WorkspaceTabShell
        activeTab={resolvedActiveTab}
        items={[...tabs]}
        label="Evidence detail tabs"
        onTabChange={(value) => {
          if (
            value === 'overview' ||
            value === 'claims' ||
            value === 'provenance' ||
            value === 'payloads'
          ) {
            onTabChange?.(value);
          }
        }}
        summary="Move through overview, claims, provenance, and stored payloads without overloading one long page."
        title="Detail workbench"
      >
        <TabsContent value="overview">
          <div className="workspace-card-list">
            <WorkspaceSection
              description="Source identity, state, and timestamps remain explicit before any downstream intake use."
              eyebrow="Metadata"
              title="Source identity and timestamps"
            >
              <EvidenceMetadataGrid fields={metadataFields} />
            </WorkspaceSection>

            <WorkspaceSection
              description="Narrative summary stays readable while the applicability object remains one click away instead of filling the whole page."
              eyebrow="Summary"
              title="Applicability and abstract"
            >
              <div className="workspace-card-list">
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
                <PayloadDisclosureCard
                  countBadge={applicabilityEntryCount}
                  description="Applicability stays explicit but collapsed until the analyst needs the raw object."
                  meta={item.source_category ?? 'Uncategorized'}
                  title="Applicability scope"
                  value={item.applicability_scope}
                />
              </div>
            </WorkspaceSection>
          </div>
        </TabsContent>

        <TabsContent value="claims">
          <WorkspaceSection
            description="Structured rows surface extracted claims first, while raw payloads remain in a separate audit tab."
            eyebrow="Claims"
            title="Structured claims"
          >
            <EvidenceClaimsTable claims={structuredClaims} />
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="provenance">
          <div className="workspace-card-list">
            <WorkspaceSection
              description="Source-document metadata stays explicit for citation, access, and author review."
              eyebrow="Source"
              title="Source document record"
            >
              <WorkspaceDataCard>
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
            </WorkspaceSection>

            <WorkspaceSection
              description="Supplier-linked records remain visible so analysts can bridge literature, supplier, and market evidence without losing provenance."
              eyebrow="Supplier linkage"
              title="Supplier-linked documents"
            >
              <WorkspaceDataCard>
                {item.supplier_documents.length > 0 ? (
                  <div className="workspace-card-list">
                    {item.supplier_documents.map((document) => (
                      <article
                        className="workspace-inline-card"
                        key={document.id}
                      >
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
            </WorkspaceSection>
          </div>
        </TabsContent>

        <TabsContent value="payloads">
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
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
