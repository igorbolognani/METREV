import * as React from 'react';

import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { ExternalEvidenceReviewBoard } from '@/components/evidence-review/external-evidence-review-board';
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

  return (
    <main>
      <ExternalEvidenceReviewBoard />
    </main>
  );
}
