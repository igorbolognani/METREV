'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { EvaluationActionsTab } from '@/components/evaluation/evaluation-actions-tab';
import { EvaluationAuditTab } from '@/components/evaluation/evaluation-audit-tab';
import { EvaluationCompareCandidateSelect } from '@/components/evaluation/evaluation-compare-candidate-select';
import { EvaluationModelingTab } from '@/components/evaluation/evaluation-modeling-tab';
import { EvaluationOverviewTab } from '@/components/evaluation/evaluation-overview-tab';
import { EvaluationReportTab } from '@/components/evaluation/evaluation-report-tab';
import { EvaluationRoadmapSuppliersTab } from '@/components/evaluation/evaluation-roadmap-suppliers-tab';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import {
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { SummaryRail } from '@/components/workspace/summary-rail';
import { WorkspaceTabShell } from '@/components/workspace/workspace-tab-shell';
import { apiBaseUrl, fetchEvaluationWorkspace } from '@/lib/api';
import {
    useEvaluationTab,
    type EvaluationTab,
} from '@/lib/evaluation-view-query-state';
import { formatToken } from '@/lib/formatting';

void React;

function toneClass(
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

function resolveWorkspaceHref(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  return `${apiBaseUrl}${href}`;
}

function attentionHeading(severity: string, block: string) {
  return `${formatToken(severity)} · ${block}`;
}

function EvaluationAttentionStrip({
  items,
}: {
  items: Awaited<
    ReturnType<typeof fetchEvaluationWorkspace>
  >['overview']['attention_items'];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="evaluation-attention-strip"
      aria-label="Attention items"
    >
      {items.map((item) => (
        <article
          className={`workspace-data-card workspace-data-card--${toneClass(item.tone)}`}
          key={item.key}
        >
          <span className="badge subtle">
            {attentionHeading(item.severity, item.block)}
          </span>
          <h3>{item.finding}</h3>
        </article>
      ))}
    </section>
  );
}

export function EvaluationResultView({
  evaluationId,
}: {
  evaluationId: string;
}) {
  const [activeTab, setActiveTab] = useEvaluationTab();
  const query = useQuery({
    queryKey: ['evaluation-workspace', evaluationId],
    queryFn: () => fetchEvaluationWorkspace(evaluationId),
  });

  if (query.isLoading) {
    return (
      <div className="workspace-page">
        <WorkspaceSkeleton lines={6} />
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
        title="Workspace unavailable"
        description="The evaluation workspace payload could not be loaded."
      />
    );
  }

  return (
    <EvaluationWorkspaceView
      activeTab={activeTab}
      onTabChange={(nextTab) => {
        void setActiveTab(nextTab);
      }}
      workspace={workspace}
    />
  );
}

export function EvaluationWorkspaceView({
  workspace,
  activeTab = 'diagnosis',
  onTabChange,
}: {
  workspace: Awaited<ReturnType<typeof fetchEvaluationWorkspace>>;
  activeTab?: EvaluationTab;
  onTabChange?: (nextTab: EvaluationTab) => void;
}) {
  const evaluation = workspace.evaluation;
  const simulation = evaluation.simulation_enrichment;
  const presentation = workspace.presentation;
  const tabs = presentation?.tabs.map((tab) => ({
    value: tab.key,
    label: tab.label,
    badge:
      tab.key === 'recommendations'
        ? evaluation.decision_output.prioritized_improvement_options.length
        : tab.key === 'modeling'
          ? (simulation?.series.length ?? 0)
        : tab.key === 'audit'
            ? evaluation.decision_output.assumptions_and_defaults_audit
                .defaults_used.length +
              evaluation.decision_output.assumptions_and_defaults_audit
                .missing_data.length
            : tab.key === 'roadmap'
              ? evaluation.decision_output.phased_roadmap.length +
                evaluation.decision_output.supplier_shortlist.length
              : undefined,
  })) ?? [
    { value: 'diagnosis', label: 'Diagnosis' },
    {
      value: 'recommendations',
      label: 'Recommendations',
      badge: evaluation.decision_output.prioritized_improvement_options.length,
    },
    {
      value: 'modeling',
      label: 'Modeling',
      badge: simulation?.series.length ?? 0,
    },
    {
      value: 'roadmap',
      label: 'Roadmap & Suppliers',
      badge:
        evaluation.decision_output.phased_roadmap.length +
        evaluation.decision_output.supplier_shortlist.length,
    },
    {
      value: 'report',
      label: 'Report',
      badge: evaluation.decision_output.prioritized_improvement_options.length,
    },
    {
      value: 'audit',
      label: 'Audit',
      badge:
        evaluation.decision_output.assumptions_and_defaults_audit.defaults_used
          .length +
        evaluation.decision_output.assumptions_and_defaults_audit.missing_data
          .length,
    },
  ];
  const exportJsonHref = resolveWorkspaceHref(workspace.links.export_json_href);
  const exportCsvHref = resolveWorkspaceHref(workspace.links.export_csv_href);
  const summaryItems = workspace.overview.hero_cards.map((card) => ({
    detail: card.detail,
    key: card.key,
    label: card.label,
    tone: toneClass(card.tone),
    value: card.value,
  }));

  return (
    <div
      className="workspace-page evaluation-workspace"
      data-testid="evaluation-workspace"
    >
      <WorkspacePageHeader
        actions={
          <>
            <EvaluationCompareCandidateSelect
              candidates={workspace.history_summary.compare_candidates}
              evaluationId={evaluation.evaluation_id}
            />
            {workspace.links.compare_href ? (
              <Button asChild size="sm" variant="outline">
                <Link href={workspace.links.compare_href}>Compare</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href={workspace.links.history_href}>Case history</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={workspace.links.report_href}>Report</Link>
            </Button>
            <Button asChild size="sm" variant="default">
              <a download href={exportJsonHref}>
                Export JSON
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a download href={exportCsvHref}>
                Export CSV
              </a>
            </Button>
          </>
        }
        badge="Evaluation workspace"
        chips={[
          `Workspace schema ${workspace.meta.versions.workspace_schema_version}`,
          ...(presentation?.badges.map((badge) => badge.label) ?? [
            `${formatToken(
              evaluation.decision_output.confidence_and_uncertainty_summary
                .confidence_level,
            )} confidence`,
            `Model ${formatToken(simulation?.status ?? 'unavailable')}`,
          ]),
        ]}
        description={presentation?.short_summary ?? workspace.overview.subtitle}
        title={presentation?.page_title ?? workspace.overview.title}
      />

      <EvaluationAttentionStrip items={workspace.overview.attention_items} />

      <SummaryRail items={summaryItems} label="Evaluation summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={tabs}
        label="Evaluation workspace tabs"
        onTabChange={(value) => {
          if (
            value === 'diagnosis' ||
            value === 'recommendations' ||
            value === 'modeling' ||
            value === 'roadmap' ||
            value === 'report' ||
            value === 'audit'
          ) {
            onTabChange?.(value);
          }
        }}
        summary="Diagnosis, recommendations, modeling, roadmap, report, and audit remain separated so the client path stays readable."
        title="Decision layers"
      >
        <TabsContent value="diagnosis">
          <EvaluationOverviewTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="recommendations">
          <EvaluationActionsTab evaluation={evaluation} />
        </TabsContent>
        <TabsContent value="modeling">
          <EvaluationModelingTab evaluation={evaluation} />
        </TabsContent>
        <TabsContent value="roadmap">
          <EvaluationRoadmapSuppliersTab evaluation={evaluation} />
        </TabsContent>
        <TabsContent value="report">
          <EvaluationReportTab evaluation={evaluation} />
        </TabsContent>
        <TabsContent value="audit">
          <EvaluationAuditTab
            evaluationId={evaluation.evaluation_id}
            workspace={workspace}
          />
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
