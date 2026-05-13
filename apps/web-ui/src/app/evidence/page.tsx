import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { ExternalEvidenceExplorer } from '@/components/evidence-explorer/external-evidence-explorer';
import { requireRoleSession } from '@/lib/require-session';

export default async function EvidenceWorkspacePage() {
  const { session, authorized } = await requireRoleSession(
    '/evidence',
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
