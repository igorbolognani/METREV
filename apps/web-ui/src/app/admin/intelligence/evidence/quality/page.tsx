import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { EvidenceQualityWorkspace } from '@/components/evidence-quality/evidence-quality-workspace';
import { requireRoleSession } from '@/lib/require-session';

void React;

export default async function AdminEvidenceQualityPage() {
  const { session, authorized } = await requireRoleSession(
    '/admin/intelligence/evidence/quality',
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <EvidenceQualityWorkspace />
    </main>
  );
}
