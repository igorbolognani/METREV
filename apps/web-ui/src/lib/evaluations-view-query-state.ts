'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const evaluationsViewTabValues = ['catalog', 'audit'] as const;

export type EvaluationsViewTab = (typeof evaluationsViewTabValues)[number];

export function useEvaluationsViewTab() {
  return useWorkspaceTabState({
    allowed: evaluationsViewTabValues,
    defaultTab: 'catalog',
  });
}
