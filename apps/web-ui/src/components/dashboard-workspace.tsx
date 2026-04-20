'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
  EvaluationListResponse,
  ExternalEvidenceCatalogListResponse,
} from '@metrev/domain-contracts';

import { fetchEvaluationList, fetchExternalEvidenceCatalog } from '@/lib/api';
import { Sparkline } from '@/components/workbench/sparkline';
import { formatTimestamp } from '@/lib/evaluation-workbench';

void React;

function confidenceTrend(items: EvaluationListResponse['items']) {
  return [...items]
    .slice(0, 6)
    .reverse()
    .map((item) => {
      if (item.confidence_level === 'high') {
        return 92;
      }

      if (item.confidence_level === 'medium') {
        return 64;
      }

      return 36;
    });
}

function modelingTrend(items: EvaluationListResponse['items']) {
  return [...items]
    .slice(0, 6)
    .reverse()
    .map((item) => {
      switch (item.simulation_summary?.status) {
        case 'completed':
          return 100;
        case 'insufficient_data':
          return 46;
        case 'failed':
          return 18;
        case 'disabled':
          return 0;
        default:
          return 10;
      }
    });
}

function cumulativeRunTrend(items: EvaluationListResponse['items']) {
  const visible = [...items].slice(0, 6).reverse();
  return visible.map((_, index) => index + 1);
}

function uniqueCaseCount(items: EvaluationListResponse['items']) {
  return new Set(items.map((item) => item.case_id)).size;
}

function completedModelCount(items: EvaluationListResponse['items']) {
  return items.filter((item) => item.simulation_summary?.status === 'completed')
    .length;
}

function highConfidenceCount(items: EvaluationListResponse['items']) {
  return items.filter((item) => item.confidence_level === 'high').length;
}

export function DashboardWorkspace() {
  const evaluationsQuery = useQuery({
    queryKey: ['dashboard-workspace', 'evaluations'],
    queryFn: fetchEvaluationList,
  });
  const evidenceQuery = useQuery({
    queryKey: ['dashboard-workspace', 'evidence'],
    queryFn: () => fetchExternalEvidenceCatalog({ status: 'pending' }),
  });

  if (evaluationsQuery.isLoading || evidenceQuery.isLoading) {
    return <p className="muted">Loading analyst workspace…</p>;
  }

  if (evaluationsQuery.error) {
    return <p className="error">{evaluationsQuery.error.message}</p>;
  }

  if (evidenceQuery.error) {
    return <p className="error">{evidenceQuery.error.message}</p>;
  }

  return (
    <DashboardWorkspaceView
      evidenceCatalog={evidenceQuery.data}
      evaluationList={evaluationsQuery.data}
    />
  );
}

