'use client';

import Link from 'next/link';
import * as React from 'react';

import type {
    ExternalEvidenceCatalogItemSummary,
    ExternalEvidenceReviewStatus,
} from '@metrev/domain-contracts';

import { Badge } from '@/components/ui/badge';
import { WorkspaceEmptyState } from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

void React;

type EvidenceReviewItem = ExternalEvidenceCatalogItemSummary;

function badgeVariantForReviewStatus(status: ExternalEvidenceReviewStatus) {
  switch (status) {
    case 'accepted':
      return 'accepted' as const;
    case 'rejected':
      return 'rejected' as const;
    default:
      return 'pending' as const;
  }
}

function badgeVariantForStrength(strength: string) {
  switch (strength) {
    case 'strong':
      return 'accepted' as const;
    case 'moderate':
      return 'info' as const;
    default:
      return 'pending' as const;
  }
}

function formatOptionalDate(value: string | null) {
  if (!value) {
    return 'Not stated';
  }

  return new Date(value).toLocaleDateString();
}

export interface EvidenceReviewTableProps {
  detailActionLabel?: string;
  detailHrefBase?: string;
  emptyDescription: string;
  emptyTitle: string;
  highlightIds?: string[];
  items: EvidenceReviewItem[];
  onToggleSelection?: (id: string) => void;
  selectedIds?: string[];
  selectable?: boolean;
}

export function EvidenceReviewTable({
  detailActionLabel = 'Open review detail',
  detailHrefBase = '/admin/intelligence/evidence/review',
  emptyDescription,
  emptyTitle,
  highlightIds = [],
  items,
  onToggleSelection,
  selectedIds = [],
  selectable = false,
}: EvidenceReviewTableProps) {
  if (items.length === 0) {
    return (
      <WorkspaceEmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="evidence-review-table-shell">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        const isSpotlight = highlightIds.includes(item.id);
        const extractedClaimCount = Math.max(
          item.claim_count,
          item.extracted_claims.length,
        );

        return (
          <article
            aria-selected={isSelected}
            className={[
              'evidence-review-card',
              isSelected ? 'evidence-review-card--selected' : null,
              isSpotlight ? 'evidence-review-card--spotlight' : null,
            ]
              .filter(Boolean)
              .join(' ')}
            key={item.id}
            role="row"
          >
            <div className="evidence-review-card__record">
              {selectable ? (
                <button
                  aria-pressed={isSelected}
                  className={`evidence-review-select-trigger${isSelected ? ' evidence-review-select-trigger--active' : ''}`}
                  onClick={() => onToggleSelection?.(item.id)}
                  type="button"
                >
                  {isSelected ? 'Selected' : 'Select'}
                </button>
              ) : null}
              <div className="evidence-review-record">
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                {item.tags.length > 0 ? (
                  <div className="workspace-chip-list compact">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span className="meta-chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="evidence-review-card__facts">
              <div className="evidence-review-cell-stack">
                <span className="evidence-review-card__label">
                  Review State
                </span>
                <Badge
                  variant={badgeVariantForReviewStatus(item.review_status)}
                >
                  {formatToken(item.review_status)}
                </Badge>
                <Badge variant={badgeVariantForStrength(item.strength_level)}>
                  {formatToken(item.strength_level)}
                </Badge>
              </div>

              <div className="evidence-review-cell-stack">
                <span className="evidence-review-card__label">
                  Evidence Posture
                </span>
                <span>{formatToken(item.evidence_type)}</span>
                <span>{formatToken(item.source_state)}</span>
                {item.metadata_quality ? (
                  <span>
                    Metadata quality: {formatToken(item.metadata_quality.level)}
                  </span>
                ) : null}
                {item.veracity_score ? (
                  <span>
                    Veracity: {formatToken(item.veracity_score.level)}
                  </span>
                ) : null}
                <span>Claims captured: {extractedClaimCount}</span>
                {typeof item.canonical_fact_count === 'number' ? (
                  <span>Canonical facts: {item.canonical_fact_count}</span>
                ) : null}
                {typeof item.benchmark_record_count === 'number' ? (
                  <span>Benchmark rows: {item.benchmark_record_count}</span>
                ) : null}
              </div>

              <div className="evidence-review-cell-stack">
                <span className="evidence-review-card__label">Provenance</span>
                <span>{formatToken(item.source_type)}</span>
                <span>{item.publisher ?? 'Publisher not stated'}</span>
                <span>{formatOptionalDate(item.published_at)}</span>
                <span>{item.source_category ?? 'Category not stated'}</span>
                {typeof item.source_text_chunk_count === 'number' ? (
                  <span>
                    Source text: {item.source_artifact_count ?? 0} artifact(s),{' '}
                    {item.source_text_chunk_count} chunk(s)
                  </span>
                ) : null}
                {typeof item.full_text_available === 'boolean' ? (
                  <span>
                    Full text{' '}
                    {item.full_text_available ? 'available' : 'not captured'}
                  </span>
                ) : null}
              </div>

              <div className="evidence-review-cell-stack evidence-review-card__scope">
                <span className="evidence-review-card__label">Scope</span>
                <p>{item.provenance_note}</p>
                <span>DOI: {item.doi ?? 'Not stated'}</span>
                {item.source_url ? (
                  <a
                    className="meta-chip"
                    href={item.source_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Source URL
                  </a>
                ) : null}
              </div>
            </div>

            <Link
              className="ghost-button"
              href={`${detailHrefBase}/${item.id}`}
            >
              {detailActionLabel}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
