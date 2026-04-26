import { ReportsListView } from '@/components/reports/reports-list-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function ReportsPage() {
  await requireAuthenticatedSession('/reports');

  return (
    <main>
      <ReportsListView />
    </main>
  );
}

