'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const dashboardTabValues = [
  'overview',
  'runs',
  'evidence',
  'research',
] as const;

export type DashboardTab = (typeof dashboardTabValues)[number];

export function useDashboardTab() {
  return useWorkspaceTabState({
    allowed: dashboardTabValues,
    defaultTab: 'overview',
  });
}
