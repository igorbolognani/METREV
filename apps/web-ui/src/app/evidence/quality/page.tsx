import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { EvidenceQualityWorkspace } from '@/components/evidence-quality/evidence-quality-workspace';
import { requireRoleSession } from '@/lib/require-session';

export default async function EvidenceQualityPage() {
  const { session, authorized } = await requireRoleSession(
    '/evidence/quality',
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <EvidenceQualityWorkspace />
    </main>
  );
}
