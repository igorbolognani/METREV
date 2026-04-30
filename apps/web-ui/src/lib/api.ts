import type {
    AddResearchColumnRequest,
    CaseHistoryWorkspaceResponse,
    CreateResearchEvidencePackRequest,
    CreateResearchReviewRequest,
    DashboardWorkspaceResponse,
    EvaluationComparisonResponse,
    EvaluationListResponse,
    EvaluationResponse,
    EvaluationWorkspaceResponse,
    EvidenceExplorerAssistantResponse,
    EvidenceExplorerWorkspaceResponse,
    EvidenceReviewWorkspaceResponse,
    ExportCsvResponseMetadata,
    ExternalEvidenceBulkReviewRequest,
    ExternalEvidenceBulkReviewResponse,
    ExternalEvidenceCatalogItemDetail,
    ExternalEvidenceCatalogListResponse,
    ExternalEvidenceReviewRequest,
    ExternalEvidenceReviewStatus,
    LocalSourceImportRequest,
    LocalSourceImportResponse,
    PrintableEvaluationReportResponse,
    QueueResearchBackfillRequest,
    RawCaseInput,
    ReportConversationRequest,
    ReportConversationResponse,
    ResearchBackfillListResponse,
    ResearchDecisionIngestionPreview,
    ResearchEvidencePack,
    ResearchReviewDetail,
    ResearchReviewListResponse,
    RunResearchExtractionsRequest,
    RunResearchExtractionsResponse,
    SearchResearchPapersRequest,
    SearchResearchPapersResponse,
    SourceArtifact,
    StageResearchPapersRequest,
    StageResearchPapersResponse,
} from '@metrev/domain-contracts/browser';
import {
    addResearchColumnRequestSchema,
    caseHistoryWorkspaceResponseSchema,
    createResearchEvidencePackRequestSchema,
    createResearchReviewRequestSchema,
    dashboardWorkspaceResponseSchema,
    evaluationComparisonResponseSchema,
    evaluationListResponseSchema,
    evaluationResponseSchema,
    evaluationWorkspaceResponseSchema,
    evidenceExplorerAssistantResponseSchema,
    evidenceExplorerWorkspaceResponseSchema,
    evidenceReviewWorkspaceResponseSchema,
    externalEvidenceBulkReviewRequestSchema,
    externalEvidenceBulkReviewResponseSchema,
    externalEvidenceCatalogDetailSchema,
    externalEvidenceCatalogListResponseSchema,
    externalEvidenceReviewRequestSchema,
    localSourceImportRequestSchema,
    localSourceImportResponseSchema,
    printableEvaluationReportResponseSchema,
    queueResearchBackfillRequestSchema,
    rawCaseInputSchema,
    reportConversationRequestSchema,
    reportConversationResponseSchema,
    researchBackfillListResponseSchema,
    researchDecisionIngestionPreviewSchema,
    researchEvidencePackSchema,
    researchReviewDetailSchema,
    researchReviewListResponseSchema,
    runResearchExtractionsRequestSchema,
    runResearchExtractionsResponseSchema,
    searchResearchPapersRequestSchema,
    searchResearchPapersResponseSchema,
    sourceArtifactSchema,
    stageResearchPapersRequestSchema,
    stageResearchPapersResponseSchema,
} from '@metrev/domain-contracts/browser';

export type ExternalEvidenceSourceTypeFilter =
  | 'openalex'
  | 'crossref'
  | 'europe_pmc'
  | 'supplier_profile'
  | 'market_snapshot'
  | 'curated_manifest'
  | 'manual';

export type EvaluationListConfidenceFilter = 'high' | 'medium' | 'low';
export type EvaluationListSortKey =
  | 'created_at'
  | 'confidence_level'
  | 'case_id';
export type EvaluationListSortDirection = 'asc' | 'desc';

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type ContractParser<T> = {
  parse(input: unknown): T;
};

