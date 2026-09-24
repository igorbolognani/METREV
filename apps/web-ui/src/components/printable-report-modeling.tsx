'use client';

import * as React from 'react';

import type { PrintableEvaluationReportResponse } from '@metrev/domain-contracts';

import { Badge } from '@/components/ui/badge';
import {
  WorkspaceDataCard,
  WorkspaceEmptyState,
  WorkspaceSection,
} from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

void React;

type ReportModeling = PrintableEvaluationReportResponse['sections']['modeling'];

function formatOutputValue(
  value: number | string | boolean | null,
  unit: string | null,
) {
  if (typeof value === 'number') {
    return unit ? `${value} ${unit}` : String(value);
  }

  return value === null ? 'Unavailable' : String(value);
}

function missingInputs(modeling: NonNullable<ReportModeling>): string[] {
  const value = modeling.failure_detail?.missing_inputs;
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export function PrintableReportModelingSection({
  modeling,
}: {
  modeling: ReportModeling;
}) {
  if (!modeling) {
    return (
      <WorkspaceSection eyebrow="Mechanistic model" title="Modeled outputs">
        <WorkspaceEmptyState
          title="No model run attached"
          description="This evaluation has no mechanistic simulation payload."
        />
      </WorkspaceSection>
    );
  }

  const outputs = modeling.derived_observations.filter(
    (observation) => observation.source_kind === 'modeled',
  );
  const missing = missingInputs(modeling);

  return (
    <WorkspaceSection eyebrow="Mechanistic model" title="Modeled outputs">
      <WorkspaceDataCard>
        <div className="workspace-data-card__header">
          <div>
            <Badge
              variant={modeling.status === 'completed' ? 'accepted' : 'pending'}
            >
              {formatToken(modeling.status)}
            </Badge>
            <h3>{modeling.model_version}</h3>
          </div>
          <div className="workspace-chip-list compact">
            <span className="meta-chip">
              {formatToken(modeling.confidence.level)} heuristic confidence
            </span>
            <span className="meta-chip">Score {modeling.confidence.score}</span>
          </div>
        </div>

        <p>
          These values are modeled solver outputs, not measurements or
          independent observations. The model is an uncalibrated, lumped,
          isothermal 0D baseline; its confidence score is a fixed heuristic and
          parameter uncertainty is not propagated.
        </p>

        {modeling.status === 'completed' ? (
          outputs.length > 0 ? (
            <div className="workspace-card-list">
              {outputs.map((observation) => (
                <article
                  className="workspace-inline-card"
                  key={observation.observation_id}
                >
                  <div className="workspace-data-card__header">
                    <div>
                      <h4>{observation.label}</h4>
                      <p>{observation.provenance_note}</p>
                    </div>
                    <Badge variant="info">Modeled</Badge>
                  </div>
                  <strong>
                    {formatOutputValue(observation.value, observation.unit)}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No modeled observations were produced.</p>
          )
        ) : (
          <div className="evaluation-callout evaluation-callout--warning">
            <strong>No model result was generated.</strong>
            <p>
              The simulation status is {formatToken(modeling.status)}. Do not
              interpret the decision output as a substitute for unavailable
              model results.
            </p>
            {missing.length > 0 ? (
              <ul className="list-block">
                {missing.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {modeling.provenance.note ? (
          <p className="muted">{modeling.provenance.note}</p>
        ) : null}
        {modeling.assumptions.length > 0 ? (
          <details>
            <summary>Model assumptions and limits</summary>
            <ul className="list-block">
              {modeling.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {modeling.provenance.source_refs.length > 0 ? (
          <div>
            <span className="badge subtle">Parameter source references</span>
            <ul className="list-block">
              {modeling.provenance.source_refs.map((sourceRef) => (
                <li key={sourceRef}>{sourceRef}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </WorkspaceDataCard>
    </WorkspaceSection>
  );
}
