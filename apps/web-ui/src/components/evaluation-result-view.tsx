'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { EvaluationAuditTab } from '@/components/evaluation/evaluation-audit-tab';
import { EvaluationCompareCandidateSelect } from '@/components/evaluation/evaluation-compare-candidate-select';
import { EvaluationModelingTab } from '@/components/evaluation/evaluation-modeling-tab';
import { EvaluationOverviewTab } from '@/components/evaluation/evaluation-overview-tab';
import { EvaluationRecommendationsTab } from '@/components/evaluation/evaluation-recommendations-tab';
import { EvaluationRoadmapSuppliersTab } from '@/components/evaluation/evaluation-roadmap-suppliers-tab';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSkeleton,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
import { apiBaseUrl, fetchEvaluationWorkspace } from '@/lib/api';
import {
    evaluationTabValues,
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

function isEvaluationTab(value: string): value is EvaluationTab {
  return evaluationTabValues.some((entry) => entry === value);
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
  activeTab = 'overview',
  onTabChange,
}: {
  workspace: Awaited<ReturnType<typeof fetchEvaluationWorkspace>>;
  activeTab?: EvaluationTab;
  onTabChange?: (nextTab: EvaluationTab) => void;
}) {
  const evaluation = workspace.evaluation;
  const simulation = evaluation.simulation_enrichment;
  const tabs = [
    { value: 'overview', label: 'Overview' },
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
      value: 'audit',
      label: 'Audit',
      badge:
        evaluation.decision_output.assumptions_and_defaults_audit.defaults_used
          .length +
        evaluation.decision_output.assumptions_and_defaults_audit.missing_data
          .length,
    },
  ];
  const resolvedTab = isEvaluationTab(activeTab) ? activeTab : 'overview';
  const exportJsonHref = resolveWorkspaceHref(workspace.links.export_json_href);
  const exportCsvHref = resolveWorkspaceHref(workspace.links.export_csv_href);

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
          `${formatToken(
            evaluation.decision_output.confidence_and_uncertainty_summary
              .confidence_level,
          )} confidence`,
          `Model ${formatToken(simulation?.status ?? 'unavailable')}`,
          `Workspace schema ${workspace.meta.versions.workspace_schema_version}`,
        ]}
        description={workspace.overview.subtitle}
        title={workspace.overview.title}
      />

      <EvaluationAttentionStrip items={workspace.overview.attention_items} />

      <section className="workspace-stats-grid">
        {workspace.overview.hero_cards.map((card) => (
          <WorkspaceStatCard
            detail={card.detail}
            key={card.key}
            label={card.label}
            tone={toneClass(card.tone)}
            value={card.value}
          />
        ))}
      </section>

      <section className="workspace-detail-grid">
        {workspace.overview.brief_cards.map((card) => (
          <article className="workspace-data-card" key={card.key}>
            <span className="badge subtle">{card.label}</span>
            <h3>{card.value}</h3>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="workspace-section">
        <div className="workspace-section__header">
          <div>
            <h2>Decision layers</h2>
            <p>
              Move through overview, recommendations, modeling, roadmap, and
              audit without mixing them into one overloaded surface.
            </p>
          </div>
        </div>
        <Tabs
          items={tabs}
          label="Evaluation workspace tabs"
          onValueChange={(value) => {
            if (isEvaluationTab(value) && onTabChange) {
              onTabChange(value);
            }
          }}
          value={resolvedTab}
        >
          <TabsContent value="overview">
            <EvaluationOverviewTab workspace={workspace} />
          </TabsContent>
          <TabsContent value="recommendations">
            <EvaluationRecommendationsTab evaluation={evaluation} />
          </TabsContent>
          <TabsContent value="modeling">
            <EvaluationModelingTab evaluation={evaluation} />
          </TabsContent>
          <TabsContent value="roadmap">
            <EvaluationRoadmapSuppliersTab evaluation={evaluation} />
          </TabsContent>
          <TabsContent value="audit">
            <EvaluationAuditTab
              evaluationId={evaluation.evaluation_id}
              workspace={workspace}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