function buildExternalEvidenceSearchParams(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
  sourceType?: ExternalEvidenceSourceTypeFilter;
  page?: number;
  pageSize?: number;
}) {
  const searchParams = new URLSearchParams();

  if (input?.status) {
    searchParams.set('status', input.status);
  }

  if (input?.query?.trim()) {
    searchParams.set('q', input.query.trim());
  }

  if (input?.sourceType) {
    searchParams.set('sourceType', input.sourceType);
  }

  if (input?.page) {
    searchParams.set('page', String(input.page));
  }

  if (input?.pageSize) {
    searchParams.set('pageSize', String(input.pageSize));
  }

  return searchParams;
}

async function readErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  return payload?.message ?? `Request failed with status ${response.status}`;
}

function toJsonBody<T>(parser: ContractParser<T>, payload: unknown): string {
  return JSON.stringify(parser.parse(payload));
}

async function parseJson<T>(
  response: Response,
  parser: ContractParser<T>,
  responseLabel: string,
): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = await response.json().catch(() => {
    throw new Error(
      `Invalid ${responseLabel}: response body is not valid JSON.`,
    );
  });

  try {
    return parser.parse(payload);
  } catch (error) {
    throw new Error(`Invalid ${responseLabel}.`, { cause: error });
  }
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
    body: toJsonBody(rawCaseInputSchema, payload),
  });

  return parseJson(
    response,
    evaluationResponseSchema,
    'case evaluation response',
  );
}

export async function fetchEvaluation(id: string): Promise<EvaluationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/evaluations/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson(response, evaluationResponseSchema, 'evaluation response');
}

