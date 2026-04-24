import { EvaluationComparisonView } from '@/components/evaluation/evaluation-comparison-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function EvaluationComparisonPage({
  params,
}: {
  params: Promise<{ id: string; baselineId: string }>;
}) {
  const { id, baselineId } = await params;
  await requireAuthenticatedSession(`/evaluations/${id}/compare/${baselineId}`);

  return (
    <main>
      <EvaluationComparisonView
        evaluationId={id}
        baselineEvaluationId={baselineId}
      />
    </main>
  );
}
