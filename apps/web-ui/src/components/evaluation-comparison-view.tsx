'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { EvaluationComparisonResponse } from '@metrev/domain-contracts';

import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { SummaryRail } from '@/components/workspace/summary-rail';
import { WorkspaceTabShell } from '@/components/workspace/workspace-tab-shell';
import { fetchEvaluationComparison } from '@/lib/api';
import {
    useEvaluationComparisonTab,
    type EvaluationComparisonTab,
} from '@/lib/evaluation-comparison-view-query-state';
import { formatToken } from '@/lib/formatting';

void React;

export function EvaluationComparisonView({
  evaluationId,
  baselineEvaluationId,
}: {
  evaluationId: string;
  baselineEvaluationId: string;
}) {
  const [activeTab, setActiveTab] = useEvaluationComparisonTab();
  const query = useQuery({
    queryKey: ['evaluation-comparison', evaluationId, baselineEvaluationId],
    queryFn: () =>
      fetchEvaluationComparison(evaluationId, baselineEvaluationId),
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

  const comparison = query.data;
  if (!comparison) {
    return (
      <WorkspaceEmptyState
        title="Comparison unavailable"
        description="The comparison payload could not be loaded."
      />
    );
  }

  return (
    <EvaluationComparisonWorkspaceView
      activeTab={activeTab}
      comparison={comparison}
      onTabChange={(nextTab) => {
        void setActiveTab(nextTab);
      }}
    />
  );
}

export function EvaluationComparisonWorkspaceView({
  activeTab = 'summary',
  comparison,
  onTabChange,
}: {
  activeTab?: EvaluationComparisonTab;
  comparison: EvaluationComparisonResponse;
  onTabChange?: (nextTab: EvaluationComparisonTab) => void;
}) {
  const presentation = comparison.presentation;
  const tabs = presentation?.tabs.map((tab) => ({
    badge:
      tab.key === 'metrics'
        ? comparison.metric_deltas.length
        : tab.key === 'actions'
          ? comparison.recommendation_deltas.length
          : tab.key === 'suppliers'
            ? comparison.supplier_shortlist_delta.length
            : undefined,
    label: tab.label,
    value: tab.key,
  })) ?? [
    { value: 'summary', label: 'Summary' },
    {
      value: 'metrics',
      label: 'Metrics',
      badge: comparison.metric_deltas.length,
    },
    {
      value: 'actions',
      label: 'Actions',
      badge: comparison.recommendation_deltas.length,
    },
    {
      value: 'suppliers',
      label: 'Suppliers',
      badge: comparison.supplier_shortlist_delta.length,
    },
  ];
  const summaryItems = [
    {
      detail: comparison.current_evaluation.summary,
      key: 'current-run',
      label: 'Current run',
      tone: 'accent' as const,
      value: formatToken(comparison.current_evaluation.confidence_level),
    },
    {
      detail: comparison.baseline_evaluation.summary,
      key: 'baseline-run',
      label: 'Baseline run',
      value: formatToken(comparison.baseline_evaluation.confidence_level),
    },
    {
      detail: comparison.conclusion.model_status_change,
      key: 'metric-deltas',
      label: 'Metric deltas',
      tone: 'success' as const,
      value: comparison.metric_deltas.length,
    },
    {
      detail: comparison.conclusion.confidence_change,
      key: 'priority-shifts',
      label: 'Priority shifts',
      tone: 'warning' as const,
      value: comparison.recommendation_deltas.length,
    },
  ];

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Comparison"
        title={
          presentation?.page_title ??
          `${comparison.current_evaluation.case_id} run comparison`
        }
        description={
          presentation?.short_summary ?? comparison.conclusion.summary
        }
        chips={
          presentation?.badges.map((badge) => badge.label) ?? [
            comparison.conclusion.confidence_change,
            comparison.conclusion.defaults_change,
            comparison.conclusion.missing_data_change,
          ]
        }
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/evaluations/${comparison.current_evaluation.evaluation_id}`}
              >
                {presentation?.primary_actions?.[0]?.label ?? 'Current result'}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/evaluations/${comparison.baseline_evaluation.evaluation_id}`}
              >
                {presentation?.primary_actions?.[1]?.label ?? 'Baseline result'}
              </Link>
            </Button>
          </>
        }
      />

      <SummaryRail items={summaryItems} label="Comparison summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={tabs}
        label="Comparison tabs"
        onTabChange={(value) => {
          if (
            value === 'summary' ||
            value === 'metrics' ||
            value === 'actions' ||
            value === 'suppliers'
          ) {
            onTabChange?.(value);
          }
        }}
        summary={
          presentation?.copy?.detail ??
          'Metric, action, and supplier shifts stay isolated so the run delta remains readable.'
        }
        title={presentation?.copy?.headline ?? 'Comparison layers'}
      >
        <TabsContent value="summary">
          <div className="workspace-card-list">
            <WorkspaceSection
              eyebrow="Run posture"
              title="Current versus baseline"
              description={comparison.conclusion.summary}
            >
              <div className="workspace-detail-grid">
                <WorkspaceDataCard>
                  <span className="badge subtle">Current run</span>
                  <h3>{comparison.current_evaluation.summary}</h3>
                  <p>
                    {formatToken(
                      comparison.current_evaluation.confidence_level,
                    )}{' '}
                    confidence
                  </p>
                </WorkspaceDataCard>
                <WorkspaceDataCard>
                  <span className="badge subtle">Baseline run</span>
                  <h3>{comparison.baseline_evaluation.summary}</h3>
                  <p>
                    {formatToken(
                      comparison.baseline_evaluation.confidence_level,
                    )}{' '}
                    confidence
                  </p>
                </WorkspaceDataCard>
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              eyebrow="Delta synopsis"
              title="Confidence, defaults, and missing-data shifts"
              description="Top-level movement stays explicit before drilling into metrics or supplier changes."
            >
              <div className="workspace-detail-grid">
                <WorkspaceDataCard>
                  <h3>Confidence shift</h3>
                  <p>{comparison.conclusion.confidence_change}</p>
                </WorkspaceDataCard>
                <WorkspaceDataCard>
                  <h3>Defaults shift</h3>
                  <p>{comparison.conclusion.defaults_change}</p>
                </WorkspaceDataCard>
                <WorkspaceDataCard>
                  <h3>Missing-data shift</h3>
                  <p>{comparison.conclusion.missing_data_change}</p>
                </WorkspaceDataCard>
              </div>
            </WorkspaceSection>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <WorkspaceSection
            eyebrow="Metric deltas"
            title="Key metric changes"
            description={comparison.conclusion.model_status_change}
          >
            <div className="workspace-card-list">
              {comparison.metric_deltas.map((delta) => (
                <WorkspaceDataCard key={delta.key}>
                  <div className="workspace-data-card__header">
                    <div>
                      <h3>{delta.label}</h3>
                      <p>
                        {delta.baseline_value} {'->'} {delta.current_value}
                      </p>
                    </div>
                    <span
                      className={`meta-chip meta-chip--${delta.direction === 'declined' ? 'warning' : delta.direction === 'improved' ? 'success' : 'accent'}`}
                    >
                      {delta.delta_label}
                    </span>
                  </div>
                </WorkspaceDataCard>
              ))}
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="actions">
          <WorkspaceSection
            eyebrow="Recommendations"
            title="Priority ordering changes"
            description="Recommendation order shifts remain explicit and auditable."
          >
            <div className="workspace-card-list">
              {comparison.recommendation_deltas.map((delta) => (
                <WorkspaceDataCard key={delta.recommendation_id}>
                  <h3>{formatToken(delta.recommendation_id)}</h3>
                  <p>{delta.delta_label}</p>
                  <p className="muted">{delta.summary}</p>
                </WorkspaceDataCard>
              ))}
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="suppliers">
          <WorkspaceSection
            eyebrow="Supplier shortlist"
            title="Supplier / material delta"
            description="Shortlist movements remain visible by category."
          >
            <div className="workspace-card-list">
              {comparison.supplier_shortlist_delta.map((delta) => (
                <WorkspaceDataCard key={delta.category}>
                  <h3>{delta.category}</h3>
                  <p>
                    {delta.baseline_candidate ?? 'No baseline candidate'} {'->'}{' '}
                    {delta.current_candidate ?? 'No current candidate'}
                  </p>
                  <p className="muted">{delta.detail}</p>
                </WorkspaceDataCard>
              ))}
            </div>
          </WorkspaceSection>
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