export async function fetchDashboardWorkspace(): Promise<DashboardWorkspaceResponse> {
  const response = await fetch(`${apiBaseUrl}/api/workspace/dashboard`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson(
    response,
    dashboardWorkspaceResponseSchema,
    'dashboard workspace response',
  );
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

  return parseJson(
    response,
    evaluationWorkspaceResponseSchema,
    'evaluation workspace response',
  );
}

export async function fetchEvaluationList(input?: {
  confidence?: EvaluationListConfidenceFilter;
  query?: string;
  sortKey?: EvaluationListSortKey;
  sortDirection?: EvaluationListSortDirection;
  page?: number;
  pageSize?: number;
}): Promise<EvaluationListResponse> {
  const searchParams = new URLSearchParams();

  if (input?.confidence) {
    searchParams.set('confidence', input.confidence);
  }

  if (input?.query?.trim()) {
    searchParams.set('q', input.query.trim());
  }

  if (input?.sortKey) {
    searchParams.set('sort', input.sortKey);
  }

  if (input?.sortDirection) {
    searchParams.set('dir', input.sortDirection);
  }

  if (input?.page) {
    searchParams.set('page', String(input.page));
  }

  if (input?.pageSize) {
    searchParams.set('pageSize', String(input.pageSize));
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/evaluations${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(
    response,
    evaluationListResponseSchema,
    'evaluation list response',
  );
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

  return parseJson(
    response,
    caseHistoryWorkspaceResponseSchema,
    'case history workspace response',
  );
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

  return parseJson(
    response,
    evaluationComparisonResponseSchema,
    'evaluation comparison response',
  );
}

export async function fetchExternalEvidenceCatalog(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
  sourceType?: ExternalEvidenceSourceTypeFilter;
  page?: number;
  pageSize?: number;
}): Promise<ExternalEvidenceCatalogListResponse> {
  const searchParams = buildExternalEvidenceSearchParams(input);
  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/external-evidence${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(
    response,
    externalEvidenceCatalogListResponseSchema,
    'external evidence catalog response',
  );
}

export async function fetchEvidenceReviewWorkspace(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
  sourceType?: ExternalEvidenceSourceTypeFilter;
  page?: number;
  pageSize?: number;
}): Promise<EvidenceReviewWorkspaceResponse> {
  const searchParams = buildExternalEvidenceSearchParams(input);
  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evidence/review${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(
    response,
    evidenceReviewWorkspaceResponseSchema,
    'evidence review workspace response',
  );
}

export async function fetchEvidenceExplorerWorkspace(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
  sourceType?: ExternalEvidenceSourceTypeFilter;
  page?: number;
  pageSize?: number;
}): Promise<EvidenceExplorerWorkspaceResponse> {
  const searchParams = buildExternalEvidenceSearchParams(input);
  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evidence/explorer${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(
    response,
    evidenceExplorerWorkspaceResponseSchema,
    'evidence explorer workspace response',
  );
}

export async function fetchEvidenceExplorerAssistant(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
  sourceType?: ExternalEvidenceSourceTypeFilter;
  page?: number;
  pageSize?: number;
}): Promise<EvidenceExplorerAssistantResponse> {
  const searchParams = buildExternalEvidenceSearchParams(input);
  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evidence/explorer/assistant${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(
    response,
    evidenceExplorerAssistantResponseSchema,
    'evidence explorer assistant response',
  );
}

export async function fetchExternalEvidenceCatalogItem(
  id: string,
): Promise<ExternalEvidenceCatalogItemDetail> {
  const response = await fetch(`${apiBaseUrl}/api/external-evidence/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson(
    response,
    externalEvidenceCatalogDetailSchema,
    'external evidence catalog detail response',
  );
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
      body: toJsonBody(externalEvidenceReviewRequestSchema, payload),
    },
  );

  return parseJson(
    response,
    externalEvidenceCatalogDetailSchema,
    'external evidence review response',
  );
}

export async function reviewExternalEvidenceCatalogItems(
  payload: ExternalEvidenceBulkReviewRequest,
): Promise<ExternalEvidenceBulkReviewResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/external-evidence/review/bulk`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: toJsonBody(externalEvidenceBulkReviewRequestSchema, payload),
    },
  );

  return parseJson(
    response,
    externalEvidenceBulkReviewResponseSchema,
    'external evidence bulk review response',
  );
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

  return parseJson(
    response,
    printableEvaluationReportResponseSchema,
    'printable evaluation report response',
  );
}

export async function askReportConversation(
  evaluationId: string,
  payload: Omit<ReportConversationRequest, 'evaluation_id'>,
): Promise<ReportConversationResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workspace/evaluations/${evaluationId}/report/conversation`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: toJsonBody(reportConversationRequestSchema, {
        ...payload,
        evaluation_id: evaluationId,
      }),
    },
  );

  return parseJson(
    response,
    reportConversationResponseSchema,
    'report conversation response',
  );
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

  return parseJson(
    response,
    evaluationWorkspaceResponseSchema,
    'evaluation JSON export response',
  );
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
    throw new Error(await readErrorMessage(response));
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

export async function fetchEvidenceExplorerCsvExport(input?: {
  status?: ExternalEvidenceReviewStatus;
  query?: string;
  sourceType?: ExternalEvidenceSourceTypeFilter;
  page?: number;
  pageSize?: number;
}): Promise<{
  content: string;
  metadata: Pick<
    ExportCsvResponseMetadata,
    'content_type' | 'generated_at' | 'file_name'
  > & {
    workspace_schema_version: string | null;
  };
}> {
  const searchParams = buildExternalEvidenceSearchParams(input);
  const queryString = searchParams.toString();
  const response = await fetch(
    `${apiBaseUrl}/api/exports/evidence/explorer/csv${queryString ? `?${queryString}` : ''}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
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
          ?.match(/filename="([^"]+)"/)?.[1] ?? 'evidence-explorer.csv',
      workspace_schema_version: response.headers.get(
        'x-metrev-workspace-schema-version',
      ),
    },
  };
}

export async function fetchResearchReviews(): Promise<ResearchReviewListResponse> {
  const response = await fetch(`${apiBaseUrl}/api/research/reviews`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson(
    response,
    researchReviewListResponseSchema,
    'research review list response',
  );
}

export async function searchResearchPapers(
  payload: SearchResearchPapersRequest,
): Promise<SearchResearchPapersResponse> {
  const response = await fetch(`${apiBaseUrl}/api/research/search`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: toJsonBody(searchResearchPapersRequestSchema, payload),
  });

  return parseJson(
    response,
    searchResearchPapersResponseSchema,
    'research search response',
  );
}

