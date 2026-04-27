'use client';

import Link from 'next/link';
import * as React from 'react';

import type { DashboardWorkspaceResponse } from '@metrev/domain-contracts';

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
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

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

export interface RecentRunsTableProps {
  runs: DashboardWorkspaceResponse['recent_evaluations'];
}

export function RecentRunsTable({ runs }: RecentRunsTableProps) {
  if (runs.length === 0) {
    return (
      <WorkspaceEmptyState
        title="No recent runs"
        description="Saved analyses will appear here as soon as the first evaluation is completed."
      />
    );
  }

  return (
    <DenseTableShell variant="dashboard">
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Case</TableHeaderCell>
            <TableHeaderCell>Summary</TableHeaderCell>
            <TableHeaderCell>Confidence</TableHeaderCell>
            <TableHeaderCell>Modeling</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {runs.map((item) => (
            <TableRow key={item.evaluation_id}>
              <TableCell>
                <DenseTableStack variant="dashboard">
                  <strong>{item.case_id}</strong>
                  <span>
                    {formatToken(item.technology_family)} ·{' '}
                    {formatToken(item.primary_objective)}
                  </span>
                </DenseTableStack>
              </TableCell>
              <TableCell>
                <DenseTableStack variant="dashboard" wide>
                  <strong>{item.summary}</strong>
                  <span>
                    Narrative{' '}
                    {item.narrative_available ? 'available' : 'not generated'}
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
                <DenseTableStack variant="dashboard">
                  <Badge
                    variant={badgeVariantForSimulationStatus(
                      item.simulation_summary?.status,
                    )}
                  >
                    {formatToken(
                      item.simulation_summary?.status ?? 'unavailable',
                    )}
                  </Badge>
                  <span>
                    {item.simulation_summary?.has_series
                      ? `${item.simulation_summary.derived_observation_count} derived observations`
                      : 'No simulation series stored'}
                  </span>
                </DenseTableStack>
              </TableCell>
              <TableCell>{formatTimestamp(item.created_at)}</TableCell>
              <TableCell>
                <DenseTableActions variant="dashboard">
                  <Link
                    className="ghost-button"
                    href={`/evaluations/${item.evaluation_id}`}
                  >
                    Open workspace
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
