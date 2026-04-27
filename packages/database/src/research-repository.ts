import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '../generated/prisma/client';

import {
  evidenceClaimSchema,
  researchBackfillListResponseSchema,
  researchBackfillSummarySchema,
  researchDecisionIngestionPreviewSchema,
  researchEvidencePackSchema,
  researchExtractionJobSchema,
  researchExtractionResultSchema,
  researchPaperMetadataSchema,
  researchPaperSearchFailureSchema,
  researchReviewDetailSchema,
  researchReviewListResponseSchema,
  researchReviewSummarySchema,
  searchResearchPapersResponseSchema,
  stageResearchPapersResponseSchema,
  type AddResearchColumnRequest,
  type CreateResearchReviewRequest,
  type EvidenceClaim,
  type QueueResearchBackfillRequest,
  type ResearchBackfillListResponse,
  type ResearchBackfillSummary,
  type ResearchColumnDefinition,
  type ResearchDecisionIngestionPreview,
  type ResearchEvidencePack,
  type ResearchExtractionJob,
  type ResearchExtractionResult,
  type ResearchPaperMetadata,
  type ResearchPaperSearchFailure,
  type ResearchPaperSearchResult,
  type ResearchReviewDetail,
  type ResearchReviewListResponse,
  type SearchResearchPapersRequest,
  type SearchResearchPapersResponse,
  type StageResearchPapersRequest,
  type StageResearchPapersResponse,
} from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

import { getPrismaClient } from './prisma-client';
import {
  searchResearchPapers as searchResearchPapersFromProviders,
  stageResearchPapers as stageResearchPapersToWarehouse,
} from './research-paper-search';

export interface CreateResearchReviewInput extends CreateResearchReviewRequest {
  actorId?: string;
  columns: ResearchColumnDefinition[];
  extractorVersion: string;
}

export interface AddResearchReviewColumnInput {
  column: AddResearchColumnRequest;
  extractorVersion: string;
  reviewId: string;
}

export interface ClaimResearchExtractionJobsInput {
  columnIds?: string[];
  limit: number;
  paperIds?: string[];
  reviewId: string;
}

export interface ResearchExtractionWorkItem {
  claims: EvidenceClaim[];
  column: ResearchColumnDefinition;
  job: ResearchExtractionJob;
  paper: ResearchPaperMetadata;
}

export interface SaveResearchExtractionResultInput {
  jobId: string;
  result: ResearchExtractionResult;
}

export interface CreateResearchEvidencePackInput {
  decisionInput: ResearchDecisionIngestionPreview;
  pack: ResearchEvidencePack;
}

export interface QueueResearchBackfillInput extends QueueResearchBackfillRequest {
  actorId?: string;
}

export interface CompleteResearchBackfillPageInput {
  failedProviders: ResearchPaperSearchFailure[];
  isComplete: boolean;
  nextPage: number;
  pagesCompleted: number;
  recordsFetchedDelta: number;
  recordsStoredDelta: number;
  runId: string;
}

export interface FailResearchBackfillInput {
  failureMessage: string;
  runId: string;
}

export interface ResearchRepository {
  addResearchReviewColumn(
    input: AddResearchReviewColumnInput,
  ): Promise<ResearchReviewDetail | null>;
  claimQueuedResearchExtractionJobs(
    input: ClaimResearchExtractionJobsInput,
  ): Promise<ResearchExtractionWorkItem[]>;
  createResearchEvidencePack(
    input: CreateResearchEvidencePackInput,
  ): Promise<ResearchEvidencePack>;
  createResearchReview(
    input: CreateResearchReviewInput,
  ): Promise<ResearchReviewDetail>;
  disconnect(): Promise<void>;
  enqueueResearchBackfill(
    input: QueueResearchBackfillInput,
  ): Promise<ResearchBackfillSummary>;
  failResearchBackfill(
    input: FailResearchBackfillInput,
  ): Promise<ResearchBackfillSummary | null>;
  getResearchEvidencePack(packId: string): Promise<ResearchEvidencePack | null>;
  getResearchEvidencePackDecisionInput(
    packId: string,
  ): Promise<ResearchDecisionIngestionPreview | null>;
  getResearchReview(reviewId: string): Promise<ResearchReviewDetail | null>;
  claimQueuedResearchBackfills(
    limit: number,
  ): Promise<ResearchBackfillSummary[]>;
  completeResearchBackfillPage(
    input: CompleteResearchBackfillPageInput,
  ): Promise<ResearchBackfillSummary | null>;
  listResearchBackfills(): Promise<ResearchBackfillListResponse>;
  listResearchReviews(): Promise<ResearchReviewListResponse>;
  searchResearchPapers(
    input: SearchResearchPapersRequest,
  ): Promise<SearchResearchPapersResponse>;
  saveResearchExtractionResult(
    input: SaveResearchExtractionResultInput,
  ): Promise<ResearchExtractionResult>;
  stageResearchPapers(
    input: StageResearchPapersRequest,
  ): Promise<StageResearchPapersResponse>;
}

function toPrismaNestedJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      entry === undefined ? null : toPrismaNestedJsonValue(entry),
    ) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        entry === undefined ? [] : [[key, toPrismaNestedJsonValue(entry)]],
      ),
    ) as Prisma.InputJsonObject;
  }

  return String(value);
}

function toPrismaJsonValue(
  value: unknown,
): Prisma.JsonNullValueInput | Prisma.InputJsonValue {
  return value === null ? Prisma.JsonNull : toPrismaNestedJsonValue(value)!;
}

function toPrismaJsonObject(
  value: Record<string, unknown>,
): Prisma.InputJsonObject {
  return toPrismaNestedJsonValue(value) as Prisma.InputJsonObject;
}

function sourceTypeToContract(
  value:
    | 'OPENALEX'
    | 'CROSSREF'
    | 'EUROPE_PMC'
    | 'SUPPLIER_PROFILE'
    | 'MARKET_SNAPSHOT'
    | 'CURATED_MANIFEST'
    | 'MANUAL',
): ResearchPaperMetadata['source_type'] {
  switch (value) {
    case 'OPENALEX':
      return 'openalex';
    case 'CROSSREF':
      return 'crossref';
    case 'EUROPE_PMC':
      return 'europe_pmc';
    case 'SUPPLIER_PROFILE':
      return 'supplier_profile';
    case 'MARKET_SNAPSHOT':
      return 'market_snapshot';
    case 'CURATED_MANIFEST':
      return 'curated_manifest';
    default:
      return 'manual';
  }
}

function reviewStatusToContract(value: 'ACTIVE' | 'ARCHIVED') {
  return value === 'ARCHIVED' ? 'archived' : 'active';
}

function jobStatusToContract(
  value: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED',
) {
  switch (value) {
    case 'RUNNING':
      return 'running' as const;
    case 'COMPLETED':
      return 'completed' as const;
    case 'FAILED':
      return 'failed' as const;
    default:
      return 'queued' as const;
  }
}

function resultStatusToContract(value: 'VALID' | 'INVALID') {
  return value === 'VALID' ? 'valid' : 'invalid';
}

