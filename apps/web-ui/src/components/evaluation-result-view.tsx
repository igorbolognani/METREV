'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCaseHistory, fetchEvaluation } from '@/lib/api';

import { EvaluationCockpit } from '@/components/evaluation-cockpit';

export function EvaluationResultView({
  evaluationId,
}: {
  evaluationId: string;
}) {
  const query = useQuery({
    queryKey: ['evaluation', evaluationId],
    queryFn: () => fetchEvaluation(evaluationId),
  });

  const caseId = query.data?.case_id;
  const historyQuery = useQuery({
    queryKey: ['case-history', caseId],
    queryFn: () => fetchCaseHistory(caseId as string),
    enabled: Boolean(caseId),
  });

  if (query.isLoading) {
    return <p className="muted">Loading evaluation...</p>;
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  const evaluation = query.data;
  if (!evaluation) {
    return <p className="error">Evaluation not found.</p>;
  }

  return (
    <EvaluationCockpit
      evaluation={evaluation}
      evaluationId={evaluationId}
      history={historyQuery.data}
      historyError={historyQuery.error?.message}
      historyLoading={historyQuery.isLoading}
    />
  );
}
