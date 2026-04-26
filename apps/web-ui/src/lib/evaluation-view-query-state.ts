'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const evaluationTabValues = [
  'summary',
  'actions',
  'model',
  'evidence',
  'audit',
] as const;

export type EvaluationTab = (typeof evaluationTabValues)[number];

const evaluationTabAliases: Record<string, EvaluationTab> = {
  actions: 'actions',
  audit: 'audit',
  evidence: 'evidence',
  model: 'model',
  modeling: 'model',
  overview: 'summary',
  recommendations: 'actions',
  roadmap: 'actions',
  summary: 'summary',
};

export function useEvaluationTab() {
  return useWorkspaceTabState({
    aliases: evaluationTabAliases,
    allowed: evaluationTabValues,
    defaultTab: 'summary',
  });
}
