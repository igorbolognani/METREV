'use client';

import { useWorkspaceTabState } from '@/lib/workspace-tab-query-state';

export const externalEvidenceDetailTabValues = [
  'overview',
  'claims',
  'provenance',
  'payloads',
] as const;

export type ExternalEvidenceDetailTab =
  (typeof externalEvidenceDetailTabValues)[number];

export function useExternalEvidenceDetailTab() {
  return useWorkspaceTabState({
    allowed: externalEvidenceDetailTabValues,
    defaultTab: 'overview',
  });
}
