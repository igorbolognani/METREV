import { EvaluationResultView } from '@/components/evaluation-result-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function EvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    compare?: string;
  }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  await requireAuthenticatedSession(`/evaluations/${id}`);

  const initialTab =
    resolvedSearchParams.tab === 'evidence' ||
    resolvedSearchParams.tab === 'modeling' ||
    resolvedSearchParams.tab === 'audit'
      ? resolvedSearchParams.tab
      : 'summary';

  return (
    <main>
      <EvaluationResultView
        evaluationId={id}
        initialComparisonEvaluationId={resolvedSearchParams.compare ?? null}
        initialTab={initialTab}
      />
    </main>
  );
}
