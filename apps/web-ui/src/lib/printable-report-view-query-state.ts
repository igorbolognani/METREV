'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const printableReportTabValues = ['report', 'audit'] as const;

export type PrintableReportTab = (typeof printableReportTabValues)[number];

export function usePrintableReportTab() {
  return useWorkspaceTabState({
    allowed: printableReportTabValues,
    defaultTab: 'report',
  });
}
