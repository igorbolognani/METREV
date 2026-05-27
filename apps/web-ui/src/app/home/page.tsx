import { DashboardWorkspace } from '@/components/dashboard/dashboard-workspace';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function HomeWorkspacePage() {
  await requireAuthenticatedSession('/home');

  return (
    <main>
      <DashboardWorkspace />
    </main>
  );
}
