'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { EvidenceBacklogTable } from '@/components/dashboard/evidence-backlog-table';
import { RecentRunsTable } from '@/components/dashboard/recent-runs-table';
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
        description="The workspace payload did not arrive from the API."
        title="Dashboard unavailable"
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
  const hasLatestLinks =
    Boolean(workspace.quick_actions.latest_evaluation_href) ||
    Boolean(workspace.quick_actions.latest_case_history_href);
  const workspaceSurfaces = [
    {
      detail:
        'Draft a new case with explicit assumptions, evidence selection, and visible submission stages.',
      href: workspace.quick_actions.new_evaluation_href,
      label: 'Open input deck',
      title: 'Input Deck',
      tone: 'accent' as const,
    },
    {
      detail:
        'Search saved evaluations, reopen workspaces, and move directly into history or comparison.',
      href: '/evaluations',
      label: 'Open evaluations',
      title: 'Evaluation registry',
      tone: 'default' as const,
    },
    {
      detail:
        'Review imported evidence before it becomes eligible for deterministic intake.',
      href: workspace.quick_actions.evidence_review_href,
      label: 'Open evidence review',
      title: 'Evidence Review',
      tone: 'warning' as const,
    },
    latestRun
      ? {
          detail:
            'Jump straight to the latest printable output once a saved run already exists in the workspace.',
          href: `/evaluations/${latestRun.evaluation_id}/report`,
          label: 'Open latest report',
          title: 'Report surface',
          tone: 'success' as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    detail: string;
    href: string;
    label: string;
    title: string;
    tone: 'accent' | 'default' | 'success' | 'warning';
  }>;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            <Link
              className="button"
              href={workspace.quick_actions.new_evaluation_href}
            >
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
        badge="Operational dashboard"
        chips={[
          `Workspace schema ${workspace.meta.versions.workspace_schema_version}`,
          `Rules ${workspace.meta.versions.ruleset_version}`,
          `Contracts ${workspace.meta.versions.contract_version}`,
        ]}
        description={workspace.hero.subtitle}
        title={workspace.hero.title}
      />

      <section className="workspace-stats-grid" aria-label="Workspace KPIs">
        <WorkspaceStatCard
          detail={`${workspace.summary.total_cases} tracked cases in the local-first runtime.`}
          footer={
            <Sparkline
              label="Saved-run growth"
              values={workspace.trends.run_growth}
            />
          }
          label="Saved runs"
          value={workspace.summary.total_runs}
        />
        <WorkspaceStatCard
          detail="Runs that currently resolve with high confidence."
          footer={
            <Sparkline
              label="Confidence trend"
              values={workspace.trends.confidence}
            />
          }
          label="High-confidence runs"
          tone="success"
          value={workspace.summary.high_confidence_runs}
        />
        <WorkspaceStatCard
          detail="Runs with a finished simulation enrichment artifact."
          footer={
            <Sparkline
              label="Model coverage trend"
              values={workspace.trends.model_coverage}
            />
          }
          label="Completed model artifacts"
          tone="accent"
          value={workspace.summary.modeled_runs}
        />
        <WorkspaceStatCard
          detail={`${workspace.summary.accepted_evidence} accepted and ${workspace.summary.rejected_evidence} rejected records remain visible for auditability.`}
          label="Pending evidence"
          tone="warning"
          value={workspace.summary.pending_evidence}
        />
      </section>

      <WorkspaceSection
        description="Move through the current METREV product surfaces without leaving the analyst workspace language."
        eyebrow="Workspace surfaces"
        title="Primary modules"
      >
        <div className="workspace-card-list workspace-card-list--modules">
          {workspaceSurfaces.map((surface) => (
            <WorkspaceDataCard key={surface.title} tone={surface.tone}>
              <span className="badge subtle">{surface.title}</span>
              <h3>{surface.label}</h3>
              <p>{surface.detail}</p>
              <div className="workspace-action-row">
                <Link className="ghost-button" href={surface.href}>
                  {surface.label}
                </Link>
              </div>
            </WorkspaceDataCard>
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        actions={
          hasLatestLinks ? (
            <>
              {workspace.quick_actions.latest_evaluation_href ? (
                <Link
                  className="button secondary"
                  href={workspace.quick_actions.latest_evaluation_href}
                >
                  Open result
                </Link>
              ) : null}
              {workspace.quick_actions.latest_case_history_href ? (
                <Link
                  className="button secondary"
                  href={workspace.quick_actions.latest_case_history_href}
                >
                  Open case history
                </Link>
              ) : null}
            </>
          ) : null
        }
        description={
          workspace.hero.latest_summary ??
          'Run a first deterministic evaluation to populate history, comparison, and reporting surfaces.'
        }
        eyebrow="Latest run"
        title={workspace.hero.latest_case_id ?? 'No saved run yet'}
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
            {hasLatestLinks ? (
              <WorkspaceDataCard tone="accent">
                <span className="badge subtle">Quick links</span>
                <h3>Latest navigation targets</h3>
                <p>
                  Jump directly to the latest evaluation workspace or the case
                  history endpoint without scanning the tables below.
                </p>
                <div className="workspace-action-row">
                  {workspace.quick_actions.latest_evaluation_href ? (
                    <Link
                      className="ghost-button"
                      href={workspace.quick_actions.latest_evaluation_href}
                    >
                      Latest evaluation
                    </Link>
                  ) : null}
                  {workspace.quick_actions.latest_case_history_href ? (
                    <Link
                      className="ghost-button"
                      href={workspace.quick_actions.latest_case_history_href}
                    >
                      Latest case history
                    </Link>
                  ) : null}
                </div>
              </WorkspaceDataCard>
            ) : null}
          </div>
        ) : (
          <WorkspaceEmptyState
            description="Create the first evaluation to populate the saved-run workspace."
            primaryHref="/cases/new"
            primaryLabel="Draft new evaluation"
            title="No evaluation yet"
          />
        )}
      </WorkspaceSection>

      <div className="workspace-split-grid">
        <WorkspaceSection
          description="Every run keeps confidence, model state, and case history visible from the dashboard."
          eyebrow="Recent runs"
          title="Re-open saved analyses"
        >
          <RecentRunsTable runs={workspace.recent_runs} />
        </WorkspaceSection>

        <WorkspaceSection
          actions={
            <Link className="button secondary" href="/evidence/review">
              Open review queue
            </Link>
          }
          description="Only accepted evidence can enter intake. Pending and rejected items remain explicit and auditable."
          eyebrow="Evidence backlog"
          title="Review queue"
        >
          <EvidenceBacklogTable items={workspace.evidence_backlog} />
        </WorkspaceSection>
      </div>
    </div>
  );
}
