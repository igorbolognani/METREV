import { ResearchReviewDetailWorkspace } from '@/components/research/research-review-detail';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function ResearchReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthenticatedSession(`/research/reviews/${id}`);

  return (
    <main>
      <ResearchReviewDetailWorkspace reviewId={id} />
    </main>
  );
}
