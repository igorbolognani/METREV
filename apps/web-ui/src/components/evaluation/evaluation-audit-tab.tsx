'use client';

import type { EvaluationWorkspaceResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { RawEvaluationDisclosure } from '@/components/evaluation/raw-evaluation-disclosure';
import { Collapsible } from '@/components/ui/collapsible';
import { SignalBadge } from '@/components/workbench/signal-badge';
import { WorkspaceDataCard } from '@/components/workspace-chrome';
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

function traceabilityCounts(workspace: EvaluationWorkspaceResponse) {
  const traceability = workspace.meta.traceability;

  return [
    `${traceability.defaults_count} defaults`,
    `${traceability.missing_data_count} missing-data flags`,
    `${traceability.evidence_count} evidence refs`,
  ];
}

function formatPersistedUsage(
  value:
    | EvaluationWorkspaceResponse['evaluation']['source_usages'][number]
    | EvaluationWorkspaceResponse['evaluation']['claim_usages'][number],
) {
  const targetId =
    'source_document_id' in value ? value.source_document_id : value.claim_id;

  return `${formatToken(value.usage_type)} · ${targetId}${
    value.note ? ` · ${value.note}` : ''
  }`;
}

export function EvaluationAuditTab({
  evaluationId,
  workspace,
}: {
  evaluationId: string;
  workspace: EvaluationWorkspaceResponse;
}) {
  const evaluation = workspace.evaluation;
  const decisionOutput = evaluation.decision_output;
  const confidenceSummary = decisionOutput.confidence_and_uncertainty_summary;

  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Assumptions and defaults audit</span>
        <div className="workspace-detail-grid">
          <article className="workspace-inline-card">
            <h3>Defaults used</h3>
            {listOrEmpty(
              decisionOutput.assumptions_and_defaults_audit.defaults_used,
              'No defaults were recorded for this evaluation.',
            )}
          </article>
          <article className="workspace-inline-card">
            <h3>Missing data</h3>
            {listOrEmpty(
              decisionOutput.assumptions_and_defaults_audit.missing_data,
              'No missing-data flags were recorded for this evaluation.',
            )}
          </article>
        </div>
        <article className="workspace-inline-card">
          <h3>Assumptions</h3>
          {listOrEmpty(
            decisionOutput.assumptions_and_defaults_audit.assumptions,
            'No explicit assumptions were stored for this evaluation.',
          )}
        </article>
      </WorkspaceDataCard>

      <WorkspaceDataCard>
        <span className="badge subtle">Confidence and uncertainty summary</span>
        <div className="workspace-chip-list compact">
          <span className="meta-chip">
            {formatToken(confidenceSummary.confidence_level)} confidence
          </span>
          {confidenceSummary.sensitivity_level ? (
            <span className="meta-chip">
              {formatToken(confidenceSummary.sensitivity_level)} sensitivity
            </span>
          ) : null}
        </div>
        <p>{confidenceSummary.summary}</p>
        <div className="workspace-detail-grid">
          <article className="workspace-inline-card">
            <h3>Next tests</h3>
            {listOrEmpty(
              confidenceSummary.next_tests,
              'No follow-up tests were attached to this summary.',
            )}
          </article>
          <article className="workspace-inline-card">
            <h3>Provenance notes</h3>
            {listOrEmpty(
              confidenceSummary.provenance_notes,
              'No provenance notes were attached to this summary.',
            )}
          </article>
        </div>
      </WorkspaceDataCard>

      <WorkspaceDataCard>
        <span className="badge subtle">Traceability</span>
        <p>{evaluation.audit_record.summary}</p>
        <div className="workspace-chip-list compact">
          {traceabilityCounts(workspace).map((entry) => (
            <span className="meta-chip" key={entry}>
              {entry}
            </span>
          ))}
        </div>
        <div className="workspace-detail-grid">
          <article className="workspace-inline-card">
            <h3>Versions</h3>
            <ul className="list-block">
              <li>Contract {workspace.meta.versions.contract_version}</li>
              <li>Ontology {workspace.meta.versions.ontology_version}</li>
              <li>Rules {workspace.meta.versions.ruleset_version}</li>
              <li>Prompt {workspace.meta.versions.prompt_version}</li>
              <li>Model {workspace.meta.versions.model_version}</li>
              <li>
                Workspace schema{' '}
                {workspace.meta.versions.workspace_schema_version}
              </li>
            </ul>
          </article>
          <article className="workspace-inline-card">
            <h3>Generated</h3>
            <p>{formatTimestamp(workspace.meta.generated_at)}</p>
            <p className="muted">
              {workspace.meta.traceability.transformation_stages.join(' → ')}
            </p>
          </article>
        </div>

        <article className="workspace-inline-card">
          <h3>Typed evidence snapshot</h3>
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
                    {formatToken(record.evidence_type)} ·{' '}
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
        </article>

        <div className="workspace-detail-grid">
          <article className="workspace-inline-card">
            <h3>Persisted source usage</h3>
            {listOrEmpty(
              evaluation.source_usages.map((usage) =>
                formatPersistedUsage(usage),
              ),
              'No persisted source usage records were read back for this evaluation.',
            )}
          </article>
          <article className="workspace-inline-card">
            <h3>Persisted claim usage</h3>
            {listOrEmpty(
              evaluation.claim_usages.map((usage) =>
                formatPersistedUsage(usage),
              ),
              'No persisted claim usage records were read back for this evaluation.',
            )}
          </article>
        </div>

        <article className="workspace-inline-card">
          <h3>Workspace snapshot inventory</h3>
          {listOrEmpty(
            evaluation.workspace_snapshots.map(
              (snapshot) =>
                `${formatToken(snapshot.snapshot_type)} · ${formatTimestamp(snapshot.created_at)}`,
            ),
            'No immutable workspace snapshots were read back for this evaluation.',
          )}
        </article>

        <Collapsible title="View audit record">
          <pre className="code-block evaluation-raw-pre">
            {JSON.stringify(evaluation.audit_record, null, 2)}
          </pre>
        </Collapsible>
      </WorkspaceDataCard>

      <RawEvaluationDisclosure evaluationId={evaluationId} />
    </div>
  );
}
