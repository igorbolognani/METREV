'use client';

import type { EvaluationResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { EvaluationRecommendationsTable } from '@/components/evaluation/evaluation-recommendations-table';
import { EvaluationRoadmapSuppliersTab } from '@/components/evaluation/evaluation-roadmap-suppliers-tab';

export function EvaluationActionsTab({
  evaluation,
}: {
  evaluation: EvaluationResponse;
}) {
  return (
    <div className="workspace-form-layout">
      <EvaluationRecommendationsTable
        evaluationId={evaluation.evaluation_id}
        recommendations={
          evaluation.decision_output.prioritized_improvement_options
        }
      />
      <EvaluationRoadmapSuppliersTab evaluation={evaluation} />
    </div>
  );
}

void React;
