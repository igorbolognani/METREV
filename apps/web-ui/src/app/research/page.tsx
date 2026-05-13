import { AnalystRoleRequiredPanel } from '@/components/analyst-role-required-panel';
import { ResearchReviewListWorkspace } from '@/components/research/research-review-list';
import { requireRoleSession } from '@/lib/require-session';

export default async function ResearchWorkspacePage() {
  const { session, authorized } = await requireRoleSession(
    '/research',
    'ANALYST',
  );

  if (!authorized) {
    return <AnalystRoleRequiredPanel email={session.user.email} />;
  }

  return (
    <main>
      <ResearchReviewListWorkspace />
    </main>
  );
}
