'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { EvidenceBacklogTable } from '@/components/dashboard/evidence-backlog-table';
import { RecentRunsTable } from '@/components/dashboard/recent-runs-table';
import { TabsContent } from '@/components/ui/tabs';
import { Sparkline } from '@/components/workbench/sparkline';
import {
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { ChartPanel } from '@/components/workspace/chart-panel';
import { SummaryRail } from '@/components/workspace/summary-rail';
import { WorkspaceTabShell } from '@/components/workspace/workspace-tab-shell';
import { fetchDashboardWorkspace } from '@/lib/api';
import {
    type DashboardTab,
    useDashboardTab,
} from '@/lib/dashboard-view-query-state';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

export function DashboardWorkspace() {
  const [activeTab, setActiveTab] = useDashboardTab();
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

  return (
    <DashboardWorkspaceView
      activeTab={activeTab}
      onTabChange={setActiveTab}
      workspace={workspace}
    />
  );
}

export function DashboardWorkspaceView({
  activeTab = 'overview',
  onTabChange,
  workspace,
}: {
  activeTab?: DashboardTab;
  onTabChange?: (nextTab: DashboardTab) => void;
  workspace: Awaited<ReturnType<typeof fetchDashboardWorkspace>>;
}) {
  const latestRun = workspace.recent_runs[0] ?? null;
  const presentation = workspace.presentation;
  const tabItems = presentation?.tabs.map((tab) => ({
    value: tab.key,
    label: tab.label,
  })) ?? [
    { value: 'overview', label: 'Overview' },
    { value: 'runs', label: 'Runs' },
    { value: 'evidence', label: 'Evidence' },
    { value: 'research', label: 'Research' },
  ];
  const summaryItems = [
    {
      key: 'saved-runs',
      label: 'Saved runs',
      value: workspace.summary.total_runs,
      detail: `${workspace.summary.total_cases} tracked cases remain auditable in the workspace.`,
      tone: 'default' as const,
      footer: (
        <Sparkline
          label="Saved-run growth"
          values={workspace.trends.run_growth}
        />
      ),
    },
    {
      key: 'high-confidence',
      label: 'High-confidence runs',
      value: workspace.summary.high_confidence_runs,
      detail: 'Runs currently resolving with high confidence.',
      tone: 'success' as const,
      footer: (
        <Sparkline
          label="Confidence trend"
          values={workspace.trends.confidence}
        />
      ),
    },
    {
      key: 'modeled-runs',
      label: 'Completed model artifacts',
      value: workspace.summary.modeled_runs,
      detail: 'Saved runs with finished simulation enrichment.',
      tone: 'accent' as const,
      footer: (
        <Sparkline
          label="Model coverage trend"
          values={workspace.trends.model_coverage}
        />
      ),
    },
    {
      key: 'pending-evidence',
      label: 'Pending evidence',
      value: workspace.summary.pending_evidence,
      detail: `${workspace.summary.accepted_evidence} accepted and ${workspace.summary.rejected_evidence} rejected records stay visible for audit.`,
      tone: 'warning' as const,
    },
  ];
  const actionTiles = [
    {
      description:
        'Draft a new case with explicit assumptions and compact step guidance.',
      href: workspace.quick_actions.new_evaluation_href,
      label: 'Open input deck',
      title: 'Input deck',
    },
    {
      description:
        'Search saved evaluations and reopen workspaces without repeating dashboard metrics.',
      href: '/evaluations',
      label: 'Open evaluations',
      title: 'Evaluation registry',
    },
    {
      description:
        'Review evidence records without showing the same catalog in multiple places.',
      href: workspace.quick_actions.evidence_review_href,
      label: 'Open evidence review',
      title: 'Evidence review',
    },
    {
      description:
        'Open the research workspace for review packs and extraction follow-up.',
      href: '/research/reviews',
      label: 'Open research reviews',
      title: 'Research reviews',
    },
  ];

  return (
    <div className="workspace-page workspace-page--flat">
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
        badge="Dashboard"
        chips={[
          `Workspace schema ${workspace.meta.versions.workspace_schema_version}`,
          `Rules ${workspace.meta.versions.ruleset_version}`,
          `Contracts ${workspace.meta.versions.contract_version}`,
          ...(presentation?.badges.map((badge) => badge.label) ?? []),
        ]}
        description={presentation?.short_summary ?? workspace.hero.subtitle}
        title={presentation?.page_title ?? workspace.hero.title}
      />

      <SummaryRail items={summaryItems} label="Dashboard summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={tabItems}
        label="Dashboard tabs"
        onTabChange={(value) => {
          if (
            value === 'overview' ||
            value === 'runs' ||
            value === 'evidence' ||
            value === 'research'
          ) {
            onTabChange?.(value);
          }
        }}
        summary="Summary first, details by tab, and no repeated tables in the first fold."
        title="Workspace focus"
      >
        <TabsContent value="overview">
          <div className="workspace-band-grid">
            <ChartPanel
              meta={`${workspace.summary.total_runs} saved`}
              summary="Recent saved-run sequence across the current dashboard slice."
              title="Run momentum"
            >
              <Sparkline
                label="Saved-run growth"
                values={workspace.trends.run_growth}
              />
            </ChartPanel>
            <ChartPanel
              meta={`${workspace.summary.high_confidence_runs} high confidence`}
              summary="Confidence trend for the current set of saved analyses."
              title="Confidence posture"
            >
              <Sparkline
                label="Confidence trend"
                values={workspace.trends.confidence}
              />
            </ChartPanel>
            <article className="workspace-band summary-callout">
              <span className="badge subtle">Latest run</span>
              <h3>{workspace.hero.latest_case_id ?? 'No saved run yet'}</h3>
              <p>
                {workspace.hero.latest_summary ??
                  'Run a first deterministic evaluation to populate the workspace.'}
              </p>
              {latestRun ? (
                <ul className="workspace-note-list">
                  <li>{formatToken(latestRun.confidence_level)} confidence</li>
                  <li>{formatToken(latestRun.technology_family)}</li>
                  <li>{formatToken(latestRun.primary_objective)}</li>
                  <li>{formatTimestamp(latestRun.created_at)}</li>
                </ul>
              ) : null}
              <div className="workspace-action-row">
                {workspace.quick_actions.latest_evaluation_href ? (
                  <Link
                    className="button secondary"
                    href={workspace.quick_actions.latest_evaluation_href}
                  >
                    Open latest run
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
              </div>
            </article>
            <div className="workspace-action-tile-grid">
              {actionTiles.map((tile) => (
                <Link
                  className="workspace-action-tile"
                  href={tile.href}
                  key={tile.title}
                >
                  <span className="badge subtle">{tile.title}</span>
                  <strong>{tile.label}</strong>
                  <p>{tile.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="runs">
          <article className="workspace-band">
            <div className="workspace-band__header">
              <div>
                <h3>Saved analyses</h3>
                <p>
                  Reopen runs without repeating the dashboard summary above.
                </p>
              </div>
            </div>
            <RecentRunsTable runs={workspace.recent_runs} />
          </article>
        </TabsContent>

        <TabsContent value="evidence">
          <article className="workspace-band">
            <div className="workspace-band__header">
              <div>
                <h3>Evidence backlog</h3>
                <p>
                  Pending, accepted, and rejected records remain visible in one
                  professional table.
                </p>
              </div>
              <Link className="button secondary" href="/evidence/review">
                Open review queue
              </Link>
            </div>
            <EvidenceBacklogTable items={workspace.evidence_backlog} />
          </article>
        </TabsContent>

        <TabsContent value="research">
          <article className="workspace-band summary-callout">
            <span className="badge subtle">Research reviews</span>
            <h3>
              Open the research workspace when the decision needs deeper
              evidence synthesis.
            </h3>
            <p>
              Reviews, extraction, and evidence-pack follow-up now live behind a
              dedicated research route instead of the dashboard first fold.
            </p>
            <div className="workspace-action-row">
              <Link className="button secondary" href="/research/reviews">
                Open research reviews
              </Link>
            </div>
          </article>
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
