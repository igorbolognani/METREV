import { ExternalEvidenceDetail } from '@/components/external-evidence-detail';
import { requireRoleSession } from '@/lib/require-session';

export default async function ExternalEvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authorized } = await requireRoleSession(
    `/evidence/review/${id}`,
    'ANALYST',
  );

  return (
    <main>
      <ExternalEvidenceDetail catalogItemId={id} canReview={authorized} />
    </main>
  );
}
