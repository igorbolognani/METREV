'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type { EvaluationComparisonResponse } from '@metrev/domain-contracts';

import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { fetchEvaluationComparison } from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

export function EvaluationComparisonView({
  evaluationId,
  baselineEvaluationId,
}: {
  evaluationId: string;
  baselineEvaluationId: string;
}) {
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

  return <EvaluationComparisonWorkspaceView comparison={comparison} />;
}

export function EvaluationComparisonWorkspaceView({
  comparison,
}: {
  comparison: EvaluationComparisonResponse;
}) {
  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Comparison"
        title={`${comparison.current_evaluation.case_id} run comparison`}
        description={comparison.conclusion.summary}
        chips={[
          comparison.conclusion.confidence_change,
          comparison.conclusion.defaults_change,
          comparison.conclusion.missing_data_change,
        ]}
        actions={
          <>
            <Link
              className="button secondary"
              href={`/evaluations/${comparison.current_evaluation.evaluation_id}`}
            >
              Current result
            </Link>
            <Link
              className="button secondary"
              href={`/evaluations/${comparison.baseline_evaluation.evaluation_id}`}
            >
              Baseline result
            </Link>
          </>
        }
      />

      <div className="workspace-detail-grid">
        <WorkspaceDataCard>
          <span className="badge subtle">Current run</span>
          <h3>{comparison.current_evaluation.summary}</h3>
          <p>
            {formatToken(comparison.current_evaluation.confidence_level)}{' '}
            confidence
          </p>
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <span className="badge subtle">Baseline run</span>
          <h3>{comparison.baseline_evaluation.summary}</h3>
          <p>
            {formatToken(comparison.baseline_evaluation.confidence_level)}{' '}
            confidence
          </p>
        </WorkspaceDataCard>
      </div>

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

      <div className="workspace-split-grid">
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
      </div>
    </div>
  );
}
