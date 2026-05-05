import { redirect } from 'next/navigation';
import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { requireRoleSession } from '@/lib/require-session';

void React;

export default async function ExternalEvidenceReviewPage() {
  const { session, authorized } = await requireRoleSession(
    '/evidence/review',
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  redirect('/admin/intelligence/evidence/review');
}
