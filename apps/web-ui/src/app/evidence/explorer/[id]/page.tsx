import { redirect } from 'next/navigation';
import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { requireRoleSession } from '@/lib/require-session';

void React;

export default async function ExternalEvidenceExplorerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, authorized } = await requireRoleSession(
    `/evidence/explorer/${id}`,
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  redirect(`/admin/intelligence/evidence/explorer/${id}`);
}
