import { redirect } from 'next/navigation';
import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
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

  redirect('/admin/intelligence/research/reviews');
}
