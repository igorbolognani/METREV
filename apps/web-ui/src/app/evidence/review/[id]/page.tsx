import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { ExternalEvidenceDetail } from '@/components/evidence-detail/external-evidence-detail';
import { requireRoleSession } from '@/lib/require-session';

void React;

export default async function ExternalEvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, authorized } = await requireRoleSession(
    `/evidence/review/${id}`,
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <ExternalEvidenceDetail catalogItemId={id} canReview />
    </main>
  );
}
