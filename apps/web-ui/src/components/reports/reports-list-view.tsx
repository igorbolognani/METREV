'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

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
import {
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { SummaryRail } from '@/components/workspace/summary-rail';
import { fetchEvaluationList } from '@/lib/api';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

function confidenceBadge(value: string) {
  if (value === 'high') {
    return 'accepted' as const;
  }

  if (value === 'medium') {
    return 'info' as const;
  }

  return 'pending' as const;
}

export function ReportsListView() {
  const query = useQuery({
    queryFn: () =>
      fetchEvaluationList({
        sortKey: 'created_at',
        sortDirection: 'desc',
        page: 1,
        pageSize: 25,
      }),
    queryKey: ['reports-list', 25],
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

  const list = query.data;
  if (!list) {
    return (
      <WorkspaceEmptyState
        description="The report registry payload could not be loaded."
        title="Reports unavailable"
      />
    );
  }

  const highConfidence = list.items.filter(
    (item) => item.confidence_level === 'high',
  ).length;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <Link className="button" href="/cases/new">
            New evaluation
          </Link>
        }
        badge="Reports"
        chips={[`${list.summary.total} evaluations`, `${highConfidence} high confidence`]}
        description="Report-ready outputs generated from saved evaluations, with diagnosis, recommendations, suppliers, roadmap, and audit available through each report."
        title="Reports"
      />

      <SummaryRail
        items={[
          {
            key: 'available',
            label: 'Available reports',
            value: list.summary.total,
            detail: 'Every saved evaluation can be opened as a printable report.',
            tone: 'default',
          },
          {
            key: 'high-confidence',
            label: 'High confidence',
            value: highConfidence,
            detail: 'Reports with high-confidence decision posture.',
            tone: 'success',
          },
          {
            key: 'modeled',
            label: 'Modeled',
            value: list.items.filter(
              (item) => item.simulation_summary?.status === 'completed',
            ).length,
            detail: 'Reports whose evaluation includes completed modeling enrichment.',
            tone: 'accent',
          },
        ]}
        label="Report registry summary"
      />

      {list.items.length === 0 ? (
        <WorkspaceEmptyState
          description="Run an evaluation first, then return here to open its report."
          title="No reports yet"
        />
      ) : (
        <DenseTableShell>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Report</TableHeaderCell>
                <TableHeaderCell>Case</TableHeaderCell>
                <TableHeaderCell>Confidence</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {list.items.map((item) => (
                <TableRow key={item.evaluation_id}>
                  <TableCell>
                    <DenseTableStack wide>
                      <strong>{item.case_id} report</strong>
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
                    <Badge variant={confidenceBadge(item.confidence_level)}>
                      {formatToken(item.confidence_level)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatTimestamp(item.created_at)}</TableCell>
                  <TableCell>
                    <DenseTableActions>
                      <Link
                        className="ghost-button"
                        href={`/evaluations/${item.evaluation_id}/report`}
                      >
                        Open report
                      </Link>
                      <Link
                        className="ghost-button"
                        href={`/evaluations/${item.evaluation_id}`}
                      >
                        Evaluation
                      </Link>
                    </DenseTableActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DenseTableShell>
      )}
    </div>
  );
}

