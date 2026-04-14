import type {
  CaseHistoryResponse,
  EvaluationListResponse,
  EvaluationResponse,
  RawCaseInput,
} from '@metrev/domain-contracts';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      payload?.message ?? `Request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

export async function evaluateCase(
  payload: RawCaseInput,
): Promise<EvaluationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/cases/evaluate`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJson<EvaluationResponse>(response);
}

export async function fetchEvaluation(id: string): Promise<EvaluationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/evaluations/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson<EvaluationResponse>(response);
}

export async function fetchEvaluationList(): Promise<EvaluationListResponse> {
  const response = await fetch(`${apiBaseUrl}/api/evaluations`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson<EvaluationListResponse>(response);
}

export async function fetchCaseHistory(
  caseId: string,
): Promise<CaseHistoryResponse> {
  const response = await fetch(`${apiBaseUrl}/api/cases/${caseId}/history`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson<CaseHistoryResponse>(response);
}
