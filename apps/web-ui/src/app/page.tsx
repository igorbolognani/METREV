import { DashboardWorkspace } from '@/components/dashboard-workspace';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function HomePage() {
  await requireAuthenticatedSession('/');

  return (
    <main>
      <DashboardWorkspace />
    </main>
  );
}
