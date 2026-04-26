import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { ResearchReviewDetailWorkspace } from '@/components/research/research-review-detail';
import { requireRoleSession } from '@/lib/require-session';

void React;

export default async function ResearchReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, authorized } = await requireRoleSession(
    `/research/reviews/${id}`,
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <ResearchReviewDetailWorkspace reviewId={id} />
    </main>
  );
}
