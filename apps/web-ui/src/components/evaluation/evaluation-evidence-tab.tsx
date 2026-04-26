'use client';

import type { EvaluationWorkspaceResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { SignalBadge } from '@/components/workbench/signal-badge';
import { WorkspaceDataCard } from '@/components/workspace-chrome';
import { formatTimestamp, formatToken } from '@/lib/formatting';

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

function formatPersistedUsage(
  value:
    | EvaluationWorkspaceResponse['evaluation']['source_usages'][number]
    | EvaluationWorkspaceResponse['evaluation']['claim_usages'][number],
) {
  const targetId =
    'source_document_id' in value ? value.source_document_id : value.claim_id;

  return `${formatToken(value.usage_type)} - ${targetId}${
    value.note ? ` - ${value.note}` : ''
  }`;
}

export function EvaluationEvidenceTab({
  workspace,
}: {
  workspace: EvaluationWorkspaceResponse;
}) {
  const evaluation = workspace.evaluation;

  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Typed evidence snapshot</span>
        {evaluation.audit_record.typed_evidence.length > 0 ? (
          <div className="workspace-card-list">
            {evaluation.audit_record.typed_evidence.map((record) => (
              <article
                className="workspace-inline-card"
                key={record.evidence_id}
              >
                <div className="workspace-data-card__header">
                  <div>
                    <h3>{record.title}</h3>
                    <p>{record.summary}</p>
                  </div>
                  <SignalBadge
                    kind={
                      record.evidence_type === 'internal_benchmark'
                        ? 'measured'
                        : 'inferred'
                    }
                  />
                </div>
                <p className="muted">
                  {formatToken(record.evidence_type)} -{' '}
                  {formatToken(record.strength_level)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">
            No typed evidence records were attached to this evaluation.
          </p>
        )}
      </WorkspaceDataCard>

      <div className="workspace-detail-grid">
        <WorkspaceDataCard>
          <span className="badge subtle">Persisted source usage</span>
          {listOrEmpty(
            evaluation.source_usages.map((usage) =>
              formatPersistedUsage(usage),
            ),
            'No persisted source usage records were read back for this evaluation.',
          )}
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <span className="badge subtle">Persisted claim usage</span>
          {listOrEmpty(
            evaluation.claim_usages.map((usage) => formatPersistedUsage(usage)),
            'No persisted claim usage records were read back for this evaluation.',
          )}
        </WorkspaceDataCard>
      </div>

      <WorkspaceDataCard>
        <span className="badge subtle">Workspace snapshot inventory</span>
        {listOrEmpty(
          evaluation.workspace_snapshots.map(
            (snapshot) =>
              `${formatToken(snapshot.snapshot_type)} - ${formatTimestamp(snapshot.created_at)}`,
          ),
          'No immutable workspace snapshots were read back for this evaluation.',
        )}
      </WorkspaceDataCard>
    </div>
  );
}

void React;
