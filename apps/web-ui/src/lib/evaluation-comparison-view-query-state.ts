'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const evaluationComparisonTabValues = [
  'summary',
  'metrics',
  'actions',
  'suppliers',
] as const;

export type EvaluationComparisonTab =
  (typeof evaluationComparisonTabValues)[number];

export function useEvaluationComparisonTab() {
  return useWorkspaceTabState({
    allowed: evaluationComparisonTabValues,
    defaultTab: 'summary',
  });
}
