import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '../generated/prisma/client';

import {
  evidenceClaimSchema,
  researchDecisionIngestionPreviewSchema,
  researchEvidencePackSchema,
  researchExtractionJobSchema,
  researchExtractionResultSchema,
  researchPaperMetadataSchema,
  researchReviewDetailSchema,
  researchReviewListResponseSchema,
  researchReviewSummarySchema,
  type AddResearchColumnRequest,
  type CreateResearchReviewRequest,
  type EvidenceClaim,
  type ResearchColumnDefinition,
  type ResearchDecisionIngestionPreview,
  type ResearchEvidencePack,
  type ResearchExtractionJob,
  type ResearchExtractionResult,
  type ResearchPaperMetadata,
  type ResearchReviewDetail,
  type ResearchReviewListResponse,
} from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

import { getPrismaClient } from './prisma-client';

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
  getResearchEvidencePack(packId: string): Promise<ResearchEvidencePack | null>;
  getResearchEvidencePackDecisionInput(
    packId: string,
  ): Promise<ResearchDecisionIngestionPreview | null>;
  getResearchReview(reviewId: string): Promise<ResearchReviewDetail | null>;
  listResearchReviews(): Promise<ResearchReviewListResponse>;
  saveResearchExtractionResult(
    input: SaveResearchExtractionResultInput,
  ): Promise<ResearchExtractionResult>;
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
    abstract_text:
      index === 1
        ? 'A dual chamber microbial fuel cell using carbon felt anodes and an air cathode reached power density of 850 mW/m2 with COD removal of 82% at pH 7 and 30 C. Membrane fouling and scale-up cost remained challenges.'
        : 'A microbial electrolysis cell produced hydrogen from acetate wastewater at current density of 1.8 A/m2. Long startup and electrode cost limited implementation.',
    citation_count: null,
    metadata: {},
  });
}

export class MemoryResearchRepository implements ResearchRepository {
  private readonly claims = new Map<string, EvidenceClaim[]>();
  private readonly columns = new Map<string, ResearchColumnDefinition[]>();
  private readonly jobs = new Map<string, ResearchExtractionJob[]>();
  private readonly papers = new Map<string, ResearchPaperMetadata[]>();
  private readonly results = new Map<string, ResearchExtractionResult[]>();
  private readonly reviews = new Map<string, ResearchReviewDetail>();
  private readonly packs = new Map<string, ResearchEvidencePack>();
  private readonly decisionInputs = new Map<
    string,
    ResearchDecisionIngestionPreview
  >();

  async createResearchReview(
    input: CreateResearchReviewInput,
  ): Promise<ResearchReviewDetail> {
    const now = new Date().toISOString();
    const reviewId = randomUUID();
    const papers = [
      createDefaultMemoryPaper(1),
      createDefaultMemoryPaper(2),
    ].slice(0, input.limit);
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
      const searchQuery = input.query.trim();
      const searchTokens = this.tokenizeSearchQuery(searchQuery);
      const candidateSources = await this.findCandidateSources(
        searchTokens,
        input.limit,
      );
      const sources = candidateSources
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
            Number(right.source.updatedAt) - Number(left.source.updatedAt),
        )
        .slice(0, input.limit)
        .map((entry) => entry.source);

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

        for (const [index, source] of sources.entries()) {
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
}

export function createResearchRepository(): ResearchRepository {
  return new PrismaResearchRepository(getPrismaClient());
}
