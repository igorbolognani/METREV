import React from 'react';

import { IntakeSubmittingScreen } from '@/components/intake-submitting-screen';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function CaseSubmittingPage() {
  await requireAuthenticatedSession('/cases/new/submitting');

  return (
    <main>
      <IntakeSubmittingScreen />
    </main>
  );
}
