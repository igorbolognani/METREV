import { redirect } from 'next/navigation';

import {
    buildLegacyRouteRedirectTarget,
    type LegacyRouteSearchParams,
} from '@/lib/legacy-route-redirect';

type EvidenceWorkspacePageProps = {
  searchParams: Promise<LegacyRouteSearchParams>;
};

export default async function EvidenceWorkspacePage({
  searchParams,
}: EvidenceWorkspacePageProps) {
  redirect(
    await buildLegacyRouteRedirectTarget(
      '/admin/intelligence/evidence/explorer',
      searchParams,
    ),
  );
}
