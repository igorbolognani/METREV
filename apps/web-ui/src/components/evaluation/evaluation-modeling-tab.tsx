'use client';

import type { EvaluationResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { SimulationMultiLineChart } from '@/components/charts/simulation-multi-line-chart';
import { Badge } from '@/components/ui/badge';
import { SignalBadge } from '@/components/workbench/signal-badge';
import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
} from '@/components/workspace-chrome';
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

function formatScalar(
  value: NonNullable<
    EvaluationResponse['simulation_enrichment']
  >['derived_observations'][number]['value'],
  unit: string | null,
) {
  if (typeof value === 'number') {
    return unit ? `${value} ${unit}` : String(value);
  }

  return String(value);
}

export function EvaluationModelingTab({
  evaluation,
}: {
  evaluation: EvaluationResponse;
}) {
  const simulation = evaluation.simulation_enrichment;

  if (!simulation) {
    return (
      <WorkspaceEmptyState
        title="Modeling unavailable"
        description="No simulation enrichment payload is attached to this evaluation."
      />
    );
  }

  return (
    <div className="workspace-form-layout">
      {simulation.status !== 'completed' ? (
        <div className="evaluation-callout evaluation-callout--warning">
          <div className="evaluation-callout__header">
            <strong>Modeling could not complete successfully</strong>
            <Badge variant="pending">{formatToken(simulation.status)}</Badge>
          </div>
          <p>
            The modeling stage returned status{' '}
            <strong>{formatToken(simulation.status)}</strong>.
          </p>
          {simulation.failure_detail ? (
            <pre className="code-block evaluation-raw-pre">
              {JSON.stringify(simulation.failure_detail, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      <WorkspaceDataCard tone="accent">
        <div className="workspace-data-card__header">
          <div>
            <span className="badge subtle">Modeling artifact</span>
            <h3>{formatToken(simulation.status)}</h3>
          </div>
          <div className="workspace-chip-list compact">
            <span className="meta-chip">Model {simulation.model_version}</span>
            <span className="meta-chip">{simulation.series.length} series</span>
          </div>
        </div>
        <SimulationMultiLineChart series={simulation.series} />
      </WorkspaceDataCard>

      <div className="workspace-detail-grid">
        <WorkspaceDataCard>
          <div className="workspace-data-card__header">
            <div>
              <span className="badge subtle">Derived observations</span>
              <h3>Observed outputs</h3>
            </div>
          </div>
          {simulation.derived_observations.length > 0 ? (
            <div className="workspace-card-list">
              {simulation.derived_observations.map((observation) => (
                <article
                  className="workspace-inline-card"
                  key={observation.observation_id}
                >
                  <div className="workspace-data-card__header">
                    <div>
                      <h3>{observation.label}</h3>
                      <p>{observation.provenance_note}</p>
                    </div>
                    <SignalBadge kind={observation.source_kind} />
                  </div>
                  <strong>
                    {formatScalar(observation.value, observation.unit)}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">
              No derived observations were produced for this run.
            </p>
          )}
        </WorkspaceDataCard>

        <WorkspaceDataCard>
          <span className="badge subtle">Model confidence</span>
          <div className="workspace-chip-list compact">
            <Badge
              variant={
                simulation.confidence.level === 'high'
                  ? 'accepted'
                  : simulation.confidence.level === 'medium'
                    ? 'info'
                    : 'pending'
              }
            >
              {formatToken(simulation.confidence.level)} confidence
            </Badge>
            <span className="meta-chip">
              Score {simulation.confidence.score}
            </span>
          </div>
          {listOrEmpty(
            simulation.confidence.drivers,
            'No confidence drivers were attached to the simulation payload.',
          )}
        </WorkspaceDataCard>
      </div>

      <WorkspaceDataCard>
        <span className="badge subtle">Simulation provenance</span>
        <div className="workspace-detail-grid">
          <article className="workspace-inline-card">
            <h3>Source</h3>
            <p>
              {simulation.provenance.provider} ·{' '}
              {formatToken(simulation.provenance.execution_mode)}
            </p>
            <p className="muted">
              Version {simulation.provenance.source_version}
            </p>
          </article>
          <article className="workspace-inline-card">
            <h3>Generated</h3>
            <p>{formatTimestamp(simulation.provenance.generated_at)}</p>
            {simulation.provenance.note ? (
              <p>{simulation.provenance.note}</p>
            ) : null}
          </article>
        </div>
        {listOrEmpty(
          simulation.provenance.source_refs,
          'No source references were attached to the simulation provenance.',
        )}
      </WorkspaceDataCard>
    </div>
  );
}
