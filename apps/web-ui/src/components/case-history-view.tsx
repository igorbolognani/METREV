'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { CaseHistoryWorkspaceResponse } from '@metrev/domain-contracts';

import { PayloadDisclosureCard } from '@/components/evidence-detail/payload-disclosure-card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from '@/components/ui/table';
import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { fetchCaseHistoryWorkspace } from '@/lib/api';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

function listOrEmpty(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <ul className="list-block">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

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

function formatPersistedUsage(
  value:
    | CaseHistoryWorkspaceResponse['current_evaluation_lineage']['source_usages'][number]
    | CaseHistoryWorkspaceResponse['current_evaluation_lineage']['claim_usages'][number],
) {
  const targetId =
    'source_document_id' in value ? value.source_document_id : value.claim_id;

  return `${formatToken(value.usage_type)} · ${targetId}${
    value.note ? ` · ${value.note}` : ''
  }`;
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

function renderChipList(values: string[], emptyMessage: string) {
  if (values.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <div className="workspace-chip-list compact">
      {values.map((value) => (
        <span className="meta-chip" key={value}>
          {value}
        </span>
      ))}
    </div>
  );
}

export function CaseHistoryView({ caseId }: { caseId: string }) {
  const query = useQuery({
    queryKey: ['case-history-workspace', caseId],
    queryFn: () => fetchCaseHistoryWorkspace(caseId),
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

  const workspace = query.data;
  if (!workspace) {
    return (
      <WorkspaceEmptyState
        description="The requested case history payload could not be loaded."
        title="Case history unavailable"
      />
    );
  }

  return <CaseHistoryWorkspaceView workspace={workspace} />;
}

export function CaseHistoryWorkspaceView({
  workspace,
}: {
  workspace: CaseHistoryWorkspaceResponse;
}) {
  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          workspace.current_evaluation_id ? (
            <Link
              className="button secondary"
              href={`/evaluations/${workspace.current_evaluation_id}`}
            >
              Open latest workspace
            </Link>
          ) : null
        }
        badge="Case history"
        chips={[
          `${workspace.timeline.length} stored run(s)`,
          `${workspace.evidence_records.length} evidence record(s)`,
          `Updated ${formatTimestamp(workspace.case.updated_at)}`,
        ]}
        description={`Chronological history for ${formatToken(
          workspace.case.technology_family,
        )} / ${formatToken(workspace.case.primary_objective)}.`}
        title={workspace.case.case_id}
      />

      <WorkspaceSection
        description="Defaults, missing data, and explicit assumptions remain attached to the whole case, not only to the latest run."
        eyebrow="Case snapshot"
        title="Defaults, missing data, and assumptions"
      >
        <div className="workspace-detail-grid">
          <WorkspaceDataCard>
            <h3>Defaults used</h3>
            {renderChipList(
              workspace.case.defaults_used,
              'No defaults were recorded for this case snapshot.',
            )}
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Missing data</h3>
            {renderChipList(
              workspace.case.missing_data,
              'No missing-data flags are recorded for this case snapshot.',
            )}
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Assumptions</h3>
            {renderChipList(
              workspace.case.assumptions,
              'No explicit assumptions were recorded for this case snapshot.',
            )}
          </WorkspaceDataCard>
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        description="Use the table to move across stored runs and open direct pairwise comparisons without scanning stacked cards."
        eyebrow="Timeline"
        title="Stored evaluation runs"
      >
        {workspace.timeline.length > 0 ? (
          <div className="detail-table-shell">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Run</TableHeaderCell>
                  <TableHeaderCell>Delta summary</TableHeaderCell>
                  <TableHeaderCell>Confidence</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {workspace.timeline.map((item) => (
                  <TableRow key={item.evaluation.evaluation_id}>
                    <TableCell>
                      <div className="detail-table-stack detail-table-stack--wide">
                        <strong>{item.evaluation.summary}</strong>
                        <span>
                          {item.is_latest ? 'Latest run' : 'Historical run'} ·{' '}
                          {formatToken(item.evaluation.technology_family)} ·{' '}
                          {formatToken(item.evaluation.primary_objective)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{item.delta_summary}</TableCell>
                    <TableCell>
                      <Badge
                        variant={badgeVariantForConfidence(
                          item.evaluation.confidence_level,
                        )}
                      >
                        {formatToken(item.evaluation.confidence_level)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(item.evaluation.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="detail-table-actions">
                        <Link
                          className="ghost-button"
                          href={`/evaluations/${item.evaluation.evaluation_id}`}
                        >
                          Open result
                        </Link>
                        {item.compare_href ? (
                          <Link
                            className="ghost-button"
                            href={item.compare_href}
                          >
                            Compare pair
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <WorkspaceEmptyState
            description="Complete an evaluation first to populate the case timeline."
            title="No saved runs"
          />
        )}
      </WorkspaceSection>

      <WorkspaceSection
        description={`Persisted lineage attached to ${workspace.current_evaluation_id ?? 'the latest saved run'} remains visible here so provenance survives outside the detailed evaluation workspace.`}
        eyebrow="Latest run lineage"
        title="Persisted provenance and snapshots"
      >
        <div className="workspace-detail-grid">
          <WorkspaceDataCard>
            <h3>Persisted source usage</h3>
            {listOrEmpty(
              workspace.current_evaluation_lineage.source_usages.map((usage) =>
                formatPersistedUsage(usage),
              ),
              'No persisted source usage records were attached to the latest saved run.',
            )}
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Persisted claim usage</h3>
            {listOrEmpty(
              workspace.current_evaluation_lineage.claim_usages.map((usage) =>
                formatPersistedUsage(usage),
              ),
              'No persisted claim usage records were attached to the latest saved run.',
            )}
          </WorkspaceDataCard>
        </div>
        <WorkspaceDataCard>
          <h3>Workspace snapshot inventory</h3>
          {listOrEmpty(
            workspace.current_evaluation_lineage.workspace_snapshots.map(
              (snapshot) =>
                `${formatToken(snapshot.snapshot_type)} · ${formatTimestamp(snapshot.created_at)}`,
            ),
            'No immutable workspace snapshots were attached to the latest saved run.',
          )}
        </WorkspaceDataCard>
      </WorkspaceSection>

      <div className="workspace-split-grid">
        <WorkspaceSection
          description="Event payloads are collapsed by default so the chronology stays readable while the raw audit object remains one click away."
          eyebrow="Audit"
          title="Audit payload disclosures"
        >
          {workspace.audit_events.length > 0 ? (
            <div className="case-history-audit-list">
              {workspace.audit_events.map((event) => (
                <PayloadDisclosureCard
                  countBadge={Object.keys(event.payload).length}
                  description={`Stored event payload for ${event.actor_role}${event.evaluation_id ? ` on ${event.evaluation_id}` : ''}.`}
                  key={event.event_id}
                  meta={`${formatTimestamp(event.created_at)} · ${event.actor_role}`}
                  title={formatToken(event.event_type)}
                  value={event.payload}
                />
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState
              description="No audit events were stored for this case yet."
              title="No audit events"
            />
          )}
        </WorkspaceSection>

        <WorkspaceSection
          description="Evidence remains available as shared context for the whole case, now with structured columns instead of stacked cards."
          eyebrow="Evidence"
          title="Attached evidence table"
        >
          {workspace.evidence_records.length > 0 ? (
            <div className="detail-table-shell">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Evidence</TableHeaderCell>
                    <TableHeaderCell>Strength</TableHeaderCell>
                    <TableHeaderCell>Limitations</TableHeaderCell>
                    <TableHeaderCell>Tags</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {workspace.evidence_records.map((record) => (
                    <TableRow key={record.evidence_id}>
                      <TableCell>
                        <div className="detail-table-stack detail-table-stack--wide">
                          <strong>{record.title}</strong>
                          <span>{record.summary}</span>
                          <span>{formatToken(record.evidence_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={badgeVariantForStrength(
                            record.strength_level,
                          )}
                        >
                          {formatToken(record.strength_level)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="detail-table-stack">
                          <p>{record.provenance_note}</p>
                          <span>
                            {record.limitations.length > 0
                              ? record.limitations.join(' · ')
                              : 'No explicit limitations recorded'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.tags.length > 0 ? (
                          <div className="workspace-chip-list compact">
                            {record.tags.map((tag) => (
                              <span className="meta-chip" key={tag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="muted">No tags stored</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <WorkspaceEmptyState
              description="No evidence records are attached to this case yet."
              title="No attached evidence"
            />
          )}
        </WorkspaceSection>
      </div>
    </div>
  );
}
