'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const evaluationTabValues = [
  'diagnosis',
  'recommendations',
  'modeling',
  'roadmap',
  'report',
  'audit',
] as const;

export type EvaluationTab = (typeof evaluationTabValues)[number];

const evaluationTabAliases: Record<string, EvaluationTab> = {
  actions: 'recommendations',
  audit: 'audit',
  diagnosis: 'diagnosis',
  evidence: 'audit',
  model: 'modeling',
  modeling: 'modeling',
  overview: 'diagnosis',
  recommendations: 'recommendations',
  report: 'report',
  roadmap: 'roadmap',
  summary: 'diagnosis',
};

export function useEvaluationTab() {
  return useWorkspaceTabState({
    aliases: evaluationTabAliases,
    allowed: evaluationTabValues,
    defaultTab: 'diagnosis',
  });
}
