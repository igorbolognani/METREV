import { EvaluationsListView } from '@/components/evaluations/evaluations-list-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function EvaluationsPage() {
  await requireAuthenticatedSession('/evaluations');

  return (
    <main>
      <EvaluationsListView />
    </main>
  );
}