function packStatusToDatabase(value: ResearchEvidencePack['status']) {
  return value === 'reviewed' ? 'REVIEWED' : 'DRAFT';
}

function packStatusToContract(value: 'DRAFT' | 'REVIEWED') {
  return value === 'REVIEWED' ? 'reviewed' : 'draft';
}

function yearFromDate(value: Date | null): number | null {
  return value ? value.getUTCFullYear() : null;
}

function numberFromPayload(payload: unknown, key: string): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function paperMetadataFromSource(input: {
  paperId: string;
  sourceRecord: {
    abstractText: string | null;
    authors: unknown;
    doi: string | null;
    id: string;
    journal: string | null;
    pdfUrl: string | null;
    publishedAt: Date | null;
    publisher: string | null;
    rawPayload: unknown;
    sourceType:
      | 'OPENALEX'
      | 'CROSSREF'
      | 'EUROPE_PMC'
      | 'SUPPLIER_PROFILE'
      | 'MARKET_SNAPSHOT'
      | 'CURATED_MANIFEST'
      | 'MANUAL';
    sourceUrl: string | null;
    title: string;
  };
}): ResearchPaperMetadata {
  return researchPaperMetadataSchema.parse({
    paper_id: input.paperId,
    source_document_id: input.sourceRecord.id,
    title: input.sourceRecord.title,
    authors: Array.isArray(input.sourceRecord.authors)
      ? input.sourceRecord.authors
      : [],
    year: yearFromDate(input.sourceRecord.publishedAt),
    doi: input.sourceRecord.doi,
    journal: input.sourceRecord.journal,
    publisher: input.sourceRecord.publisher,
    source_type: sourceTypeToContract(input.sourceRecord.sourceType),
    source_url: input.sourceRecord.sourceUrl,
    pdf_url: input.sourceRecord.pdfUrl,
    xml_url: normalizeXmlUrlFromPayload(input.sourceRecord.rawPayload),
    abstract_text: input.sourceRecord.abstractText,
    citation_count:
      numberFromPayload(input.sourceRecord.rawPayload, 'cited_by_count') ??
      numberFromPayload(input.sourceRecord.rawPayload, 'references_count'),
    metadata: {},
  });
}

function paperMetadataFromSnapshot(input: {
  metadataSnapshot: unknown;
  paperId: string;
  sourceRecord: {
    abstractText: string | null;
    authors: unknown;
    doi: string | null;
    id: string;
    journal: string | null;
    pdfUrl: string | null;
    publishedAt: Date | null;
    publisher: string | null;
    rawPayload: unknown;
    sourceType:
      | 'OPENALEX'
      | 'CROSSREF'
      | 'EUROPE_PMC'
      | 'SUPPLIER_PROFILE'
      | 'MARKET_SNAPSHOT'
      | 'CURATED_MANIFEST'
      | 'MANUAL';
    sourceUrl: string | null;
    title: string;
  };
}): ResearchPaperMetadata {
  const fallback = paperMetadataFromSource({
    paperId: input.paperId,
    sourceRecord: input.sourceRecord,
  });
  const snapshot =
    input.metadataSnapshot && typeof input.metadataSnapshot === 'object'
      ? (input.metadataSnapshot as Record<string, unknown>)
      : {};

  return researchPaperMetadataSchema.parse({
    ...fallback,
    ...snapshot,
    paper_id: input.paperId,
    source_document_id: input.sourceRecord.id,
    source_type: fallback.source_type,
  });
}

function normalizeXmlUrlFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate =
    (payload as Record<string, unknown>).xml_url ??
    (payload as Record<string, unknown>).full_text_xml_url ??
    null;

  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate
    : null;
}

function toColumnDefinition(record: {
  answerStructure: string;
  columnGroup: string;
  columnId: string;
  columnType: string;
  instructions: string;
  name: string;
  outputSchema: unknown;
  outputSchemaKey: string;
  position: number;
  visible: boolean;
}): ResearchColumnDefinition {
  return {
    column_id: record.columnId,
    name: record.name,
    group: record.columnGroup,
    type: record.columnType as ResearchColumnDefinition['type'],
    answer_structure: record.answerStructure,
    instructions: record.instructions,
    output_schema_key: record.outputSchemaKey,
    output_schema:
      record.outputSchema && typeof record.outputSchema === 'object'
        ? (record.outputSchema as Record<string, unknown>)
        : {},
    visible: record.visible,
    position: record.position,
  };
}

