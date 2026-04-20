import type {
  CaseHistoryResponse,
  CaseHistoryWorkspaceResponse,
  DashboardWorkspaceResponse,
  EvaluationComparisonResponse,
  EvaluationListResponse,
  EvaluationResponse,
  EvaluationWorkspaceResponse,
  EvidenceReviewWorkspaceResponse,
  ExportCsvResponseMetadata,
  ExternalEvidenceCatalogItemDetail,
  ExternalEvidenceCatalogListResponse,
  ExternalEvidenceReviewRequest,
  ExternalEvidenceReviewStatus,
  PrintableEvaluationReportResponse,
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
  options?: {
    idempotencyKey?: string;
  },
): Promise<EvaluationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/cases/evaluate`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(options?.idempotencyKey
        ? {
            'idempotency-key': options.idempotencyKey,
          }
        : {}),
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

export async function fetchDashboardWorkspace(): Promise<DashboardWorkspaceResponse> {
  const response = await fetch(`${apiBaseUrl}/api/workspace/dashboard`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson<DashboardWorkspaceResponse>(response);
}

export async function fetchEvaluationWorkspace(
  id: string,
): Promise<EvaluationWorkspaceResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evaluations/${id}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson<EvaluationWorkspaceResponse>(response);
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

export async function fetchCaseHistoryWorkspace(
  caseId: string,
): Promise<CaseHistoryWorkspaceResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/cases/${caseId}/history`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson<CaseHistoryWorkspaceResponse>(response);
}

export async function fetchEvaluationComparison(
  evaluationId: string,
  baselineEvaluationId: string,
): Promise<EvaluationComparisonResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evaluations/${evaluationId}/compare/${baselineEvaluationId}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson<EvaluationComparisonResponse>(response);
}

export async function fetchExternalEvidenceCatalog(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
}): Promise<ExternalEvidenceCatalogListResponse> {
  const searchParams = new URLSearchParams();

  if (input?.status) {
    searchParams.set('status', input.status);
  }

  if (input?.query?.trim()) {
    searchParams.set('q', input.query.trim());
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/external-evidence${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson<ExternalEvidenceCatalogListResponse>(response);
}

export async function fetchEvidenceReviewWorkspace(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
}): Promise<EvidenceReviewWorkspaceResponse> {
  const searchParams = new URLSearchParams();

  if (input?.status) {
    searchParams.set('status', input.status);
  }

  if (input?.query?.trim()) {
    searchParams.set('q', input.query.trim());
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evidence/review${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson<EvidenceReviewWorkspaceResponse>(response);
}

export async function fetchExternalEvidenceCatalogItem(
  id: string,
): Promise<ExternalEvidenceCatalogItemDetail> {
  const response = await fetch(`${apiBaseUrl}/api/external-evidence/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson<ExternalEvidenceCatalogItemDetail>(response);
}

export async function reviewExternalEvidenceCatalogItem(
  id: string,
  payload: ExternalEvidenceReviewRequest,
): Promise<ExternalEvidenceCatalogItemDetail> {
  const response = await fetch(
    `${apiBaseUrl}/api/external-evidence/${id}/review`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  return parseJson<ExternalEvidenceCatalogItemDetail>(response);
}

export async function fetchPrintableEvaluationReport(
  evaluationId: string,
): Promise<PrintableEvaluationReportResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evaluations/${evaluationId}/report`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson<PrintableEvaluationReportResponse>(response);
}

export async function fetchEvaluationJsonExport(
  evaluationId: string,
): Promise<EvaluationWorkspaceResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/exports/evaluations/${evaluationId}/json`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson<EvaluationWorkspaceResponse>(response);
}

export async function fetchEvaluationCsvExport(evaluationId: string): Promise<{
  content: string;
  metadata: Pick<
    ExportCsvResponseMetadata,
    'content_type' | 'generated_at' | 'file_name'
  > & {
    workspace_schema_version: string | null;
  };
}> {
  const response = await fetch(
    `${apiBaseUrl}/api/exports/evaluations/${evaluationId}/csv`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      payload?.message ?? `Request failed with status ${response.status}`,
    );
  }

  return {
    content: await response.text(),
    metadata: {
      content_type: 'text/csv',
      generated_at:
        response.headers.get('x-metrev-export-generated-at') ??
        new Date().toISOString(),
      file_name:
        response.headers
          .get('content-disposition')
          ?.match(/filename="([^"]+)"/)?.[1] ?? `${evaluationId}.csv`,
      workspace_schema_version: response.headers.get(
        'x-metrev-workspace-schema-version',
      ),
    },
  };
}
