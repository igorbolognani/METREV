import { ResearchReviewListWorkspace } from '@/components/research/research-review-list';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function ResearchReviewsPage() {
  await requireAuthenticatedSession('/research/reviews');

  return (
    <main>
      <ResearchReviewListWorkspace />
    </main>
  );
}
