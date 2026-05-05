import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { ExternalEvidenceExplorer } from '@/components/evidence-explorer/external-evidence-explorer';
import { requireRoleSession } from '@/lib/require-session';

void React;

export default async function AdminEvidenceExplorerPage() {
  const { session, authorized } = await requireRoleSession(
    '/admin/intelligence/evidence/explorer',
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <ExternalEvidenceExplorer />
    </main>
  );
}
