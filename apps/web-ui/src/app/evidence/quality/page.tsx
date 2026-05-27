import { redirect } from 'next/navigation';

import {
    buildLegacyRouteRedirectTarget,
    type LegacyRouteSearchParams,
} from '@/lib/legacy-route-redirect';

type EvidenceQualityPageProps = {
  searchParams: Promise<LegacyRouteSearchParams>;
};

export default async function EvidenceQualityPage({
  searchParams,
}: EvidenceQualityPageProps) {
  redirect(
    await buildLegacyRouteRedirectTarget(
      '/admin/intelligence/evidence/quality',
      searchParams,
    ),
  );
}
