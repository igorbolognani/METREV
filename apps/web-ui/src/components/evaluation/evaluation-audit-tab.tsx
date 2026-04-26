'use client';

import type { EvaluationWorkspaceResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { RawEvaluationDisclosure } from '@/components/evaluation/raw-evaluation-disclosure';
import { WorkspaceDataCard } from '@/components/workspace-chrome';
import { DisclosurePanel } from '@/components/workspace/disclosure-panel';
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
              {workspace.meta.traceability.transformation_stages.join(' -> ')}
            </p>
          </article>
        </div>

        <DisclosurePanel title="Traceability payload">
          <pre className="code-block evaluation-raw-pre">
            {JSON.stringify(evaluation.audit_record, null, 2)}
          </pre>
        </DisclosurePanel>
      </WorkspaceDataCard>

      <RawEvaluationDisclosure evaluationId={evaluationId} />
    </div>
  );
}
