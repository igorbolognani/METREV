'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const caseHistoryTabValues = ['timeline', 'evidence', 'audit'] as const;

export type CaseHistoryTab = (typeof caseHistoryTabValues)[number];

export function useCaseHistoryTab() {
  return useWorkspaceTabState({
    allowed: caseHistoryTabValues,
    defaultTab: 'timeline',
  });
}