export async function stageResearchPapers(
  payload: StageResearchPapersRequest,
): Promise<StageResearchPapersResponse> {
  const response = await fetch(`${apiBaseUrl}/api/research/search/import`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: toJsonBody(stageResearchPapersRequestSchema, payload),
  });

  return parseJson(
    response,
    stageResearchPapersResponseSchema,
    'research import response',
  );
}

export async function importLocalSources(
  payload: LocalSourceImportRequest,
): Promise<LocalSourceImportResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/research/source-artifacts/import`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: toJsonBody(localSourceImportRequestSchema, payload),
    },
  );

  return parseJson(
    response,
    localSourceImportResponseSchema,
    'local source import response',
  );
}

export async function fetchSourceArtifact(
  sourceDocumentId: string,
): Promise<SourceArtifact> {
  const response = await fetch(
    `${apiBaseUrl}/api/research/source-artifacts/${sourceDocumentId}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(response, sourceArtifactSchema, 'source artifact response');
}

export async function createResearchReview(
  payload: CreateResearchReviewRequest,
): Promise<ResearchReviewDetail> {
  const response = await fetch(`${apiBaseUrl}/api/research/reviews`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: toJsonBody(createResearchReviewRequestSchema, payload),
  });

  return parseJson(
    response,
    researchReviewDetailSchema,
    'research review detail response',
  );
}

export async function fetchResearchBackfills(): Promise<ResearchBackfillListResponse> {
  const response = await fetch(`${apiBaseUrl}/api/research/backfills`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return parseJson(
    response,
    researchBackfillListResponseSchema,
    'research backfill list response',
  );
}

export async function queueResearchBackfill(
  payload: QueueResearchBackfillRequest,
): Promise<ResearchBackfillListResponse> {
  const response = await fetch(`${apiBaseUrl}/api/research/backfills`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: toJsonBody(queueResearchBackfillRequestSchema, payload),
  });

  return parseJson(
    response,
    researchBackfillListResponseSchema,
    'research backfill queue response',
  );
}

export async function fetchResearchReview(
  reviewId: string,
): Promise<ResearchReviewDetail> {
  const response = await fetch(
    `${apiBaseUrl}/api/research/reviews/${reviewId}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(
    response,
    researchReviewDetailSchema,
    'research review response',
  );
}

export async function addResearchColumn(
  reviewId: string,
  payload: AddResearchColumnRequest,
): Promise<ResearchReviewDetail> {
  const response = await fetch(
    `${apiBaseUrl}/api/research/reviews/${reviewId}/columns`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: toJsonBody(addResearchColumnRequestSchema, payload),
    },
  );

  return parseJson(
    response,
    researchReviewDetailSchema,
    'research review column update response',
  );
}

export async function runResearchExtractions(
  reviewId: string,
  payload: RunResearchExtractionsRequest = { limit: 50 },
): Promise<RunResearchExtractionsResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/research/reviews/${reviewId}/extractions/run`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: toJsonBody(runResearchExtractionsRequestSchema, payload),
    },
  );

  return parseJson(
    response,
    runResearchExtractionsResponseSchema,
    'research extraction response',
  );
}

export async function createResearchEvidencePack(
  reviewId: string,
  payload: CreateResearchEvidencePackRequest,
): Promise<ResearchEvidencePack> {
  const response = await fetch(
    `${apiBaseUrl}/api/research/reviews/${reviewId}/evidence-pack`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: toJsonBody(createResearchEvidencePackRequestSchema, payload),
    },
  );

  return parseJson(
    response,
    researchEvidencePackSchema,
    'research evidence pack response',
  );
}

export async function fetchResearchEvidencePackDecisionInput(
  packId: string,
): Promise<ResearchDecisionIngestionPreview> {
  const response = await fetch(
    `${apiBaseUrl}/api/research/evidence-packs/${packId}/decision-input`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );

  return parseJson(
    response,
    researchDecisionIngestionPreviewSchema,
    'research decision-ingestion preview response',
  );
}
