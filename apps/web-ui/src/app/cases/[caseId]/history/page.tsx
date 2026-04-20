import { CaseHistoryView } from '@/components/case-history-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function CaseHistoryPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  await requireAuthenticatedSession(`/cases/${caseId}/history`);

  return (
    <main>
      <CaseHistoryView caseId={caseId} />
    </main>
  );
}
