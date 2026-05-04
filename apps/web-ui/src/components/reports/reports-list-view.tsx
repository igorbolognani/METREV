'use client';

import { useQuery } from '@tanstack/react-query';
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
import {
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
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

function ReportsRegistryTable({
  items,
}: {
  items: EvaluationListResponse['items'];
}) {
  return (
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
          {items.map((item) => (
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

export function ReportsWorkspaceView({
  list,
}: {
  list: EvaluationListResponse;
}) {
  const highConfidence = list.items.filter(
    (item) => item.confidence_level === 'high',
  ).length;
  const modeledReports = list.items.filter(
    (item) => item.simulation_summary?.status === 'completed',
  ).length;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button secondary" href="/dashboard?tab=reports">
              Dashboard workspace
            </Link>
            <Link className="button" href="/cases/new">
              Configure stack
            </Link>
          </>
        }
        badge="Reports"
        chips={[
          `${list.summary.total} evaluations`,
          `${highConfidence} high confidence`,
        ]}
        description="Use Dashboard > Reports for the normal client flow. This route remains available as a wider registry view for saved report output."
        title="Reports"
      />

      <div className="workspace-detail-grid">
        <WorkspaceStatCard
          detail="Each saved deterministic evaluation can reopen a client-safe report."
          label="Available reports"
          tone="default"
          value={list.summary.total}
        />
        <WorkspaceStatCard
          detail="Higher-confidence saved runs remain visible as client-ready reports."
          label="High confidence"
          tone="success"
          value={highConfidence}
        />
        <WorkspaceStatCard
          detail="Modeled saved runs retain finished simulation enrichment in the report path."
          label="Modeled reports"
          tone="accent"
          value={modeledReports}
        />
      </div>

      <WorkspaceSection
        description="Open report-ready client deliverables from the saved evaluation registry without losing the path back to the dashboard workspace."
        eyebrow="Route fallback"
        title="Report registry"
      >
        {list.items.length === 0 ? (
          <WorkspaceEmptyState
            description="No report output is available yet. Return to the dashboard workspace or configure a first stack to generate saved reports."
            primaryHref="/dashboard?tab=reports"
            primaryLabel="Open dashboard workspace"
            title="No reports yet"
          />
        ) : (
          <ReportsRegistryTable items={list.items} />
        )}
      </WorkspaceSection>
    </div>
  );
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

  return <ReportsWorkspaceView list={list} />;
}