function toExtractionJob(record: {
  completedAt: Date | null;
  createdAt: Date;
  extractorVersion: string;
  failureDetail: unknown;
  id: string;
  paperId: string;
  column: { columnId: string };
  reviewId: string;
  startedAt: Date | null;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  updatedAt: Date;
}): ResearchExtractionJob {
  void record.completedAt;
  void record.startedAt;

  return researchExtractionJobSchema.parse({
    job_id: record.id,
    review_id: record.reviewId,
    paper_id: record.paperId,
    column_id: record.column.columnId,
    status: jobStatusToContract(record.status),
    extractor_version: record.extractorVersion,
    failure_detail:
      record.failureDetail && typeof record.failureDetail === 'object'
        ? record.failureDetail
        : null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

function toExtractionResult(record: {
  answer: unknown;
  column: { columnId: string };
  confidence: string;
  createdAt: Date;
  evidenceTrace: unknown;
  extractorVersion: string;
  id: string;
  missingFields: string[];
  normalizedPayload: unknown;
  paperId: string;
  reviewId: string;
  status: 'VALID' | 'INVALID';
  updatedAt: Date;
  validationErrors: string[];
}): ResearchExtractionResult {
  return researchExtractionResultSchema.parse({
    result_id: record.id,
    review_id: record.reviewId,
    paper_id: record.paperId,
    column_id: record.column.columnId,
    status: resultStatusToContract(record.status),
    answer: record.answer,
    evidence_trace: record.evidenceTrace,
    confidence: record.confidence,
    missing_fields: record.missingFields,
    validation_errors: record.validationErrors,
    normalized_payload:
      record.normalizedPayload && typeof record.normalizedPayload === 'object'
        ? record.normalizedPayload
        : {},
    extractor_version: record.extractorVersion,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

function toEvidenceClaim(record: {
  catalogItemId: string | null;
  claimType:
    | 'METRIC'
    | 'MATERIAL'
    | 'ARCHITECTURE'
    | 'CONDITION'
    | 'LIMITATION'
    | 'APPLICABILITY'
    | 'ECONOMIC'
    | 'SUPPLIER_CLAIM'
    | 'MARKET_SIGNAL'
    | 'OTHER';
  confidence: number;
  content: string;
  createdAt: Date;
  extractedValue: string | null;
  extractionMethod: 'MANUAL' | 'LLM' | 'REGEX' | 'ML' | 'IMPORT_RULE';
  extractorVersion: string;
  id: string;
  metadata: unknown;
  pageNumber: number | null;
  sourceLocator: string | null;
  sourceRecordId: string;
  sourceSnippet: string;
  unit: string | null;
  updatedAt: Date;
}): EvidenceClaim {
  return evidenceClaimSchema.parse({
    id: record.id,
    source_document_id: record.sourceRecordId,
    catalog_item_id: record.catalogItemId,
    claim_type: record.claimType.toLowerCase(),
    content: record.content,
    extracted_value: record.extractedValue,
    unit: record.unit,
    confidence: record.confidence,
    extraction_method: record.extractionMethod.toLowerCase(),
    extractor_version: record.extractorVersion,
    source_snippet: record.sourceSnippet,
    source_locator: record.sourceLocator,
    page_number: record.pageNumber,
    metadata: record.metadata ?? {},
    reviews: [],
    ontology_mappings: [],
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

function toEvidencePack(record: {
  createdAt: Date;
  id: string;
  payload: unknown;
  reviewId: string;
  sourceResultIds: string[];
  status: 'DRAFT' | 'REVIEWED';
  title: string;
  updatedAt: Date;
}): ResearchEvidencePack {
  const payload =
    record.payload && typeof record.payload === 'object'
      ? (record.payload as Record<string, unknown>)
      : {};

  return researchEvidencePackSchema.parse({
    ...payload,
    pack_id: record.id,
    review_id: record.reviewId,
    title: record.title,
    status: packStatusToContract(record.status),
    source_result_ids: record.sourceResultIds,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

type PrismaResearchReviewRecord = Prisma.ResearchReviewGetPayload<{
  include: {
    columns: true;
    evidencePacks: true;
    extractionJobs: { include: { column: true } };
    extractionResults: { include: { column: true } };
    papers: { include: { sourceRecord: true } };
  };
}>;

function toResearchReviewDetail(
  record: PrismaResearchReviewRecord,
): ResearchReviewDetail {
  const papers = record.papers
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((paper) =>
      paperMetadataFromSnapshot({
        metadataSnapshot: paper.metadataSnapshot,
        paperId: paper.id,
        sourceRecord: paper.sourceRecord,
      }),
    );
  const columns = record.columns
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((column) => toColumnDefinition(column));
  const results = record.extractionResults.map((result) =>
    toExtractionResult(result),
  );

  return researchReviewDetailSchema.parse({
    review_id: record.id,
    title: record.title,
    query: record.query,
    status: reviewStatusToContract(record.status),
    version: record.version,
    paper_count: papers.length,
    column_count: columns.length,
    completed_result_count: results.length,
    papers,
    columns,
    extraction_jobs: record.extractionJobs.map((job) => toExtractionJob(job)),
    extraction_results: results,
    evidence_packs: record.evidencePacks.map((pack) => toEvidencePack(pack)),
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

function toReviewSummary(record: {
  _count: { columns: number; extractionResults: number; papers: number };
  createdAt: Date;
  id: string;
  query: string;
  status: 'ACTIVE' | 'ARCHIVED';
  title: string;
  updatedAt: Date;
  version: number;
}) {
  return researchReviewSummarySchema.parse({
    review_id: record.id,
    title: record.title,
    query: record.query,
    status: reviewStatusToContract(record.status),
    version: record.version,
    paper_count: record._count.papers,
    column_count: record._count.columns,
    completed_result_count: record._count.extractionResults,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

const researchBackfillTriggerMode = 'research_worker_backfill';

function parseBackfillSummaryPayload(
  value: unknown,
): Pick<
  ResearchBackfillSummary,
  'failed_providers' | 'max_pages' | 'per_provider_limit' | 'providers'
> {
  const record =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  return {
    providers: Array.isArray(record.providers)
      ? record.providers.filter(
          (entry): entry is ResearchBackfillSummary['providers'][number] =>
            entry === 'openalex' ||
            entry === 'crossref' ||
            entry === 'europe_pmc',
        )
      : ['openalex', 'crossref', 'europe_pmc'],
    per_provider_limit:
      typeof record.per_provider_limit === 'number' &&
      Number.isFinite(record.per_provider_limit)
        ? Math.max(1, Math.trunc(record.per_provider_limit))
        : 25,
    max_pages:
      typeof record.max_pages === 'number' && Number.isFinite(record.max_pages)
        ? Math.max(1, Math.trunc(record.max_pages))
        : 1,
    failed_providers: Array.isArray(record.failed_providers)
      ? record.failed_providers
          .map((entry) =>
            entry && typeof entry === 'object'
              ? researchPaperSearchFailureSchema.parse(entry)
              : null,
          )
          .filter((entry): entry is ResearchPaperSearchFailure =>
            Boolean(entry),
          )
      : [],
  };
}

function parseBackfillCheckpoint(
  value: unknown,
): Pick<ResearchBackfillSummary, 'next_page' | 'pages_completed' | 'status'> {
  const record =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const phase =
    typeof record.phase === 'string' ? record.phase.toLowerCase() : 'queued';
  const status =
    phase === 'running'
      ? 'running'
      : phase === 'completed'
        ? 'completed'
        : phase === 'failed'
          ? 'failed'
          : 'queued';

  return {
    status,
    next_page:
      typeof record.next_page === 'number' && Number.isFinite(record.next_page)
        ? Math.max(1, Math.trunc(record.next_page))
        : 1,
    pages_completed:
      typeof record.pages_completed === 'number' &&
      Number.isFinite(record.pages_completed)
        ? Math.max(0, Math.trunc(record.pages_completed))
        : 0,
  };
}

function toBackfillSummary(record: {
  completedAt: Date | null;
  createdAt: Date;
  failureDetail: unknown;
  id: string;
  query: string | null;
  recordsFetched: number;
  recordsStored: number;
  checkpoint: unknown;
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  summary: unknown;
  updatedAt: Date;
}): ResearchBackfillSummary {
  const summary = parseBackfillSummaryPayload(record.summary);
  const checkpoint = parseBackfillCheckpoint(record.checkpoint);
  const status =
    record.status === 'FAILED'
      ? 'failed'
      : record.status === 'COMPLETED'
        ? 'completed'
        : checkpoint.status;
  const failureMessage =
    record.failureDetail && typeof record.failureDetail === 'object'
      ? ((record.failureDetail as Record<string, unknown>).message ?? null)
      : null;

  return researchBackfillSummarySchema.parse({
    run_id: record.id,
    query: record.query ?? 'research backfill',
    status,
    providers: summary.providers,
    per_provider_limit: summary.per_provider_limit,
    max_pages: summary.max_pages,
    next_page: checkpoint.next_page,
    pages_completed: checkpoint.pages_completed,
    records_fetched: record.recordsFetched,
    records_stored: record.recordsStored,
    failed_providers: summary.failed_providers,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
    completed_at: record.completedAt?.toISOString() ?? null,
    failure_message:
      typeof failureMessage === 'string' && failureMessage.trim().length > 0
        ? failureMessage
        : null,
  });
}

function createDefaultMemoryPaper(index: number): ResearchPaperMetadata {
  return researchPaperMetadataSchema.parse({
    paper_id: `memory-paper-${index}`,
    source_document_id: `memory-source-${index}`,
    title:
      index === 1
        ? 'Microbial fuel cell wastewater treatment with carbon felt anodes'
        : 'Microbial electrolysis cell hydrogen recovery under pilot conditions',
    authors: [{ name: 'METREV Fixture Author' }],
    year: 2025,
    doi: `10.1000/research-${index}`,
    journal: 'METREV deterministic research fixtures',
    publisher: 'METREV Local Evidence Lab',
    source_type: 'manual',
    source_url: null,
    pdf_url: null,
    xml_url: null,
    abstract_text:
      index === 1
        ? 'A dual chamber microbial fuel cell using carbon felt anodes and an air cathode reached power density of 850 mW/m2 with COD removal of 82% at pH 7 and 30 C. Membrane fouling and scale-up cost remained challenges.'
        : 'A microbial electrolysis cell produced hydrogen from acetate wastewater at current density of 1.8 A/m2. Long startup and electrode cost limited implementation.',
    citation_count: null,
    metadata: {},
  });
}

export class MemoryResearchRepository implements ResearchRepository {
  private readonly backfills = new Map<string, ResearchBackfillSummary>();
  private readonly claims = new Map<string, EvidenceClaim[]>();
  private readonly columns = new Map<string, ResearchColumnDefinition[]>();
  private readonly stagedPapers = new Map<string, ResearchPaperMetadata>();
  private readonly jobs = new Map<string, ResearchExtractionJob[]>();
  private readonly papers = new Map<string, ResearchPaperMetadata[]>();
  private readonly results = new Map<string, ResearchExtractionResult[]>();
  private readonly reviews = new Map<string, ResearchReviewDetail>();
  private readonly packs = new Map<string, ResearchEvidencePack>();
  private readonly decisionInputs = new Map<
    string,
    ResearchDecisionIngestionPreview
  >();

  private buildMemorySearchResults(query: string): ResearchPaperSearchResult[] {
    const compactQuery = query.trim().toLowerCase();

    return [
      {
        source_type: 'openalex',
        source_key: 'https://openalex.org/Wmemory001',
        title: `Dual chamber microbial fuel cell search fixture for ${compactQuery}`,
        authors: [{ name: 'Fixture OpenAlex Author' }],
        year: 2025,
        doi: '10.5555/openalex-fixture-001',
        journal: 'Fixture OpenAlex Journal',
        publisher: 'Fixture OpenAlex Publisher',
        source_url: 'https://openalex.org/Wmemory001',
        pdf_url: 'https://example.org/openalex-fixture-001.pdf',
        xml_url: null,
        abstract_text:
          'A live-search fixture paper describing carbon felt anodes, COD removal, and power density.',
        citation_count: 14,
        access_status: 'green',
        metadata: {
          fixture: true,
          provider: 'openalex',
        },
      },
      {
        source_type: 'crossref',
        source_key: '10.5555/crossref-fixture-001',
        title: `Crossref microbial electrochemical fixture for ${compactQuery}`,
        authors: [{ name: 'Fixture Crossref Author' }],
        year: 2024,
        doi: '10.5555/crossref-fixture-001',
        journal: 'Fixture Crossref Journal',
        publisher: 'Fixture Crossref Publisher',
        source_url: 'https://doi.org/10.5555/crossref-fixture-001',
        pdf_url: null,
        xml_url: null,
        abstract_text:
          'A Crossref search fixture describing microbial electrolysis performance and implementation limits.',
        citation_count: 9,
        access_status: 'unknown',
        metadata: {
          fixture: true,
          provider: 'crossref',
        },
      },
      {
        source_type: 'europe_pmc',
        source_key: 'MED:12345678',
        title: `Europe PMC wastewater recovery fixture for ${compactQuery}`,
        authors: [{ name: 'Fixture Europe PMC Author' }],
        year: 2023,
        doi: '10.5555/europepmc-fixture-001',
        journal: 'Fixture Europe PMC Journal',
        publisher: 'MED',
        source_url: 'https://europepmc.org/article/MED/12345678',
        pdf_url: null,
        xml_url: 'https://europepmc.org/articles/PMC123456/fulltext.xml',
        abstract_text:
          'A Europe PMC fixture covering nutrient recovery and bioelectrochemical wastewater treatment.',
        citation_count: 5,
        access_status: 'green',
        metadata: {
          fixture: true,
          provider: 'europe_pmc',
        },
      },
    ];
  }

  async createResearchReview(
    input: CreateResearchReviewInput,
  ): Promise<ResearchReviewDetail> {
    const now = new Date().toISOString();
    const reviewId = randomUUID();
    const papers = input.source_document_ids?.length
      ? input.source_document_ids
          .map((sourceDocumentId) => this.stagedPapers.get(sourceDocumentId))
          .filter((paper): paper is ResearchPaperMetadata => Boolean(paper))
          .slice(0, input.limit)
      : [createDefaultMemoryPaper(1), createDefaultMemoryPaper(2)].slice(
          0,
          input.limit,
        );
    const columns = input.columns;
    const jobs = papers.flatMap((paper) =>
      columns.map((column) =>
        researchExtractionJobSchema.parse({
          job_id: randomUUID(),
          review_id: reviewId,
          paper_id: paper.paper_id,
          column_id: column.column_id,
          status: 'queued',
          extractor_version: input.extractorVersion,
          failure_detail: null,
          created_at: now,
          updated_at: now,
        }),
      ),
    );
    const detail = researchReviewDetailSchema.parse({
      review_id: reviewId,
      title: input.title ?? input.query,
      query: input.query,
      status: 'active',
      version: 1,
      paper_count: papers.length,
      column_count: columns.length,
      completed_result_count: 0,
      papers,
      columns,
      extraction_jobs: jobs,
      extraction_results: [],
      evidence_packs: [],
      created_at: now,
      updated_at: now,
    });

    this.reviews.set(reviewId, detail);
    this.papers.set(reviewId, papers);
    this.columns.set(reviewId, columns);
    this.jobs.set(reviewId, jobs);
    this.results.set(reviewId, []);
    this.claims.set(papers[0]?.paper_id ?? 'memory-paper-1', [
      evidenceClaimSchema.parse({
        id: 'memory-claim-1',
        source_document_id: papers[0]?.source_document_id ?? 'memory-source-1',
        catalog_item_id: null,
        claim_type: 'metric',
        content:
          'Power density of 850 mW/m2 and COD removal of 82% were reported.',
        extracted_value: '850',
        unit: 'mW/m2',
        confidence: 0.8,
        extraction_method: 'import_rule',
        extractor_version: 'memory-v1',
        source_snippet:
          'Power density of 850 mW/m2 and COD removal of 82% were reported.',
        source_locator: 'abstract',
        page_number: null,
        metadata: {},
        reviews: [],
        ontology_mappings: [],
        created_at: now,
        updated_at: now,
      }),
    ]);

    return detail;
  }

  async searchResearchPapers(
    input: SearchResearchPapersRequest,
  ): Promise<SearchResearchPapersResponse> {
    return searchResearchPapersResponseSchema.parse({
      query: input.query,
      providers: input.providers ?? ['openalex', 'crossref', 'europe_pmc'],
      items: this.buildMemorySearchResults(input.query).slice(0, input.limit),
      failed_providers: [],
    });
  }

  async stageResearchPapers(
    input: StageResearchPapersRequest,
  ): Promise<StageResearchPapersResponse> {
    const papers = input.items.map((item) => {
      const sourceDocumentId = `memory-staged-${item.source_type}-${item.source_key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
      const paper = researchPaperMetadataSchema.parse({
        paper_id: `staged:${sourceDocumentId}`,
        source_document_id: sourceDocumentId,
        title: item.title,
        authors: item.authors,
        year: item.year,
        doi: item.doi,
        journal: item.journal,
        publisher: item.publisher,
        source_type: item.source_type,
        source_url: item.source_url,
        pdf_url: item.pdf_url,
        xml_url: item.xml_url,
        abstract_text: item.abstract_text,
        citation_count: item.citation_count,
        metadata: item.metadata,
      });

      this.stagedPapers.set(sourceDocumentId, paper);
      return paper;
    });

    return stageResearchPapersResponseSchema.parse({
      query: input.query ?? null,
      imported_count: papers.length,
      source_document_ids: papers.map((paper) => paper.source_document_id),
      papers,
    });
  }

  async listResearchReviews(): Promise<ResearchReviewListResponse> {
    return researchReviewListResponseSchema.parse({
      items: [...this.reviews.values()].map((review) => ({
        review_id: review.review_id,
        title: review.title,
        query: review.query,
        status: review.status,
        version: review.version,
        paper_count: review.papers.length,
        column_count: review.columns.length,
        completed_result_count: review.extraction_results.length,
        created_at: review.created_at,
        updated_at: review.updated_at,
      })),
    });
  }

  async enqueueResearchBackfill(
    input: QueueResearchBackfillInput,
  ): Promise<ResearchBackfillSummary> {
    const now = new Date().toISOString();
    const backfill = researchBackfillSummarySchema.parse({
      run_id: randomUUID(),
      query: input.query,
      status: 'queued',
      providers: input.providers ?? ['openalex', 'crossref', 'europe_pmc'],
      per_provider_limit: input.per_provider_limit,
      max_pages: input.max_pages,
      next_page: 1,
      pages_completed: 0,
      records_fetched: 0,
      records_stored: 0,
      failed_providers: [],
      created_at: now,
      updated_at: now,
      completed_at: null,
      failure_message: null,
    });

    this.backfills.set(backfill.run_id, backfill);
    return backfill;
  }

  async listResearchBackfills(): Promise<ResearchBackfillListResponse> {
    return researchBackfillListResponseSchema.parse({
      items: [...this.backfills.values()].sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      ),
    });
  }

  async claimQueuedResearchBackfills(
    limit: number,
  ): Promise<ResearchBackfillSummary[]> {
    const claimed = [...this.backfills.values()]
      .filter((entry) => entry.status === 'queued')
      .slice(0, limit);
    const now = new Date().toISOString();

    for (const entry of claimed) {
      this.backfills.set(entry.run_id, {
        ...entry,
        status: 'running',
        updated_at: now,
      });
    }

    return claimed.map((entry) => ({
      ...entry,
      status: 'running',
      updated_at: now,
    }));
  }

  async completeResearchBackfillPage(
    input: CompleteResearchBackfillPageInput,
  ): Promise<ResearchBackfillSummary | null> {
    const current = this.backfills.get(input.runId);
    if (!current) {
      return null;
    }

    const updated = researchBackfillSummarySchema.parse({
      ...current,
      status: input.isComplete ? 'completed' : 'queued',
      next_page: input.isComplete ? current.next_page : input.nextPage,
      pages_completed: input.pagesCompleted,
      records_fetched: current.records_fetched + input.recordsFetchedDelta,
      records_stored: current.records_stored + input.recordsStoredDelta,
      failed_providers: input.failedProviders,
      updated_at: new Date().toISOString(),
      completed_at: input.isComplete ? new Date().toISOString() : null,
      failure_message: null,
    });

    this.backfills.set(updated.run_id, updated);
    return updated;
  }

  async failResearchBackfill(
    input: FailResearchBackfillInput,
  ): Promise<ResearchBackfillSummary | null> {
    const current = this.backfills.get(input.runId);
    if (!current) {
      return null;
    }

    const updated = researchBackfillSummarySchema.parse({
      ...current,
      status: 'failed',
      updated_at: new Date().toISOString(),
      failure_message: input.failureMessage,
      completed_at: null,
    });

    this.backfills.set(updated.run_id, updated);
    return updated;
  }

  async getResearchReview(
    reviewId: string,
  ): Promise<ResearchReviewDetail | null> {
    return this.reviews.get(reviewId) ?? null;
  }

  async addResearchReviewColumn(
    input: AddResearchReviewColumnInput,
  ): Promise<ResearchReviewDetail | null> {
    const current = this.reviews.get(input.reviewId);
    if (!current) {
      return null;
    }

    const column = {
      ...input.column,
      position: input.column.position ?? current.columns.length,
    };
    const now = new Date().toISOString();
    const jobs = current.papers.map((paper) =>
      researchExtractionJobSchema.parse({
        job_id: randomUUID(),
        review_id: current.review_id,
        paper_id: paper.paper_id,
        column_id: column.column_id,
        status: 'queued',
        extractor_version: input.extractorVersion,
        failure_detail: null,
        created_at: now,
        updated_at: now,
      }),
    );
    const updated = researchReviewDetailSchema.parse({
      ...current,
      version: current.version + 1,
      column_count: current.column_count + 1,
      columns: [...current.columns, column],
      extraction_jobs: [...current.extraction_jobs, ...jobs],
      updated_at: now,
    });

    this.reviews.set(input.reviewId, updated);
    this.columns.set(input.reviewId, updated.columns);
    this.jobs.set(input.reviewId, updated.extraction_jobs);
    return updated;
  }

  async claimQueuedResearchExtractionJobs(
    input: ClaimResearchExtractionJobsInput,
  ): Promise<ResearchExtractionWorkItem[]> {
    const review = this.reviews.get(input.reviewId);
    if (!review) {
      return [];
    }

    const claimed = (this.jobs.get(input.reviewId) ?? [])
      .filter((job) => job.status === 'queued')
      .filter(
        (job) => !input.columnIds || input.columnIds.includes(job.column_id),
      )
      .filter((job) => !input.paperIds || input.paperIds.includes(job.paper_id))
      .slice(0, input.limit);
    const now = new Date().toISOString();
    const claimedIds = new Set(claimed.map((job) => job.job_id));
    const updatedJobs = (this.jobs.get(input.reviewId) ?? []).map((job) =>
      claimedIds.has(job.job_id)
        ? { ...job, status: 'running' as const, updated_at: now }
        : job,
    );
    this.jobs.set(input.reviewId, updatedJobs);

    const updatedReview = researchReviewDetailSchema.parse({
      ...review,
      extraction_jobs: updatedJobs,
      updated_at: now,
    });
    this.reviews.set(input.reviewId, updatedReview);

    return claimed.flatMap((job) => {
      const paper = updatedReview.papers.find(
        (entry) => entry.paper_id === job.paper_id,
      );
      const column = updatedReview.columns.find(
        (entry) => entry.column_id === job.column_id,
      );

      return paper && column
        ? [
            {
              job: { ...job, status: 'running' },
              paper,
              column,
              claims: this.claims.get(paper.paper_id) ?? [],
            },
          ]
        : [];
    });
  }

  async saveResearchExtractionResult(
    input: SaveResearchExtractionResultInput,
  ): Promise<ResearchExtractionResult> {
    const current = this.reviews.get(input.result.review_id);
    const result = researchExtractionResultSchema.parse({
      ...input.result,
      result_id: input.result.result_id ?? randomUUID(),
      created_at: input.result.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const results = [
      ...(this.results.get(result.review_id) ?? []).filter(
        (entry) =>
          entry.paper_id !== result.paper_id ||
          entry.column_id !== result.column_id,
      ),
      result,
    ];

    this.results.set(result.review_id, results);

    if (current) {
      const updated = researchReviewDetailSchema.parse({
        ...current,
        completed_result_count: results.length,
        extraction_results: results,
        extraction_jobs: current.extraction_jobs.map((job) =>
          job.job_id === input.jobId
            ? {
                ...job,
                status: result.status === 'valid' ? 'completed' : 'failed',
              }
            : job,
        ),
        updated_at: new Date().toISOString(),
      });
      this.reviews.set(result.review_id, updated);
      this.jobs.set(result.review_id, updated.extraction_jobs);
    }

    return result;
  }

  async createResearchEvidencePack(
    input: CreateResearchEvidencePackInput,
  ): Promise<ResearchEvidencePack> {
    this.packs.set(input.pack.pack_id, input.pack);
    this.decisionInputs.set(input.pack.pack_id, input.decisionInput);
    return input.pack;
  }

  async getResearchEvidencePack(
    packId: string,
  ): Promise<ResearchEvidencePack | null> {
    return this.packs.get(packId) ?? null;
  }

  async getResearchEvidencePackDecisionInput(
    packId: string,
  ): Promise<ResearchDecisionIngestionPreview | null> {
    return this.decisionInputs.get(packId) ?? null;
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

export class PrismaResearchRepository implements ResearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private candidateSourceWhere(
    token: string,
  ): Prisma.ExternalSourceRecordWhereInput {
    return {
      OR: [
        { title: { contains: token, mode: 'insensitive' } },
        { abstractText: { contains: token, mode: 'insensitive' } },
        { doi: { contains: token, mode: 'insensitive' } },
        { journal: { contains: token, mode: 'insensitive' } },
      ],
    };
  }

  private tokenizeSearchQuery(query: string): string[] {
    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);

    return [...new Set(tokens.length > 0 ? tokens : [query.toLowerCase()])];
  }

  private sourceMatchScore(
    source: {
      abstractText: string | null;
      doi: string | null;
      journal: string | null;
      title: string;
    },
    tokens: string[],
  ): number {
    const haystacks = [
      source.title,
      source.abstractText ?? '',
      source.doi ?? '',
      source.journal ?? '',
    ].map((value) => value.toLowerCase());

    return tokens.reduce(
      (score, token) =>
        haystacks.some((haystack) => haystack.includes(token))
          ? score + 1
          : score,
      0,
    );
  }

  private async findCandidateSources(tokens: string[], limit: number) {
    if (tokens.length === 0) {
      return [];
    }

    const candidateWindow = Math.max(limit * 4, 25);
    const resultSets = await Promise.all(
      tokens.map((token) =>
        this.prisma.externalSourceRecord.findMany({
          where: this.candidateSourceWhere(token),
          orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
          take: candidateWindow,
        }),
      ),
    );

    return [
      ...new Map(
        resultSets.flat().map((source) => [source.id, source]),
      ).values(),
    ];
  }

  private async findReviewRecord(reviewId: string) {
    return this.prisma.researchReview.findUnique({
      where: { id: reviewId },
      include: {
        papers: {
          include: { sourceRecord: true },
        },
        columns: true,
        extractionJobs: {
          include: { column: true },
        },
        extractionResults: {
          include: { column: true },
        },
        evidencePacks: true,
      },
    });
  }

  async createResearchReview(
    input: CreateResearchReviewInput,
  ): Promise<ResearchReviewDetail> {
    return withSpan('database.research_review.create', async () => {
      const sources = input.source_document_ids?.length
        ? (
            await this.prisma.externalSourceRecord.findMany({
              where: {
                id: {
                  in: input.source_document_ids,
                },
              },
            })
          )
            .sort(
              (left, right) =>
                input.source_document_ids!.indexOf(left.id) -
                input.source_document_ids!.indexOf(right.id),
            )
            .slice(0, input.limit)
        : (() => {
            const searchQuery = input.query.trim();
            const searchTokens = this.tokenizeSearchQuery(searchQuery);

            return this.findCandidateSources(searchTokens, input.limit).then(
              (candidateSources) =>
                candidateSources
                  .map((source) => ({
                    score: this.sourceMatchScore(source, searchTokens),
                    source,
                  }))
                  .filter((entry) => entry.score > 0)
                  .sort(
                    (left, right) =>
                      right.score - left.score ||
                      Number(right.source.publishedAt ?? new Date(0)) -
                        Number(left.source.publishedAt ?? new Date(0)) ||
                      Number(right.source.updatedAt) -
                        Number(left.source.updatedAt),
                  )
                  .slice(0, input.limit)
                  .map((entry) => entry.source),
            );
          })();

      const resolvedSources = Array.isArray(sources) ? sources : await sources;

      const review = await this.prisma.$transaction(async (tx) => {
        const created = await tx.researchReview.create({
          data: {
            title: input.title ?? input.query,
            query: input.query,
            createdBy: input.actorId,
          },
        });
        const paperRecords: Array<{ id: string }> = [];
        const columnRecords: Array<{ id: string }> = [];

        for (const [index, source] of resolvedSources.entries()) {
          const paper = await tx.researchReviewPaper.create({
            data: {
              reviewId: created.id,
              sourceRecordId: source.id,
              position: index,
              metadataSnapshot: toPrismaJsonValue(
                paperMetadataFromSource({
                  paperId: `pending:${source.id}`,
                  sourceRecord: source,
                }),
              ),
            },
          });
          paperRecords.push(paper);
        }

        for (const column of input.columns) {
          const createdColumn = await tx.researchReviewColumn.create({
            data: {
              reviewId: created.id,
              columnId: column.column_id,
              name: column.name,
              columnGroup: column.group,
              columnType: column.type,
              answerStructure: column.answer_structure,
              instructions: column.instructions,
              outputSchemaKey: column.output_schema_key,
              outputSchema: toPrismaJsonObject(column.output_schema),
              visible: column.visible,
              position: column.position,
            },
          });
          columnRecords.push(createdColumn);
        }

        if (paperRecords.length > 0 && columnRecords.length > 0) {
          await tx.researchExtractionJob.createMany({
            data: paperRecords.flatMap((paper) =>
              columnRecords.map((column) => ({
                reviewId: created.id,
                paperId: paper.id,
                columnId: column.id,
                status: 'QUEUED',
                extractorVersion: input.extractorVersion,
              })),
            ),
            skipDuplicates: true,
          });
        }

        return created;
      });

      const hydrated = await this.findReviewRecord(review.id);
      if (!hydrated) {
        throw new Error(
          `Research review ${review.id} was not found after create.`,
        );
      }

      return toResearchReviewDetail(hydrated);
    });
  }

  async listResearchReviews(): Promise<ResearchReviewListResponse> {
    return withSpan('database.research_review.list', async () => {
      const records = await this.prisma.researchReview.findMany({
        include: {
          _count: {
            select: {
              papers: true,
              columns: true,
              extractionResults: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
      });

      return researchReviewListResponseSchema.parse({
        items: records.map((record) => toReviewSummary(record)),
      });
    });
  }

  async enqueueResearchBackfill(
    input: QueueResearchBackfillInput,
  ): Promise<ResearchBackfillSummary> {
    return withSpan('database.research_backfill.enqueue', async () => {
      const created = await this.prisma.ingestionRun.create({
        data: {
          sourceType: 'MANUAL',
          triggerMode: researchBackfillTriggerMode,
          query: input.query,
          status: 'STARTED',
          recordsFetched: 0,
          recordsStored: 0,
          checkpoint: {
            phase: 'queued',
            next_page: 1,
            pages_completed: 0,
          },
          summary: {
            providers: input.providers ?? [
              'openalex',
              'crossref',
              'europe_pmc',
            ],
            per_provider_limit: input.per_provider_limit,
            max_pages: input.max_pages,
            failed_providers: [],
          },
          failureDetail: Prisma.JsonNull,
          startedAt: new Date(),
        },
      });

      return toBackfillSummary(created);
    });
  }

  async listResearchBackfills(): Promise<ResearchBackfillListResponse> {
    return withSpan('database.research_backfill.list', async () => {
      const records = await this.prisma.ingestionRun.findMany({
        where: { triggerMode: researchBackfillTriggerMode },
        orderBy: [{ createdAt: 'desc' }],
      });

      return researchBackfillListResponseSchema.parse({
        items: records.map((record) => toBackfillSummary(record)),
      });
    });
  }

  async claimQueuedResearchBackfills(
    limit: number,
  ): Promise<ResearchBackfillSummary[]> {
    return withSpan('database.research_backfill.claim', async () => {
      const records = await this.prisma.ingestionRun.findMany({
        where: {
          triggerMode: researchBackfillTriggerMode,
          status: 'STARTED',
        },
        orderBy: [{ createdAt: 'asc' }],
      });
      const queued = records
        .map((record) => ({
          record,
          checkpoint: parseBackfillCheckpoint(record.checkpoint),
        }))
        .filter(({ checkpoint }) => checkpoint.status === 'queued')
        .slice(0, limit);
      const claimed: ResearchBackfillSummary[] = [];

      for (const { record, checkpoint } of queued) {
        const updated = await this.prisma.ingestionRun.updateMany({
          where: {
            id: record.id,
            updatedAt: record.updatedAt,
            status: 'STARTED',
          },
          data: {
            checkpoint: toPrismaJsonObject({
              phase: 'running',
              next_page: checkpoint.next_page,
              pages_completed: checkpoint.pages_completed,
            }),
          },
        });

        if (updated.count === 0) {
          continue;
        }

        const refreshed = await this.prisma.ingestionRun.findUnique({
          where: { id: record.id },
        });

        if (refreshed) {
          claimed.push(toBackfillSummary(refreshed));
        }
      }

      return claimed;
    });
  }

  async completeResearchBackfillPage(
    input: CompleteResearchBackfillPageInput,
  ): Promise<ResearchBackfillSummary | null> {
    return withSpan('database.research_backfill.complete_page', async () => {
      const current = await this.prisma.ingestionRun.findUnique({
        where: { id: input.runId },
      });

      if (!current || current.triggerMode !== researchBackfillTriggerMode) {
        return null;
      }

      const summary = parseBackfillSummaryPayload(current.summary);
      const updated = await this.prisma.ingestionRun.update({
        where: { id: input.runId },
        data: {
          status: input.isComplete ? 'COMPLETED' : 'STARTED',
          recordsFetched: current.recordsFetched + input.recordsFetchedDelta,
          recordsStored: current.recordsStored + input.recordsStoredDelta,
          checkpoint: toPrismaJsonObject({
            phase: input.isComplete ? 'completed' : 'queued',
            next_page: input.isComplete ? input.nextPage - 1 : input.nextPage,
            pages_completed: input.pagesCompleted,
          }),
          summary: toPrismaJsonObject({
            providers: summary.providers,
            per_provider_limit: summary.per_provider_limit,
            max_pages: summary.max_pages,
            failed_providers: input.failedProviders,
          }),
          completedAt: input.isComplete ? new Date() : null,
          failureDetail: Prisma.JsonNull,
        },
      });

      return toBackfillSummary(updated);
    });
  }

  async failResearchBackfill(
    input: FailResearchBackfillInput,
  ): Promise<ResearchBackfillSummary | null> {
    return withSpan('database.research_backfill.fail', async () => {
      const current = await this.prisma.ingestionRun.findUnique({
        where: { id: input.runId },
      });

      if (!current || current.triggerMode !== researchBackfillTriggerMode) {
        return null;
      }

      const updated = await this.prisma.ingestionRun.update({
        where: { id: input.runId },
        data: {
          status: 'FAILED',
          failureDetail: toPrismaJsonObject({ message: input.failureMessage }),
          checkpoint: toPrismaJsonObject({
            ...parseBackfillCheckpoint(current.checkpoint),
            phase: 'failed',
          }),
          completedAt: null,
        },
      });

      return toBackfillSummary(updated);
    });
  }

  async getResearchReview(
    reviewId: string,
  ): Promise<ResearchReviewDetail | null> {
    return withSpan(
      'database.research_review.get',
      async () => {
        const record = await this.findReviewRecord(reviewId);
        return record ? toResearchReviewDetail(record) : null;
      },
      { review_id: reviewId },
    );
  }

  async addResearchReviewColumn(
    input: AddResearchReviewColumnInput,
  ): Promise<ResearchReviewDetail | null> {
    return withSpan(
      'database.research_review.add_column',
      async () => {
        const updated = await this.prisma.$transaction(async (tx) => {
          const review = await tx.researchReview.findUnique({
            where: { id: input.reviewId },
            include: {
              columns: true,
              papers: true,
            },
          });

          if (!review) {
            return null;
          }

          const position = input.column.position ?? review.columns.length;
          const column = await tx.researchReviewColumn.create({
            data: {
              reviewId: input.reviewId,
              columnId: input.column.column_id,
              name: input.column.name,
              columnGroup: input.column.group,
              columnType: input.column.type,
              answerStructure: input.column.answer_structure,
              instructions: input.column.instructions,
              outputSchemaKey: input.column.output_schema_key,
              outputSchema: toPrismaJsonObject(input.column.output_schema),
              visible: input.column.visible,
              position,
            },
          });

          if (review.papers.length > 0) {
            await tx.researchExtractionJob.createMany({
              data: review.papers.map((paper) => ({
                reviewId: input.reviewId,
                paperId: paper.id,
                columnId: column.id,
                status: 'QUEUED',
                extractorVersion: input.extractorVersion,
              })),
              skipDuplicates: true,
            });
          }

          await tx.researchReview.update({
            where: { id: input.reviewId },
            data: {
              version: { increment: 1 },
            },
          });

          return input.reviewId;
        });

        if (!updated) {
          return null;
        }

        const hydrated = await this.findReviewRecord(input.reviewId);
        return hydrated ? toResearchReviewDetail(hydrated) : null;
      },
      { review_id: input.reviewId },
    );
  }

  async claimQueuedResearchExtractionJobs(
    input: ClaimResearchExtractionJobsInput,
  ): Promise<ResearchExtractionWorkItem[]> {
    return withSpan(
      'database.research_extraction.claim',
      async () => {
        const jobs = await this.prisma.researchExtractionJob.findMany({
          where: {
            reviewId: input.reviewId,
            status: 'QUEUED',
            paperId: input.paperIds ? { in: input.paperIds } : undefined,
            column: input.columnIds
              ? {
                  is: {
                    columnId: { in: input.columnIds },
                  },
                }
              : undefined,
          },
          include: {
            column: true,
            paper: {
              include: {
                sourceRecord: {
                  include: {
                    claims: true,
                  },
                },
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
          take: input.limit,
        });

        if (jobs.length === 0) {
          return [];
        }

        await this.prisma.researchExtractionJob.updateMany({
          where: { id: { in: jobs.map((job) => job.id) } },
          data: {
            status: 'RUNNING',
            startedAt: new Date(),
          },
        });

        return jobs.map((job) => ({
          job: toExtractionJob({ ...job, status: 'RUNNING' }),
          paper: paperMetadataFromSource({
            paperId: job.paper.id,
            sourceRecord: job.paper.sourceRecord,
          }),
          column: toColumnDefinition(job.column),
          claims: job.paper.sourceRecord.claims.map((claim) =>
            toEvidenceClaim(claim),
          ),
        }));
      },
      { review_id: input.reviewId },
    );
  }

  async saveResearchExtractionResult(
    input: SaveResearchExtractionResultInput,
  ): Promise<ResearchExtractionResult> {
    return withSpan(
      'database.research_extraction.save_result',
      async () => {
        const job = await this.prisma.researchExtractionJob.findUnique({
          where: { id: input.jobId },
          include: { column: true },
        });

        if (!job) {
          throw new Error(
            `Research extraction job ${input.jobId} was not found.`,
          );
        }

        const result = await this.prisma.$transaction(async (tx) => {
          const saved = await tx.researchExtractionResult.upsert({
            where: {
              paperId_columnId: {
                paperId: job.paperId,
                columnId: job.columnId,
              },
            },
            update: {
              status: input.result.status === 'valid' ? 'VALID' : 'INVALID',
              answer: toPrismaJsonValue(input.result.answer),
              evidenceTrace: toPrismaJsonValue(input.result.evidence_trace),
              confidence: input.result.confidence,
              missingFields: input.result.missing_fields,
              validationErrors: input.result.validation_errors,
              normalizedPayload: toPrismaJsonObject(
                input.result.normalized_payload,
              ),
              extractorVersion: input.result.extractor_version,
            },
            create: {
              reviewId: job.reviewId,
              paperId: job.paperId,
              columnId: job.columnId,
              status: input.result.status === 'valid' ? 'VALID' : 'INVALID',
              answer: toPrismaJsonValue(input.result.answer),
              evidenceTrace: toPrismaJsonValue(input.result.evidence_trace),
              confidence: input.result.confidence,
              missingFields: input.result.missing_fields,
              validationErrors: input.result.validation_errors,
              normalizedPayload: toPrismaJsonObject(
                input.result.normalized_payload,
              ),
              extractorVersion: input.result.extractor_version,
            },
            include: { column: true },
          });

          await tx.researchExtractionJob.update({
            where: { id: job.id },
            data: {
              status: input.result.status === 'valid' ? 'COMPLETED' : 'FAILED',
              completedAt: new Date(),
              failureDetail:
                input.result.status === 'valid'
                  ? Prisma.JsonNull
                  : toPrismaJsonObject({
                      validation_errors: input.result.validation_errors,
                    }),
            },
          });

          return saved;
        });

        return toExtractionResult(result);
      },
      { job_id: input.jobId },
    );
  }

  async createResearchEvidencePack(
    input: CreateResearchEvidencePackInput,
  ): Promise<ResearchEvidencePack> {
    return withSpan(
      'database.research_evidence_pack.create',
      async () => {
        const saved = await this.prisma.researchEvidencePack.create({
          data: {
            id: input.pack.pack_id,
            reviewId: input.pack.review_id,
            title: input.pack.title,
            status: packStatusToDatabase(input.pack.status),
            sourceResultIds: input.pack.source_result_ids,
            payload: toPrismaJsonObject(input.pack),
            decisionInput: toPrismaJsonObject(input.decisionInput),
          },
        });

        return toEvidencePack(saved);
      },
      { review_id: input.pack.review_id },
    );
  }

  async getResearchEvidencePack(
    packId: string,
  ): Promise<ResearchEvidencePack | null> {
    const record = await this.prisma.researchEvidencePack.findUnique({
      where: { id: packId },
    });
    return record ? toEvidencePack(record) : null;
  }

  async getResearchEvidencePackDecisionInput(
    packId: string,
  ): Promise<ResearchDecisionIngestionPreview | null> {
    const record = await this.prisma.researchEvidencePack.findUnique({
      where: { id: packId },
      select: { decisionInput: true },
    });
    return record
      ? researchDecisionIngestionPreviewSchema.parse(record.decisionInput)
      : null;
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async searchResearchPapers(
    input: SearchResearchPapersRequest,
  ): Promise<SearchResearchPapersResponse> {
    return withSpan('database.research.search_external', () =>
      searchResearchPapersFromProviders(input),
    );
  }

  async stageResearchPapers(
    input: StageResearchPapersRequest,
  ): Promise<StageResearchPapersResponse> {
    return withSpan('database.research.stage_external', async () => {
      const staged = await stageResearchPapersToWarehouse(this.prisma, input);

      return stageResearchPapersResponseSchema.parse({
        query: input.query ?? null,
        imported_count: staged.papers.length,
        source_document_ids: staged.sourceDocumentIds,
        papers: staged.papers,
      });
    });
  }
}

export function createResearchRepository(): ResearchRepository {
  return new PrismaResearchRepository(getPrismaClient());
}