export function DashboardWorkspaceView({
  evaluationList,
  evidenceCatalog,
}: {
  evaluationList?: EvaluationListResponse;
  evidenceCatalog?: ExternalEvidenceCatalogListResponse;
}) {
  const items = evaluationList?.items ?? [];
  const latestEvaluation = items[0];
  const totalRuns = items.length;
  const totalCases = uniqueCaseCount(items);
  const modeledRuns = completedModelCount(items);
  const strongRuns = highConfidenceCount(items);
  const pendingEvidence = evidenceCatalog?.summary.pending ?? 0;
  const acceptedEvidence = evidenceCatalog?.summary.accepted ?? 0;
  const rejectedEvidence = evidenceCatalog?.summary.rejected ?? 0;
  const latestDecisionHref = latestEvaluation
    ? `/evaluations/${latestEvaluation.evaluation_id}`
    : '/cases/new';
  const latestAuditHref = latestEvaluation
    ? `/evaluations/${latestEvaluation.evaluation_id}?tab=audit`
    : '/cases/new';

  return (
    <div className="grid workspace-dashboard">
      <section className="hero workspace-masthead">
        <div>
          <span className="badge">Analyst workspace</span>
          <h1>Bioelectrochemical decision workbench</h1>
          <p className="muted">
            Deterministic evaluation, modeled enrichment, evidence review, and
            saved-run inspection now share one denser analytical workspace.
          </p>
        </div>
        <div className="workspace-chip-list">
          <span className="meta-chip">local runtime</span>
          <span className="meta-chip">local-first evidence</span>
          <span className="meta-chip">simulation optional</span>
        </div>
      </section>

      <section
        className="workspace-summary-grid"
        aria-label="Workspace overview"
      >
        <article className="workspace-summary-card">
          <span>Workspace scope</span>
          <strong>{totalRuns}</strong>
          <p>
            {totalCases} tracked case{totalCases === 1 ? '' : 's'} across the
            current saved-run surface.
          </p>
          <Sparkline
            label="Saved-run growth"
            values={cumulativeRunTrend(items)}
          />
        </article>
        <article className="workspace-summary-card">
          <span>Confidence posture</span>
          <strong>{strongRuns}</strong>
          <p>
            {strongRuns} run{strongRuns === 1 ? '' : 's'} currently resolve at
            high confidence.
          </p>
          <Sparkline label="Confidence trend" values={confidenceTrend(items)} />
        </article>
        <article className="workspace-summary-card">
          <span>Model coverage</span>
          <strong>{modeledRuns}</strong>
          <p>
            {modeledRuns} run{modeledRuns === 1 ? '' : 's'} expose a completed
            modeled artifact.
          </p>
          <Sparkline label="Modeling trend" values={modelingTrend(items)} />
        </article>
        <article className="workspace-summary-card workspace-summary-card--copper">
          <span>Evidence backlog</span>
          <strong>{pendingEvidence}</strong>
          <p>
            {acceptedEvidence} accepted · {rejectedEvidence} rejected across the
            imported review queue.
          </p>
          <div className="workspace-chip-list compact">
            <span className="meta-chip meta-chip--copper">pending</span>
            <span className="meta-chip meta-chip--success">accepted</span>
          </div>
        </article>
        <article className="workspace-summary-card workspace-summary-card--wide">
          <span>Latest active run</span>
          <strong>
            {latestEvaluation?.case_id ?? 'No saved evaluation yet'}
          </strong>
          <p>
            {latestEvaluation?.summary ??
              'Run or reopen a case to populate diagnostics, modeling, audit, and history signals.'}
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href={latestDecisionHref}>
              Open decision workspace
            </Link>
            <Link className="button secondary" href={latestAuditHref}>
              Open audit view
            </Link>
          </div>
        </article>
      </section>

      <section className="workspace-navigation" aria-label="Workspace pages">
        <div className="workspace-navigation__copy">
          <p className="option-eyebrow">Workspace surfaces</p>
          <h2>Dedicated views with shared technical language</h2>
          <p>
            Dashboard, drafting, decision review, and evidence triage now work
            as one system instead of unrelated pages.
          </p>
        </div>
        <div className="workspace-page-links">
          <Link className="ghost-button" href="/cases/new">
            Input deck
          </Link>
          <Link className="ghost-button" href={latestDecisionHref}>
            Decision workspace
          </Link>
          <Link
            className="ghost-button"
            href={`${latestDecisionHref}#comparison-dock`}
          >
            Comparison dock
          </Link>
          <Link
            className="ghost-button"
            href={`${latestDecisionHref}#history-rail`}
          >
            History rail
          </Link>
          <Link className="ghost-button" href="/evidence/review">
            Evidence review
          </Link>
        </div>
        <p className="workspace-navigation__hint">
          History and comparison remain attached to the evaluation workbench
          until dedicated routes are promoted.
        </p>
      </section>

      <section className="panel grid">
        <div className="stack split compact">
          <div>
            <span className="badge">Recent runs</span>
            <h2>Saved analyses ready to reopen</h2>
          </div>
          <Link className="button secondary" href="/cases/new">
            Draft a new evaluation
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="workspace-card-grid">
            {items.slice(0, 6).map((item) => (
              <article className="workspace-card" key={item.evaluation_id}>
                <div className="workspace-card__meta">
                  <span className="badge subtle">{item.confidence_level}</span>
                  <span className="muted">
                    {formatTimestamp(item.created_at)}
                  </span>
                </div>
                <h3>{item.case_id}</h3>
                <p>{item.summary}</p>
                <div className="workspace-chip-list compact">
                  <span className="meta-chip">{item.technology_family}</span>
                  <span className="meta-chip">{item.primary_objective}</span>
                  <span className="meta-chip meta-chip--accent">
                    {item.simulation_summary?.status ?? 'model unavailable'}
                  </span>
                </div>
                <div className="hero-actions">
                  <Link
                    className="button secondary"
                    href={`/evaluations/${item.evaluation_id}`}
                  >
                    Open workspace
                  </Link>
                  <Link
                    className="button secondary"
                    href={`/evaluations/${item.evaluation_id}?tab=modeling`}
                  >
                    Charts
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-empty-panel">
            <strong>No saved evaluations yet</strong>
            <p>
              Start a case to populate the history surface and the decision
              workspace entry points.
            </p>
          </div>
        )}
      </section>

      <section className="panel grid">
        <div className="stack split compact">
          <div>
            <span className="badge">Evidence queue</span>
            <h2>Imported records waiting for analyst review</h2>
          </div>
          <Link className="button secondary" href="/evidence/review">
            Open review surface
          </Link>
        </div>

        {evidenceCatalog && evidenceCatalog.items.length > 0 ? (
          <div className="workspace-card-grid workspace-card-grid--narrow">
            {evidenceCatalog.items.slice(0, 4).map((item) => (
              <article className="workspace-card" key={item.id}>
                <div className="workspace-card__meta">
                  <span className="badge subtle">pending</span>
                  <span className="muted">{item.source_type}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="workspace-chip-list compact">
                  <span className="meta-chip meta-chip--copper">
                    {item.evidence_type}
                  </span>
                  <span className="meta-chip">{item.strength_level}</span>
                </div>
                <div className="hero-actions">
                  <Link
                    className="button secondary"
                    href={`/evidence/review/${item.id}`}
                  >
                    Review detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-empty-panel">
            <strong>No pending evidence items</strong>
            <p>The analyst review queue is currently clear.</p>
          </div>
        )}
      </section>
    </div>
  );
}
