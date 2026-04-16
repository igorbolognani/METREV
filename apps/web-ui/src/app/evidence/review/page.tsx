import { ExternalEvidenceReviewBoard } from '@/components/external-evidence-review-board';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function ExternalEvidenceReviewPage() {
  await requireAuthenticatedSession('/evidence/review');

  return (
    <main>
      <ExternalEvidenceReviewBoard />
    </main>
  );
}
