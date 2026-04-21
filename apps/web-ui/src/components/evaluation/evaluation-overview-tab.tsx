'use client';

import type { EvaluationWorkspaceResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { Collapsible } from '@/components/ui/collapsible';
import { SignalBadge } from '@/components/workbench/signal-badge';
import {
    WorkspaceDataCard,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

void React;

function cardTone(
  tone: string,
): 'default' | 'accent' | 'warning' | 'success' | 'critical' {
  switch (tone) {
    case 'accent':
    case 'warning':
    case 'success':
    case 'critical':
      return tone;
    default:
      return 'default';
  }
}

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

function narrativeMeta(workspace: EvaluationWorkspaceResponse) {
  const metadata = workspace.evaluation.narrative_metadata;

  return [
    metadata.mode ? `${formatToken(metadata.mode)} mode` : null,
    metadata.status ? `${formatToken(metadata.status)} status` : null,
    metadata.provider ? metadata.provider : null,
    metadata.model ? metadata.model : null,
    `Prompt ${metadata.prompt_version}`,
    metadata.fallback_used ? 'Fallback used' : null,
  ].filter(Boolean) as string[];
}

export function EvaluationOverviewTab({
  workspace,
}: {
  workspace: EvaluationWorkspaceResponse;
}) {
  const evaluation = workspace.evaluation;
  const leadAction = workspace.overview.lead_action;

  return (
    <div className="workspace-form-layout">
      <section className="workspace-stats-grid">
        {workspace.overview.hero_cards.map((card) => (
          <WorkspaceStatCard
            detail={card.detail}
            key={card.key}
            label={card.label}
            tone={cardTone(card.tone)}
            value={card.value}
          />
        ))}
      </section>

      <section className="workspace-detail-grid">
        {workspace.overview.brief_cards.map((card) => (
          <WorkspaceDataCard key={card.key}>
            <span className="badge subtle">{card.label}</span>
            <h3>{card.value}</h3>
            <p>{card.detail}</p>
          </WorkspaceDataCard>
        ))}
      </section>

      <WorkspaceDataCard tone="accent">
        <div className="workspace-data-card__header">
          <div>
            <span className="badge subtle">Lead action</span>
            <h3>{leadAction.title}</h3>
          </div>
          <span className="meta-chip">{leadAction.phase}</span>
        </div>
        <p className="evaluation-lead-benefit">{leadAction.benefit_label}</p>
        <p>{leadAction.rationale}</p>
        <div className="workspace-chip-list compact">
          <span className="meta-chip">{leadAction.score_label}</span>
          <span className="meta-chip">
            {leadAction.confidence_label} confidence
          </span>
          <span className="meta-chip">{leadAction.effort_label} effort</span>
        </div>
        <div className="workspace-detail-grid">
          <article className="workspace-inline-card">
            <h3>Blocking dependencies</h3>
            {listOrEmpty(
              leadAction.blockers,
              'No explicit blocker is attached to the lead action.',
            )}
          </article>
          <article className="workspace-inline-card">
            <h3>Immediate tests</h3>
            {listOrEmpty(
              leadAction.measurement_requests,
              'No immediate tests are attached to the lead action.',
            )}
          </article>
        </div>
        <div className="evaluation-chip-cluster">
          <strong>Supplier candidates</strong>
          <div className="workspace-chip-list compact">
            {leadAction.supplier_candidates.length > 0 ? (
              leadAction.supplier_candidates.map((candidate) => (
                <span className="meta-chip" key={candidate}>
                  {candidate}
                </span>
              ))
            ) : (
              <span className="muted">
                No supplier candidates were attached.
              </span>
            )}
          </div>
        </div>
      </WorkspaceDataCard>

      <WorkspaceDataCard>
        <span className="badge subtle">Key metrics</span>
        <div className="workspace-card-list">
          {workspace.overview.key_metrics.map((metric) => (
            <article className="workspace-inline-card" key={metric.key}>
              <div className="workspace-data-card__header">
                <div>
                  <h3>{metric.label}</h3>
                  <p>{metric.note}</p>
                </div>
                <SignalBadge kind={metric.source_kind} />
              </div>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>
      </WorkspaceDataCard>

      <div className="workspace-detail-grid">
        <WorkspaceDataCard>
          <span className="badge subtle">Impact map</span>
          {workspace.overview.impact_map.length > 0 ? (
            <div className="workspace-card-list">
              {workspace.overview.impact_map.map((entry) => (
                <article className="workspace-inline-card" key={entry.key}>
                  <h3>{entry.title}</h3>
                  <p>{entry.impact}</p>
                  <p className="muted">
                    {entry.economic} · {entry.readiness} · {entry.score_label}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No impact map entries were returned.</p>
          )}
        </WorkspaceDataCard>

        <WorkspaceDataCard>
          <span className="badge subtle">History posture</span>
          <h3>{workspace.history_summary.total_runs} stored run(s)</h3>
          <p>
            Compare against previous evaluations without overloading the current
            result surface.
          </p>
          <div className="workspace-chip-list compact">
            <span className="meta-chip">
              {workspace.history_summary.compare_candidates.length} compare
              candidates
            </span>
          </div>
        </WorkspaceDataCard>
      </div>

      {evaluation.narrative ? (
        <Collapsible
          meta={narrativeMeta(workspace).join(' · ')}
          title="Read full narrative"
        >
          <p>{evaluation.narrative}</p>
        </Collapsible>
      ) : null}
    </div>
  );
}
