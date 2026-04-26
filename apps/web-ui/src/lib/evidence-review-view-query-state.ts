'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const evidenceReviewTabValues = ['queue', 'selected', 'audit'] as const;

export type EvidenceReviewTab = (typeof evidenceReviewTabValues)[number];

export function useEvidenceReviewTab() {
  return useWorkspaceTabState({
    allowed: evidenceReviewTabValues,
    defaultTab: 'queue',
  });
}
