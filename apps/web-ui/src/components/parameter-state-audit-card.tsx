import type { ParameterStateAudit } from '@metrev/domain-contracts';
import * as React from 'react';

import { WorkspaceDataCard } from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

void React;

function valueSourceTone(
  valueSource: ParameterStateAudit['entries'][number]['value_source'],
) {
  switch (valueSource) {
    case 'client':
      return 'meta-chip meta-chip--success';
    case 'system_default':
      return 'meta-chip meta-chip--warning';
    default:
      return 'meta-chip';
  }
}

export function ParameterStateAuditCard({
  audit,
  emptyMessage = 'No explicit parameter-state entries were stored for this run.',
  title = 'Explicit parameter state',
}: {
  audit: ParameterStateAudit;
  emptyMessage?: string;
  title?: string;
}) {
  return (
    <WorkspaceDataCard>
      <span className="badge subtle">Parameter controls</span>
      <h3>{title}</h3>
      <div className="workspace-chip-list compact">
        <span className="meta-chip">{audit.summary.total} tracked</span>
        <span className="meta-chip meta-chip--success">
          {audit.summary.client_values} client
        </span>
        <span className="meta-chip meta-chip--warning">
          {audit.summary.system_defaults} defaulted
        </span>
        <span className="meta-chip">{audit.summary.excluded} excluded</span>
        <span className="meta-chip">{audit.summary.unresolved} unresolved</span>
      </div>
      {audit.entries.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        <div className="workspace-card-list">
          {audit.entries.map((entry) => (
            <article className="workspace-inline-card" key={entry.key}>
              <h3>{entry.label}</h3>
              <div className="workspace-chip-list compact">
                <span className={valueSourceTone(entry.value_source)}>
                  {!entry.included
                    ? 'Excluded'
                    : formatToken(entry.value_source)}
                </span>
                {entry.confidence_impact ? (
                  <span className="meta-chip meta-chip--accent">
                    Confidence {formatToken(entry.confidence_impact)}
                  </span>
                ) : null}
                {entry.unit ? (
                  <span className="meta-chip">Unit {entry.unit}</span>
                ) : null}
                {entry.evidence_refs.length > 0 ? (
                  <span className="meta-chip">
                    {entry.evidence_refs.length} evidence ref(s)
                  </span>
                ) : null}
              </div>
              <p>{entry.value_label}</p>
              {entry.audit_note ? (
                <p className="muted">{entry.audit_note}</p>
              ) : null}
              {entry.default_rationale ? (
                <p className="muted">
                  Default rationale: {entry.default_rationale}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </WorkspaceDataCard>
  );
}
