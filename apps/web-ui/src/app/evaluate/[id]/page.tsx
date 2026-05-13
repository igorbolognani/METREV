import { EvaluationResultView } from '@/components/evaluation/evaluation-result-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function EvaluateResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthenticatedSession(`/evaluate/${id}`);

  return (
    <main>
      <EvaluationResultView evaluationId={id} />
    </main>
  );
}
