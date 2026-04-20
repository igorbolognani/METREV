'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { Sparkline } from '@/components/workbench/sparkline';
import {
  WorkspaceDataCard,
  WorkspaceEmptyState,
  WorkspacePageHeader,
  WorkspaceSection,
  WorkspaceSkeleton,
  WorkspaceStatCard,
} from '@/components/workspace-chrome';
import { fetchDashboardWorkspace } from '@/lib/api';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

export function DashboardWorkspace() {
  const query = useQuery({
    queryKey: ['dashboard-workspace'],
    queryFn: fetchDashboardWorkspace,
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
        title="Dashboard unavailable"
        description="The workspace payload did not arrive from the API."
      />
    );
  }

  return <DashboardWorkspaceView workspace={workspace} />;
}

export function DashboardWorkspaceView({
  workspace,
}: {
  workspace: Awaited<ReturnType<typeof fetchDashboardWorkspace>>;
}) {
  const latestRun = workspace.recent_runs[0] ?? null;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Operational dashboard"
        title={workspace.hero.title}
        description={workspace.hero.subtitle}
        chips={[
          `Workspace schema ${workspace.meta.versions.workspace_schema_version}`,
          `Rules ${workspace.meta.versions.ruleset_version}`,
          `Contracts ${workspace.meta.versions.contract_version}`,
        ]}
        actions={
          <>
            <Link className="button" href={workspace.quick_actions.new_evaluation_href}>
              New evaluation
            </Link>
            <Link
              className="button secondary"
              href={workspace.quick_actions.evidence_review_href}
            >
              Evidence review
            </Link>
          </>
        }
      />

      <section className="workspace-stats-grid" aria-label="Workspace KPIs">
        <WorkspaceStatCard
          label="Saved runs"
          value={workspace.summary.total_runs}
          detail={`${workspace.summary.total_cases} tracked cases in the local-first runtime.`}
          footer={<Sparkline label="Saved-run growth" values={workspace.trends.run_growth} />}
        />
        <WorkspaceStatCard
          label="High-confidence runs"
          value={workspace.summary.high_confidence_runs}
          detail="Runs that currently resolve with high confidence."
          tone="success"
          footer={
            <Sparkline label="Confidence trend" values={workspace.trends.confidence} />
          }
        />
        <WorkspaceStatCard
          label="Completed model artifacts"
          value={workspace.summary.modeled_runs}
          detail="Runs with a finished simulation enrichment artifact."
          tone="accent"
          footer={
            <Sparkline
              label="Model coverage trend"
              values={workspace.trends.model_coverage}
            />
          }
        />
        <WorkspaceStatCard
          label="Pending evidence"
          value={workspace.summary.pending_evidence}
          detail={`${workspace.summary.accepted_evidence} accepted and ${workspace.summary.rejected_evidence} rejected records remain visible for auditability.`}
          tone="warning"
        />
      </section>

      <WorkspaceSection
        eyebrow="Latest run"
        title={workspace.hero.latest_case_id ?? 'No saved run yet'}
        description={
          workspace.hero.latest_summary ??
          'Run a first deterministic evaluation to populate history, comparison, and reporting surfaces.'
        }
        actions={
          latestRun ? (
            <>
              <Link className="button secondary" href={`/evaluations/${latestRun.evaluation_id}`}>
                Open result
              </Link>
              <Link
                className="button secondary"
                href={`/cases/${latestRun.case_id}/history`}
              >
                Open case history
              </Link>
            </>
          ) : null
        }
      >
        {latestRun ? (
          <div className="workspace-detail-grid">
            <WorkspaceDataCard>
              <span className="badge subtle">Run summary</span>
              <h3>{latestRun.summary}</h3>
              <p>
                {formatToken(latestRun.confidence_level)} confidence ·{' '}
                {formatToken(latestRun.technology_family)} ·{' '}
                {formatToken(latestRun.primary_objective)}
              </p>
            </WorkspaceDataCard>
            <WorkspaceDataCard>
              <span className="badge subtle">Simulation</span>
              <h3>
                {formatToken(
                  latestRun.simulation_summary?.status ?? 'unavailable',
                )}
              </h3>
              <p>
                Created {formatTimestamp(latestRun.created_at)} with narrative{' '}
                {latestRun.narrative_available ? 'available' : 'disabled'}.
              </p>
            </WorkspaceDataCard>
          </div>
        ) : (
          <WorkspaceEmptyState
            title="No evaluation yet"
            description="Create the first evaluation to populate the saved-run workspace."
            primaryHref="/cases/new"
            primaryLabel="Draft new evaluation"
          />
        )}
      </WorkspaceSection>

      <div className="workspace-split-grid">
        <WorkspaceSection
          eyebrow="Recent runs"
          title="Re-open saved analyses"
          description="Every run keeps confidence, model state, and case history visible from the dashboard."
        >
          {workspace.recent_runs.length > 0 ? (
            <div className="workspace-card-list">
              {workspace.recent_runs.map((item) => (
                <WorkspaceDataCard key={item.evaluation_id}>
                  <div className="workspace-data-card__header">
                    <div>
                      <span className="badge subtle">{item.case_id}</span>
                      <h3>{item.summary}</h3>
                    </div>
                    <span className="meta-chip">
                      {formatToken(item.confidence_level)}
                    </span>
                  </div>
                  <p>
                    {formatToken(item.technology_family)} ·{' '}
                    {formatToken(item.primary_objective)} ·{' '}
                    {formatTimestamp(item.created_at)}
                  </p>
                  <div className="workspace-action-row">
                    <Link className="ghost-button" href={`/evaluations/${item.evaluation_id}`}>
                      Open workspace
                    </Link>
                    <Link className="ghost-button" href={`/cases/${item.case_id}/history`}>
                      Case history
                    </Link>
                  </div>
                </WorkspaceDataCard>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState
              title="No recent runs"
              description="Saved analyses will appear here as soon as the first evaluation is completed."
            />
          )}
        </WorkspaceSection>

        <WorkspaceSection
          eyebrow="Evidence backlog"
          title="Review queue"
          description="Only accepted evidence can enter intake. Pending and rejected items remain explicit and auditable."
          actions={
            <Link className="button secondary" href="/evidence/review">
              Open review queue
            </Link>
          }
        >
          {workspace.evidence_backlog.length > 0 ? (
            <div className="workspace-card-list">
              {workspace.evidence_backlog.map((item) => (
                <WorkspaceDataCard key={item.id}>
                  <div className="workspace-data-card__header">
                    <div>
                      <span className="badge subtle">
                        {formatToken(item.review_status)}
                      </span>
                      <h3>{item.title}</h3>
                    </div>
                    <span className="meta-chip">{formatToken(item.source_type)}</span>
                  </div>
                  <p>{item.summary}</p>
                  <div className="workspace-chip-list compact">
                    <span className="meta-chip">
                      {formatToken(item.evidence_type)}
                    </span>
                    <span className="meta-chip">
                      {formatToken(item.strength_level)}
                    </span>
                  </div>
                  <div className="workspace-action-row">
                    <Link className="ghost-button" href={`/evidence/review/${item.id}`}>
                      Open detail
                    </Link>
                  </div>
                </WorkspaceDataCard>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState
              title="Queue clear"
              description="There are no evidence records waiting for review right now."
            />
          )}
        </WorkspaceSection>
      </div>
    </div>
  );
}
