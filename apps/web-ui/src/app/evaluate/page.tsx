import { CaseForm } from '@/components/case-form';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function EvaluatePage() {
  const session = await requireAuthenticatedSession('/evaluate');

  return (
    <main>
      <CaseForm actorRole={session.user.role ?? 'VIEWER'} />
    </main>
  );
}
