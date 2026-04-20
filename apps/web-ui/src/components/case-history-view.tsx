'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { CaseHistoryWorkspaceResponse } from '@metrev/domain-contracts';

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
        title="Case history unavailable"
        description="The requested case history payload could not be loaded."
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
        badge="Case history"
        title={workspace.case.case_id}
        description={`Chronological history for ${formatToken(
          workspace.case.technology_family,
        )} / ${formatToken(workspace.case.primary_objective)}.`}
        chips={[
          `${workspace.timeline.length} stored run(s)`,
          `${workspace.evidence_records.length} evidence record(s)`,
          `Updated ${formatTimestamp(workspace.case.updated_at)}`,
        ]}
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
      />

      <WorkspaceSection
        eyebrow="Timeline"
        title="Saved evaluation runs"
        description="Use the timeline to move across stored runs and open direct pairwise comparisons."
      >
        {workspace.timeline.length > 0 ? (
          <div className="workspace-card-list">
            {workspace.timeline.map((item) => (
              <WorkspaceDataCard key={item.evaluation.evaluation_id}>
                <div className="workspace-data-card__header">
                  <div>
                    <span className="badge subtle">
                      {item.is_latest ? 'Latest run' : 'Historical run'}
                    </span>
                    <h3>{item.evaluation.summary}</h3>
                  </div>
                  <span className="meta-chip">
                    {formatToken(item.evaluation.confidence_level)}
                  </span>
                </div>
                <p>{item.delta_summary}</p>
                <p className="muted">
                  {formatTimestamp(item.evaluation.created_at)}
                </p>
                <div className="workspace-action-row">
                  <Link
                    className="ghost-button"
                    href={`/evaluations/${item.evaluation.evaluation_id}`}
                  >
                    Open result
                  </Link>
                  {item.compare_href ? (
                    <Link className="ghost-button" href={item.compare_href}>
                      Compare pair
                    </Link>
                  ) : null}
                </div>
              </WorkspaceDataCard>
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            title="No saved runs"
            description="Complete an evaluation first to populate the case timeline."
          />
        )}
      </WorkspaceSection>

      <div className="workspace-split-grid">
        <WorkspaceSection
          eyebrow="Audit"
          title="Audit trail"
          description="Operational events remain visible alongside the run history."
        >
          <div className="workspace-card-list">
            {workspace.audit_events.map((event) => (
              <WorkspaceDataCard key={event.event_id}>
                <div className="workspace-data-card__header">
                  <div>
                    <h3>{formatToken(event.event_type)}</h3>
                    <p>{formatTimestamp(event.created_at)}</p>
                  </div>
                  <span className="meta-chip">{event.actor_role}</span>
                </div>
                <pre className="code-block">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </WorkspaceDataCard>
            ))}
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          eyebrow="Evidence"
          title="Attached evidence"
          description="Evidence remains available as shared context for the whole case."
        >
          <div className="workspace-card-list">
            {workspace.evidence_records.map((record) => (
              <WorkspaceDataCard key={record.evidence_id}>
                <h3>{record.title}</h3>
                <p>{record.summary}</p>
                <div className="workspace-chip-list compact">
                  <span className="meta-chip">
                    {formatToken(record.evidence_type)}
                  </span>
                  <span className="meta-chip">
                    {formatToken(record.strength_level)}
                  </span>
                </div>
              </WorkspaceDataCard>
            ))}
          </div>
        </WorkspaceSection>
      </div>
    </div>
  );
}
