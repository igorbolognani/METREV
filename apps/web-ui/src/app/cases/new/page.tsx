import React from 'react';

import { CaseForm } from '@/components/case-form';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function NewCasePage() {
  const session = await requireAuthenticatedSession('/cases/new');

  return (
    <main>
      <CaseForm actorRole={session.user.role ?? 'VIEWER'} />
    </main>
  );
}
