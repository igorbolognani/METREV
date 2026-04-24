import { PrintableReportView } from '@/components/evaluation/printable-report-view';
import { requireAuthenticatedSession } from '@/lib/require-session';

export default async function EvaluationReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthenticatedSession(`/evaluations/${id}/report`);

  return (
    <main>
      <PrintableReportView evaluationId={id} />
    </main>
  );
}
