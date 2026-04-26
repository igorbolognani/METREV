'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const evidenceExplorerTabValues = [
  'catalog',
  'facets',
  'assistant',
  'exports',
] as const;

export type EvidenceExplorerTab = (typeof evidenceExplorerTabValues)[number];

export function useEvidenceExplorerTab() {
  return useWorkspaceTabState({
    allowed: evidenceExplorerTabValues,
    defaultTab: 'catalog',
  });
}
