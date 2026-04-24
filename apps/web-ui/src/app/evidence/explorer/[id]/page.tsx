import { ExternalEvidenceDetail } from '@/components/evidence-detail/external-evidence-detail';
import { requireRoleSession } from '@/lib/require-session';

export default async function ExternalEvidenceExplorerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authorized } = await requireRoleSession(
    `/evidence/explorer/${id}`,
    'ANALYST',
  );

  return (
    <main>
      <ExternalEvidenceDetail catalogItemId={id} canReview={authorized} />
    </main>
  );
}
