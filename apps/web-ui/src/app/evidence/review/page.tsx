import { redirect } from 'next/navigation';

import {
    buildLegacyRouteRedirectTarget,
    type LegacyRouteSearchParams,
} from '@/lib/legacy-route-redirect';

type EvidenceReviewPageProps = {
  searchParams: Promise<LegacyRouteSearchParams>;
};

export default async function EvidenceReviewPage({
  searchParams,
}: EvidenceReviewPageProps) {
  redirect(
    await buildLegacyRouteRedirectTarget(
      '/admin/intelligence/evidence/review',
      searchParams,
    ),
  );
}
