import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { ResearchReviewListWorkspace } from '@/components/research/research-review-list';
import { requireRoleSession } from '@/lib/require-session';

void React;

export default async function ResearchReviewsPage() {
  const { session, authorized } = await requireRoleSession(
    '/research/reviews',
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <ResearchReviewListWorkspace />
    </main>
  );
}
