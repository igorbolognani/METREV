'use client';

import type { EvaluationSummary } from '@metrev/domain-contracts';
import * as React from 'react';

import { Select } from '@/components/ui/select';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

export interface EvaluationCompareCandidateSelectProps {
  candidates: EvaluationSummary[];
  evaluationId: string;
}

export function EvaluationCompareCandidateSelect({
  candidates,
  evaluationId,
}: EvaluationCompareCandidateSelectProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <Select
      className="evaluation-compare-select"
      label="Compare against"
      onValueChange={(value) => {
        if (!value) {
          return;
        }

        if (typeof window !== 'undefined') {
          window.location.assign(
            `/evaluations/${evaluationId}/compare/${value}`,
          );
        }
      }}
      options={candidates.map((candidate) => ({
        description: `${formatToken(candidate.technology_family)} · ${formatTimestamp(candidate.created_at)}`,
        label: `#${candidate.evaluation_id.slice(0, 8)} · ${candidate.case_id}`,
        value: candidate.evaluation_id,
      }))}
      placeholder="Select a baseline"
    />
  );
}
