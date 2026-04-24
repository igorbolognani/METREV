'use client';

import Link from 'next/link';
import * as React from 'react';

import type {
  ExternalEvidenceCatalogItemSummary,
  ExternalEvidenceReviewStatus,
} from '@metrev/domain-contracts';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
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
  detailHrefBase = '/evidence/review',
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
      <Table>
        <TableHead>
          <tr>
            {selectable ? <TableHeaderCell>Selection</TableHeaderCell> : null}
            <TableHeaderCell>Record</TableHeaderCell>
            <TableHeaderCell>Review State</TableHeaderCell>
            <TableHeaderCell>Evidence Posture</TableHeaderCell>
            <TableHeaderCell>Provenance</TableHeaderCell>
            <TableHeaderCell>Scope</TableHeaderCell>
            <TableHeaderCell>Detail</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isSpotlight = highlightIds.includes(item.id);

            return (
              <TableRow
                className={
                  isSpotlight
                    ? 'evidence-review-table__spotlight-row'
                    : undefined
                }
                key={item.id}
                selected={isSelected}
              >
                {selectable ? (
                  <TableCell>
                    <button
                      aria-pressed={isSelected}
                      className={`evidence-review-select-trigger${isSelected ? ' evidence-review-select-trigger--active' : ''}`}
                      onClick={() => onToggleSelection?.(item.id)}
                      type="button"
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </TableCell>
                ) : null}
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <div className="evidence-review-cell-stack">
                    <Badge
                      variant={badgeVariantForReviewStatus(item.review_status)}
                    >
                      {formatToken(item.review_status)}
                    </Badge>
                    <Badge
                      variant={badgeVariantForStrength(item.strength_level)}
                    >
                      {formatToken(item.strength_level)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="evidence-review-cell-stack">
                    <span>{formatToken(item.evidence_type)}</span>
                    <span>{formatToken(item.source_state)}</span>
                    <span>Claims captured: {item.extracted_claims.length}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="evidence-review-cell-stack">
                    <span>{formatToken(item.source_type)}</span>
                    <span>{item.publisher ?? 'Publisher not stated'}</span>
                    <span>{formatOptionalDate(item.published_at)}</span>
                    <span>{item.source_category ?? 'Category not stated'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="evidence-review-cell-stack">
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
                </TableCell>
                <TableCell>
                  <Link
                    className="ghost-button"
                    href={`${detailHrefBase}/${item.id}`}
                  >
                    {detailActionLabel}
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
