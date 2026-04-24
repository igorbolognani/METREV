'use client';

import Link from 'next/link';
import * as React from 'react';

import type { EvaluationListResponse } from '@metrev/domain-contracts';

import { Badge } from '@/components/ui/badge';
import {
    DenseTableActions,
    DenseTableShell,
    DenseTableStack,
} from '@/components/ui/dense-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from '@/components/ui/table';
import { WorkspaceEmptyState } from '@/components/workspace-chrome';
import {
    type EvaluationSortDirection,
    type EvaluationSortKey,
} from '@/lib/evaluations-list-query-state';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

const confidenceScore: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function badgeVariantForConfidence(value: string) {
  switch (value) {
    case 'high':
      return 'accepted' as const;
    case 'medium':
      return 'info' as const;
    case 'low':
      return 'pending' as const;
    default:
      return 'muted' as const;
  }
}

function badgeVariantForSimulationStatus(value?: string | null) {
  switch (value) {
    case 'completed':
      return 'accepted' as const;
    case 'failed':
      return 'rejected' as const;
    case 'queued':
    case 'running':
      return 'pending' as const;
    default:
      return 'muted' as const;
  }
}

function sortValue(
  item: EvaluationListResponse['items'][number],
  sortKey: EvaluationSortKey,
): number | string {
  switch (sortKey) {
    case 'case_id':
      return item.case_id;
    case 'confidence_level':
      return confidenceScore[item.confidence_level] ?? 0;
    case 'created_at':
    default:
      return item.created_at;
  }
}

export function sortEvaluations(
  items: EvaluationListResponse['items'],
  sortKey: EvaluationSortKey,
  sortDirection: EvaluationSortDirection,
) {
  return [...items].sort((left, right) => {
    const leftValue = sortValue(left, sortKey);
    const rightValue = sortValue(right, sortKey);
    const comparison =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));

    return sortDirection === 'asc' ? comparison : comparison * -1;
  });
}

export interface EvaluationsTableProps {
  items: EvaluationListResponse['items'];
}

export function EvaluationsTable({ items }: EvaluationsTableProps) {
  if (items.length === 0) {
    return (
      <WorkspaceEmptyState
        description="No evaluations match the current filters."
        title="No evaluations found"
      />
    );
  }

  return (
    <DenseTableShell>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Evaluation</TableHeaderCell>
            <TableHeaderCell>Case</TableHeaderCell>
            <TableHeaderCell>Confidence</TableHeaderCell>
            <TableHeaderCell>Modeling</TableHeaderCell>
            <TableHeaderCell>Narrative</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.evaluation_id}>
              <TableCell>
                <DenseTableStack wide>
                  <strong>{item.evaluation_id}</strong>
                  <span>{item.summary}</span>
                </DenseTableStack>
              </TableCell>
              <TableCell>
                <DenseTableStack>
                  <strong>{item.case_id}</strong>
                  <span>
                    {formatToken(item.technology_family)} ·{' '}
                    {formatToken(item.primary_objective)}
                  </span>
                </DenseTableStack>
              </TableCell>
              <TableCell>
                <Badge
                  variant={badgeVariantForConfidence(item.confidence_level)}
                >
                  {formatToken(item.confidence_level)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={badgeVariantForSimulationStatus(
                    item.simulation_summary?.status,
                  )}
                >
                  {formatToken(
                    item.simulation_summary?.status ?? 'unavailable',
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                {item.narrative_available ? 'Available' : 'Not generated'}
              </TableCell>
              <TableCell>{formatTimestamp(item.created_at)}</TableCell>
              <TableCell>
                <DenseTableActions>
                  <Link
                    className="ghost-button"
                    href={`/evaluations/${item.evaluation_id}`}
                  >
                    Open result
                  </Link>
                  <Link
                    className="ghost-button"
                    href={`/cases/${item.case_id}/history`}
                  >
                    Case history
                  </Link>
                </DenseTableActions>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DenseTableShell>
  );
}
