'use client';

import type { EvaluationResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { EvaluationRecommendationsTable } from '@/components/evaluation/evaluation-recommendations-table';

void React;

export function EvaluationRecommendationsTab({
  evaluation,
}: {
  evaluation: EvaluationResponse;
}) {
  return (
    <EvaluationRecommendationsTable
      evaluationId={evaluation.evaluation_id}
      recommendations={
        evaluation.decision_output.prioritized_improvement_options
      }
    />
  );
}
