import { redirect } from 'next/navigation';

import {
  buildLegacyRouteRedirectTarget,
  type LegacyRouteSearchParams,
} from '@/lib/legacy-route-redirect';

type ResearchWorkspacePageProps = {
  searchParams?: Promise<LegacyRouteSearchParams>;
};

export default async function ResearchWorkspacePage({
  searchParams,
}: ResearchWorkspacePageProps = {}) {
  redirect(
    await buildLegacyRouteRedirectTarget(
      '/admin/intelligence/research/reviews',
      searchParams,
    ),
  );
}
