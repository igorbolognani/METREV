import { EvaluationResultView } from '@/components/evaluation-result-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthenticatedSession(`/evaluations/${id}`);

  return (
    <main>
      <EvaluationResultView evaluationId={id} />
    </main>
  );
}
