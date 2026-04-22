import { DashboardWorkspace } from '@/components/dashboard-workspace';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function DashboardPage() {
  await requireAuthenticatedSession('/dashboard');

  return (
    <main>
      <DashboardWorkspace />
    </main>
  );
}
