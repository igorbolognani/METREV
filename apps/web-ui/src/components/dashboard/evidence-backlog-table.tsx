'use client';

import Link from 'next/link';
import * as React from 'react';

import type { DashboardWorkspaceResponse } from '@metrev/domain-contracts';

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
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

function badgeVariantForReviewStatus(value: string) {
  switch (value) {
    case 'accepted':
      return 'accepted' as const;
    case 'rejected':
      return 'rejected' as const;
    default:
      return 'pending' as const;
  }
}

function badgeVariantForStrength(value: string) {
  switch (value) {
    case 'strong':
      return 'accepted' as const;
    case 'moderate':
      return 'info' as const;
    default:
      return 'pending' as const;
  }
}

export interface EvidenceBacklogTableProps {
  items: DashboardWorkspaceResponse['evidence_backlog'];
}

export function EvidenceBacklogTable({ items }: EvidenceBacklogTableProps) {
  if (items.length === 0) {
    return (
      <WorkspaceEmptyState
        title="Queue clear"
        description="There are no evidence records waiting for review right now."
      />
    );
  }

  return (
    <div className="dashboard-table-shell">
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Record</TableHeaderCell>
            <TableHeaderCell>Review State</TableHeaderCell>
            <TableHeaderCell>Evidence Type</TableHeaderCell>
            <TableHeaderCell>Provenance</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="dashboard-table-stack dashboard-table-stack--wide">
                  <strong>{item.title}</strong>
                  <span>{item.summary}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="dashboard-table-stack">
                  <Badge
                    variant={badgeVariantForReviewStatus(item.review_status)}
                  >
                    {formatToken(item.review_status)}
                  </Badge>
                  <Badge variant={badgeVariantForStrength(item.strength_level)}>
                    {formatToken(item.strength_level)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="dashboard-table-stack">
                  <span>{formatToken(item.evidence_type)}</span>
                  <span>{formatToken(item.source_type)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="dashboard-table-stack">
                  <span>{item.publisher ?? 'Publisher not stated'}</span>
                  <span>{item.doi ?? 'DOI not stated'}</span>
                  <span>{item.source_category ?? 'Category not stated'}</span>
                </div>
              </TableCell>
              <TableCell>{formatTimestamp(item.created_at)}</TableCell>
              <TableCell>
                <div className="dashboard-table-actions">
                  <Link
                    className="ghost-button"
                    href={`/evidence/review/${item.id}`}
                  >
                    Open detail
                  </Link>
                  <Link className="ghost-button" href="/evidence/review">
                    Open queue
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
