'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { RecentRunsTable } from '@/components/dashboard/recent-runs-table';
import { TabsContent } from '@/components/ui/tabs';
import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
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
  const latestRun = workspace.recent_evaluations[0] ?? null;
  const hasSavedRuns = workspace.summary.total_runs > 0;
  const latestRunOverview = workspace.latest_run_overview;
  const evidenceCatalog = workspace.evidence_catalog ?? {
    total: 0,
    catalog_total: 0,
    filtered_total: 0,
    pending: 0,
    pending_review: 0,
    accepted: 0,
    rejected: 0,
    failed_ingestion: 0,
    duplicate_skipped: 0,
    canonical_processed: 0,
    canonical_extracted: 0,
    canonical_insufficient_source: 0,
    canonical_needs_full_text: 0,
    canonical_needs_review: 0,
    canonical_failed: 0,
    canonical_facts: 0,
    benchmark_ready_facts: 0,
    benchmark_aggregates: 0,
    last_ingestion_batch: null,
    ingestion_progress: null,
    canonicalization_progress: null,
    page: 1,
    page_size: 1,
    total_pages: 1,
    returned: 0,
  };
  const presentation = workspace.presentation;
  const tabItems = [
    { value: 'overview', label: 'Overview' },
    { value: 'runs', label: 'Runs' },
    { value: 'reports', label: 'Reports' },
  ];
  const actionTiles = [
    {
      description:
        'Define stack inputs, validate critical fields, and submit a deterministic run from the main client workspace.',
      href: workspace.quick_actions.new_evaluation_href,
      label: 'Configure stack',
      title: 'Configure stack',
    },
    {
      description: hasSavedRuns
        ? 'Reopen diagnosis, recommendations, modeling, report, and audit for saved runs.'
        : 'The evaluation registry is currently clean. Saved runs will appear here after the first submission.',
      href: '/evaluations',
      label: 'Open evaluations',
      title: 'Evaluation registry',
    },
    {
      description: hasSavedRuns
        ? 'Open client-safe report outputs generated from saved evaluations.'
        : 'Reports appear here after the first deterministic evaluation is saved.',
      href: '/reports',
      label: 'Open reports',
      title: 'Reports',
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
              Configure stack
            </Link>
            <Link className="button secondary" href="/evaluations">
              Open evaluations
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

      <div className="workspace-detail-grid">
        <WorkspaceStatCard
          detail={
            hasSavedRuns
              ? `${workspace.summary.total_cases} configured case threads currently have deterministic output available.`
              : 'No saved evaluations remain in this local workspace yet.'
          }
          label="Saved evaluations"
          tone="default"
          value={workspace.summary.total_runs}
        />
        <WorkspaceStatCard
          detail={
            hasSavedRuns
              ? `${latestRunOverview?.parameter_summary.system_defaults ?? 0} explicit defaulted parameter(s) remain visible in the latest run.`
              : 'Defaults remain explicit after the first deterministic evaluation is saved.'
          }
          label="Latest defaults"
          tone="warning"
          value={latestRunOverview?.defaults_count ?? 0}
        />
        <WorkspaceStatCard
          detail={
            hasSavedRuns
              ? `${latestRunOverview?.assumptions_count ?? 0} explicit assumption(s) accompany the latest run.`
              : 'Missing-data posture is established after deterministic evaluation and evidence review.'
          }
          label="Missing-data flags"
          tone="accent"
          value={latestRunOverview?.missing_data_count ?? 0}
        />
        <WorkspaceStatCard
          detail={
            hasSavedRuns
              ? `${latestRunOverview?.parameter_summary.client_values ?? 0} client value(s) · ${latestRunOverview?.parameter_summary.system_defaults ?? 0} default(s) · ${latestRunOverview?.parameter_summary.excluded ?? 0} excluded.`
              : 'Parameter controls stay explicit after the first deterministic evaluation is saved.'
          }
          label="Parameter controls"
          tone="success"
          value={latestRunOverview?.parameter_summary.total ?? 0}
        />
      </div>

      <div className="workspace-detail-grid">
        <WorkspaceStatCard
          detail={`${evidenceCatalog.accepted} accepted, ${evidenceCatalog.pending_review ?? evidenceCatalog.pending} requiring exception review.`}
          label="Evidence catalog total"
          tone="accent"
          value={evidenceCatalog.catalog_total ?? evidenceCatalog.total}
        />
        <WorkspaceStatCard
          detail="Trusted scientific records accepted by policy after validation, normalization, dedupe, and audit."
          label="System-accepted evidence"
          tone="success"
          value={evidenceCatalog.accepted}
        />
        <WorkspaceStatCard
          detail={`${evidenceCatalog.failed_ingestion} failed ingestion record(s) remain visible for audit.`}
          label="Review exceptions"
          tone="warning"
          value={evidenceCatalog.pending_review ?? evidenceCatalog.pending}
        />
        <WorkspaceStatCard
          detail={`${evidenceCatalog.canonical_facts} canonical fact(s); ${evidenceCatalog.benchmark_aggregates} benchmark aggregate range(s).`}
          label="Decision-ready facts"
          tone="default"
          value={evidenceCatalog.benchmark_ready_facts}
        />
      </div>

      <div className="workspace-detail-grid">
        <WorkspaceStatCard
          detail={`${evidenceCatalog.canonical_insufficient_source} insufficient source, ${evidenceCatalog.canonical_needs_full_text} needing full text.`}
          label="Canonicalized articles"
          tone="accent"
          value={evidenceCatalog.canonical_processed}
        />
        <WorkspaceStatCard
          detail={`${evidenceCatalog.canonical_needs_review} canonicalization exception(s); ${evidenceCatalog.canonical_failed} failed extraction(s).`}
          label="Decision exceptions"
          tone="warning"
          value={
            evidenceCatalog.canonical_needs_review +
            evidenceCatalog.canonical_failed
          }
        />
        <WorkspaceStatCard
          detail={`Last ingestion batch: ${evidenceCatalog.last_ingestion_batch ?? 'none'}.`}
          label="Duplicate skipped"
          tone="default"
          value={evidenceCatalog.duplicate_skipped}
        />
        <WorkspaceStatCard
          detail={
            evidenceCatalog.canonicalization_progress
              ? `${evidenceCatalog.canonicalization_progress.processed_total} processed of ${evidenceCatalog.canonicalization_progress.target_total}.`
              : 'Canonicalization run status is loaded from persisted audit records.'
          }
          label="Canonicalization progress"
          tone="success"
          value={
            evidenceCatalog.canonicalization_progress
              ? Math.round(
                  evidenceCatalog.canonicalization_progress.completion_ratio *
                    100,
                )
              : 0
          }
        />
      </div>

      <WorkspaceTabShell
        activeTab={activeTab}
        items={tabItems}
        label="Dashboard tabs"
        onTabChange={(value) => {
          if (value === 'overview' || value === 'runs' || value === 'reports') {
            onTabChange?.(value);
          }
        }}
        summary="Start a configuration, continue saved work, or open report output from the main client workspace without foregrounding internal admin operations."
        title="Client workspace"
      >
        <TabsContent value="overview">
          <WorkspaceSection
            description={
              hasSavedRuns
                ? 'Start a new configuration, reopen the latest saved output, or move directly into reports and evaluations.'
                : 'No saved evaluations remain in this local workspace. Configure a stack to generate diagnosis, modeling, reports, and audit output.'
            }
            eyebrow={hasSavedRuns ? 'Current workspace' : 'Clean workspace'}
            title={hasSavedRuns ? 'Start or continue' : 'Start the first stack'}
          >
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
          </WorkspaceSection>

          {hasSavedRuns ? (
            <div className="workspace-detail-grid">
              <WorkspaceDataCard tone="accent">
                <span className="badge subtle">Latest saved run</span>
                <h3>{workspace.hero.latest_case_id ?? 'No saved run yet'}</h3>
                <p>
                  {workspace.hero.latest_summary ??
                    'Run a first deterministic evaluation to populate the workspace.'}
                </p>
                {latestRun ? (
                  <div className="workspace-chip-list compact">
                    <span className="meta-chip">
                      {formatToken(latestRun.confidence_level)} confidence
                    </span>
                    <span className="meta-chip">
                      {formatToken(latestRun.technology_family)}
                    </span>
                    <span className="meta-chip">
                      {formatToken(latestRun.primary_objective)}
                    </span>
                    <span className="meta-chip">
                      {formatTimestamp(latestRun.created_at)}
                    </span>
                  </div>
                ) : null}
                {latestRunOverview ? (
                  <div className="workspace-chip-list compact">
                    <span className="meta-chip meta-chip--warning">
                      {latestRunOverview.defaults_count} defaults
                    </span>
                    <span className="meta-chip meta-chip--accent">
                      {latestRunOverview.missing_data_count} missing-data flags
                    </span>
                    <span className="meta-chip meta-chip--success">
                      {latestRunOverview.evidence_count} typed evidence
                    </span>
                  </div>
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
              </WorkspaceDataCard>

              <WorkspaceDataCard>
                <span className="badge subtle">Latest run posture</span>
                <h3>
                  Readiness, defaults, and next action stay client-visible
                </h3>
                {latestRunOverview ? (
                  <>
                    <div className="workspace-card-list workspace-card-list--modules">
                      {latestRunOverview.brief_cards.map((card) => (
                        <article
                          className="workspace-inline-card"
                          key={card.key}
                        >
                          <strong>{card.label}</strong>
                          <span>{card.value}</span>
                          <p>{card.detail}</p>
                        </article>
                      ))}
                    </div>
                    <div className="workspace-chip-list compact">
                      <span className="meta-chip meta-chip--accent">
                        Next action {latestRunOverview.lead_action.title}
                      </span>
                      <span className="meta-chip">
                        {latestRunOverview.lead_action.confidence_label}{' '}
                        confidence
                      </span>
                      <span className="meta-chip">
                        {latestRunOverview.output_status.modeled
                          ? 'Modeled output ready'
                          : 'Modeling pending'}
                      </span>
                    </div>
                    <p>{latestRunOverview.lead_action.rationale}</p>
                    {latestRunOverview.attention_items.length > 0 ? (
                      <ul className="workspace-bullet-list">
                        {latestRunOverview.attention_items.map((item) => (
                          <li key={item.key}>
                            {item.block}: {item.finding}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        No open attention items remain in the latest run
                        posture.
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    Reports, evaluation detail, and audit output stay connected
                    to each saved run without exposing internal research
                    operations in the client workspace.
                  </p>
                )}
              </WorkspaceDataCard>
            </div>
          ) : (
            <div className="workspace-detail-grid">
              <WorkspaceDataCard tone="accent">
                <span className="badge subtle">
                  What appears after the first run
                </span>
                <h3>Generated outputs stay separate from stack input work</h3>
                <ul className="workspace-bullet-list">
                  <li>Diagnosis and prioritized recommendations</li>
                  <li>Modeling and report-ready narrative output</li>
                  <li>
                    Assumptions, defaults used, missing data, and audit trace
                  </li>
                </ul>
              </WorkspaceDataCard>

              <WorkspaceDataCard>
                <span className="badge subtle">Client workflow note</span>
                <h3>Research and evidence operations stay separate</h3>
                <p>
                  This page stays focused on client decision work. Evidence
                  intake, review queues, and research backfill remain under
                  Admin Intelligence.
                </p>
              </WorkspaceDataCard>
            </div>
          )}
        </TabsContent>

        <TabsContent value="runs">
          <WorkspaceSection
            description="Reopen deterministic results, diagnosis, modeling, and audit without leaving the client workspace."
            eyebrow="Saved analyses"
            title="Evaluation registry"
          >
            {hasSavedRuns ? (
              <RecentRunsTable runs={workspace.recent_evaluations} />
            ) : (
              <WorkspaceEmptyState
                description="This local registry is clean. Configure a stack to generate the next deterministic run."
                primaryHref={workspace.quick_actions.new_evaluation_href}
                primaryLabel="Configure stack"
                title="No saved evaluations yet"
              />
            )}
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="reports">
          <WorkspaceSection
            actions={
              <Link className="button secondary" href="/reports">
                Open full report registry
              </Link>
            }
            description="Use this tab for normal client report access. The dedicated reports route remains available when you need a wider registry view."
            eyebrow="Client deliverables"
            title="Report outputs"
          >
            {workspace.recent_reports.length > 0 ? (
              <div className="workspace-card-list">
                {workspace.recent_reports.map((run) => (
                  <WorkspaceDataCard key={run.evaluation_id}>
                    <span className="badge subtle">{run.case_id} report</span>
                    <h3>{formatToken(run.confidence_level)} confidence</h3>
                    <p>{run.summary}</p>
                    <div className="workspace-chip-list compact">
                      <span className="meta-chip">
                        {formatToken(run.technology_family)}
                      </span>
                      <span className="meta-chip">
                        {formatToken(run.primary_objective)}
                      </span>
                      <span className="meta-chip">
                        {formatTimestamp(run.created_at)}
                      </span>
                    </div>
                    <div className="workspace-action-row">
                      <Link className="button secondary" href={run.report_href}>
                        Open report
                      </Link>
                      <Link
                        className="button secondary"
                        href={`/evaluations/${run.evaluation_id}`}
                      >
                        Evaluation
                      </Link>
                      <Link
                        className="button secondary"
                        href={`/cases/${run.case_id}/history`}
                      >
                        Case history
                      </Link>
                    </div>
                  </WorkspaceDataCard>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState
                description="No report output is available yet. Submit the first deterministic evaluation to generate client-facing deliverables."
                primaryHref={workspace.quick_actions.new_evaluation_href}
                primaryLabel="Configure stack"
                title="No reports yet"
              />
            )}
          </WorkspaceSection>
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
