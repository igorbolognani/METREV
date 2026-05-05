import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '../generated/prisma/client';

import {
    caseHistoryResponseSchema,
    evaluationClaimUsageSchema,
    evaluationListResponseSchema,
    evaluationResponseSchema,
    evaluationSourceUsageSchema,
    evidenceClaimSchema,
    evidenceClaimTypeSchema,
    evidenceExtractionMethodSchema,
    evidenceStrengthSchema,
    evidenceTypeSchema,
    evidenceVeracityScoreSchema,
    externalEvidenceAccessStatusSchema,
    externalEvidenceBulkReviewResponseSchema,
    externalEvidenceCatalogDetailSchema,
    externalEvidenceCatalogListResponseSchema,
    metadataQualityProfileSchema,
    ontologyMappingSourceSchema,
    reportConversationTurnSchema,
    simulationEnrichmentSchema,
    sourceArtifactSchema,
    sourceDocumentRecordSchema,
    supplierDocumentSchema,
    supplierDocumentTypeSchema,
    workspaceSnapshotRecordSchema,
    type CaseHistoryResponse,
    type ConfidenceLevel,
    type EvaluationListResponse,
    type EvaluationResponse,
    type EvidenceClaim,
    type ExternalEvidenceBulkReviewResponse,
    type ExternalEvidenceCatalogItemDetail,
    type ExternalEvidenceCatalogItemSummary,
    type ExternalEvidenceCatalogListResponse,
    type ExternalEvidenceReviewAction,
    type ExternalEvidenceReviewStatus,
    type ExternalEvidenceSourceType,
    type NarrativeMetadata,
    type ReportConversationCitation,
    type ReportConversationGrounding,
    type ReportConversationTurn,
    type SourceArtifact,
} from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

import { getPrismaClient } from './prisma-client';
import { deriveSupplierPersistencePlan } from './supplier-persistence';

const PRISMA_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 60_000,
} as const;

export { disconnectPrismaClient, getPrismaClient } from './prisma-client';
export {
    MFC_MEC_30000_PRESET_ID,
    planResearchBackfillPreset,
    type PlannedResearchBackfill,
    type PlannedResearchBackfillPreset
} from './research-backfill-presets';
export {
    createResearchRepository,
    MemoryResearchRepository,
    PrismaResearchRepository,
    type AddResearchReviewColumnInput,
    type ClaimResearchExtractionJobsInput,
    type CreateResearchEvidencePackInput,
    type CreateResearchReviewInput,
    type ResearchExtractionWorkItem,
    type ResearchRepository,
    type SaveResearchExtractionResultInput
} from './research-repository';
export {
    buildEvidenceVeracityScore,
    getSourceArtifactForSourceDocument,
    importLocalPdfSources,
    localSourceImportRequestToInput,
    normalizeCliFiles,
    resolveLocalSourceImportRequestToInput,
    type LocalPdfImportFile,
    type LocalPdfImportInput
} from './source-artifacts';

export interface EvaluationRepository {
  saveEvaluation(evaluation: EvaluationResponse): Promise<EvaluationResponse>;
  getEvaluation(evaluationId: string): Promise<EvaluationResponse | null>;
  getEvaluationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<EvaluationResponse | null>;
  listEvaluations(input?: EvaluationListInput): Promise<EvaluationListResponse>;
  getCaseHistory(caseId: string): Promise<CaseHistoryResponse | null>;
  getEvidenceBenchmarkSlice(
    input: EvidenceBenchmarkSliceInput,
  ): Promise<EvidenceBenchmarkSlice>;
  listExternalEvidenceCatalog(
    input?: ExternalEvidenceCatalogListInput,
  ): Promise<ExternalEvidenceCatalogListResponse>;
  getExternalEvidenceCatalogItem(
    catalogItemId: string,
  ): Promise<ExternalEvidenceCatalogItemDetail | null>;
  reviewExternalEvidenceCatalogItem(
    input: ReviewExternalEvidenceCatalogItemInput,
  ): Promise<ExternalEvidenceCatalogItemDetail | null>;
  reviewExternalEvidenceCatalogItems(
    input: ReviewExternalEvidenceCatalogItemsInput,
  ): Promise<ExternalEvidenceBulkReviewResponse>;
  listRecentReportConversationTurns(
    input: ListRecentReportConversationTurnsInput,
  ): Promise<ReportConversationTurn[]>;
  saveReportConversationTurn(
    input: SaveReportConversationTurnInput,
  ): Promise<ReportConversationTurn>;
  disconnect(): Promise<void>;
}

export interface ExternalEvidenceCatalogListInput {
  componentType?: string;
  decisionReady?: boolean;
  material?: string;
  metricType?: string;
  reviewStatus?: ExternalEvidenceReviewStatus;
  searchQuery?: string;
  sourceType?: ExternalEvidenceSourceType;
  systemType?: string;
  page?: number;
  pageSize?: number;
}

export interface EvidenceBenchmarkSliceInput {
  application?: string;
  componentTypes?: string[];
  limit?: number;
  materials?: string[];
  metricTypes?: string[];
  systemType?: string;
}

export interface EvidenceBenchmarkSlice {
  aggregates: Array<{
    canonical_key: string;
    metric_type: string;
    normalized_unit: string;
    system_type: string | null;
    application: string | null;
    component_type: string | null;
    material: string | null;
    publication_year: number | null;
    evidence_quality: string | null;
    record_count: number;
    min_value: number | null;
    p25_value: number | null;
    median_value: number | null;
    p75_value: number | null;
    p90_value: number | null;
    max_value: number | null;
    mean_value: number | null;
    confidence_coverage: number | null;
  }>;
  evidence: Array<{
    catalog_item_id: string;
    source_record_id: string;
    title: string;
    doi: string | null;
    source_url: string | null;
    canonical_key: string | null;
    metric_type: string | null;
    normalized_value: number | null;
    normalized_unit: string | null;
    material: string | null;
    component_type: string | null;
    confidence: number | null;
    publication_year: number | null;
  }>;
  summary: {
    aggregate_count: number;
    evidence_count: number;
    limited_to: number;
  };
}

export interface EvaluationListInput {
  confidenceLevel?: ConfidenceLevel;
  searchQuery?: string;
  sortKey?: 'created_at' | 'confidence_level' | 'case_id';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ReviewExternalEvidenceCatalogItemInput {
  catalogItemId: string;
  action: ExternalEvidenceReviewAction;
  actorRole: string;
  actorId?: string;
  note?: string;
}

export interface ReviewExternalEvidenceCatalogItemsInput {
  catalogItemIds: string[];
  action: ExternalEvidenceReviewAction;
  actorRole: string;
  actorId?: string;
  note?: string;
}

export interface SaveReportConversationTurnInput {
  conversationId: string;
  evaluationId: string;
  actor: 'user' | 'assistant' | 'system';
  actorId?: string;
  message: string;
  selectedSection?: string | null;
  reportSnapshotId?: string | null;
  narrativeMetadata?: NarrativeMetadata | null;
  citations?: ReportConversationCitation[] | null;
  grounding?: ReportConversationGrounding | null;
  refusalReason?: string | null;
}

export interface ListRecentReportConversationTurnsInput {
  conversationId: string;
  evaluationId: string;
  limit?: number;
}

export interface MemoryEvaluationRepositoryOptions {
  externalEvidenceCatalogItems?: ExternalEvidenceCatalogItemDetail[];
}

type DatabaseExternalSourceType =
  | 'OPENALEX'
  | 'CROSSREF'
  | 'EUROPE_PMC'
  | 'PAPER'
  | 'REVIEW'
  | 'PATENT'
  | 'DATASHEET'
  | 'MANUAL_SOP'
  | 'TECHNICAL_REPORT'
  | 'SUPPLIER_DOCUMENT'
  | 'SUPPLIER_PROFILE'
  | 'CASE_STUDY'
  | 'MARKET_REPORT'
  | 'MARKET_SNAPSHOT'
  | 'REGULATORY_REPORT'
  | 'CURATED_MANIFEST'
  | 'MANUAL';

function normalizeCatalogItemIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
}

function buildMissingCatalogItemFailure(catalogItemId: string) {
  return {
    id: catalogItemId,
    message: `External evidence catalog item ${catalogItemId} was not found.`,
  };
}

function normalizeStorageMode(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? 'postgres';
}

export function assertRuntimeDatabaseConfiguration(): void {
  const storageMode = normalizeStorageMode(process.env.METREV_STORAGE_MODE);

  if (storageMode !== 'postgres') {
    throw new Error(
      'METREV runtime requires PostgreSQL-backed persistence. In-memory storage is allowed only in explicit unit-test paths.',
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      'DATABASE_URL is required for Prisma-backed runtime persistence.',
    );
  }
}

export async function assertRuntimeDatabaseReady(): Promise<void> {
  assertRuntimeDatabaseConfiguration();
  await getPrismaClient().$connect();
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue | null {
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
      entry === undefined ? null : toPrismaJsonValue(entry),
    ) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        entry === undefined ? [] : [[key, toPrismaJsonValue(entry)]],
      ),
    ) as Prisma.InputJsonObject;
  }

  return String(value);
}

function toPrismaJsonObject(
  value: Record<string, unknown>,
): Prisma.InputJsonObject {
  return toPrismaJsonValue(value) as Prisma.InputJsonObject;
}

function toRequiredPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return toPrismaJsonValue(value) as Prisma.InputJsonValue;
}

function toEvaluationSummary(
  evaluation: EvaluationResponse,
): EvaluationListResponse['items'][number] {
  return {
    evaluation_id: evaluation.evaluation_id,
    case_id: evaluation.case_id,
    created_at: evaluation.audit_record.timestamp,
    confidence_level:
      evaluation.decision_output.confidence_and_uncertainty_summary
        .confidence_level,
    technology_family: evaluation.normalized_case.technology_family,
    primary_objective: evaluation.normalized_case.primary_objective,
    summary: evaluation.decision_output.current_stack_diagnosis.summary,
    narrative_available: Boolean(evaluation.narrative),
    simulation_summary: evaluation.simulation_enrichment
      ? {
          status: evaluation.simulation_enrichment.status,
          model_version: evaluation.simulation_enrichment.model_version,
          confidence_level: evaluation.simulation_enrichment.confidence.level,
          derived_observation_count:
            evaluation.simulation_enrichment.derived_observations.length,
          has_series: evaluation.simulation_enrichment.series.length > 0,
        }
      : undefined,
  };
}

function fromSimulationArtifactRecord(record: {
  status: string;
  modelVersion: string;
  inputSnapshot: unknown;
  derivedObservations: unknown;
  series: unknown;
  assumptions: unknown;
  confidence: unknown;
  provenance: unknown;
  failureDetail: unknown;
}) {
  return simulationEnrichmentSchema.parse({
    status: record.status,
    model_version: record.modelVersion,
    input_snapshot: record.inputSnapshot,
    derived_observations: record.derivedObservations,
    series: record.series,
    assumptions: record.assumptions,
    confidence: record.confidence,
    provenance: record.provenance,
    failure_detail: record.failureDetail ?? undefined,
  });
}

type PersistedSimulationSummary = NonNullable<
  EvaluationListResponse['items'][number]['simulation_summary']
>;

function toSimulationSummaryFromArtifact(record: {
  status: string;
  modelVersion: string;
  confidence: unknown;
  derivedObservations: unknown;
  series: unknown;
}): PersistedSimulationSummary {
  return {
    status: record.status as PersistedSimulationSummary['status'],
    model_version: record.modelVersion,
    confidence_level:
      ((record.confidence as Record<string, unknown>)
        .level as PersistedSimulationSummary['confidence_level']) ?? 'low',
    derived_observation_count: Array.isArray(record.derivedObservations)
      ? record.derivedObservations.length
      : 0,
    has_series: Array.isArray(record.series) ? record.series.length > 0 : false,
  };
}

function mapExternalEvidenceReviewStatus(
  value: 'PENDING' | 'ACCEPTED' | 'REJECTED',
): ExternalEvidenceReviewStatus {
  switch (value) {
    case 'ACCEPTED':
      return 'accepted';
    case 'REJECTED':
      return 'rejected';
    default:
      return 'pending';
  }
}

function mapExternalEvidenceSourceType(value: DatabaseExternalSourceType) {
  switch (value) {
    case 'OPENALEX':
      return 'openalex';
    case 'CROSSREF':
      return 'crossref';
    case 'EUROPE_PMC':
      return 'europe_pmc';
    case 'PAPER':
      return 'paper';
    case 'REVIEW':
      return 'review';
    case 'PATENT':
      return 'patent';
    case 'DATASHEET':
      return 'datasheet';
    case 'MANUAL_SOP':
      return 'manual_sop';
    case 'TECHNICAL_REPORT':
      return 'technical_report';
    case 'SUPPLIER_DOCUMENT':
      return 'supplier_document';
    case 'SUPPLIER_PROFILE':
      return 'supplier_profile';
    case 'CASE_STUDY':
      return 'case_study';
    case 'MARKET_REPORT':
      return 'market_report';
    case 'MARKET_SNAPSHOT':
      return 'market_snapshot';
    case 'REGULATORY_REPORT':
      return 'regulatory_report';
    case 'CURATED_MANIFEST':
      return 'curated_manifest';
    default:
      return 'manual';
  }
}

function normalizeExternalEvidenceType(
  value: string,
  sourceType: DatabaseExternalSourceType,
) {
  const normalizedValue = value.trim().toLowerCase();
  const parsed = evidenceTypeSchema.safeParse(normalizedValue);

  if (parsed.success) {
    return parsed.data;
  }

  if (normalizedValue === 'curated_evidence') {
    return 'literature_evidence';
  }

  if (normalizedValue === 'market_signal') {
    return sourceType === 'SUPPLIER_PROFILE'
      ? 'supplier_claim'
      : 'derived_heuristic';
  }

  switch (sourceType) {
    case 'SUPPLIER_DOCUMENT':
    case 'SUPPLIER_PROFILE':
      return 'supplier_claim';
    case 'MARKET_REPORT':
    case 'MARKET_SNAPSHOT':
    case 'REGULATORY_REPORT':
      return 'derived_heuristic';
    default:
      return 'literature_evidence';
  }
}

function toDatabaseExternalEvidenceSourceType(
  value: ExternalEvidenceSourceType,
): DatabaseExternalSourceType {
  switch (value) {
    case 'openalex':
      return 'OPENALEX';
    case 'crossref':
      return 'CROSSREF';
    case 'europe_pmc':
      return 'EUROPE_PMC';
    case 'paper':
      return 'PAPER';
    case 'review':
      return 'REVIEW';
    case 'patent':
      return 'PATENT';
    case 'datasheet':
      return 'DATASHEET';
    case 'manual_sop':
      return 'MANUAL_SOP';
    case 'technical_report':
      return 'TECHNICAL_REPORT';
    case 'supplier_document':
      return 'SUPPLIER_DOCUMENT';
    case 'supplier_profile':
      return 'SUPPLIER_PROFILE';
    case 'case_study':
      return 'CASE_STUDY';
    case 'market_report':
      return 'MARKET_REPORT';
    case 'market_snapshot':
      return 'MARKET_SNAPSHOT';
    case 'regulatory_report':
      return 'REGULATORY_REPORT';
    case 'curated_manifest':
      return 'CURATED_MANIFEST';
    default:
      return 'MANUAL';
  }
}

function mapExternalEvidenceSourceState(
  value: 'RAW' | 'PARSED' | 'NORMALIZED' | 'REVIEWED',
) {
  switch (value) {
    case 'RAW':
      return 'raw';
    case 'NORMALIZED':
      return 'normalized';
    case 'REVIEWED':
      return 'reviewed';
    default:
      return 'parsed';
  }
}

function toDatabaseExternalEvidenceReviewStatus(
  value: ExternalEvidenceReviewAction | ExternalEvidenceReviewStatus,
): 'PENDING' | 'ACCEPTED' | 'REJECTED' {
  switch (value) {
    case 'accept':
    case 'accepted':
      return 'ACCEPTED';
    case 'reject':
    case 'rejected':
      return 'REJECTED';
    default:
      return 'PENDING';
  }
}

function toCatalogPagination(input?: { page?: number; pageSize?: number }): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const page = Math.max(1, Math.trunc(input?.page ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Math.trunc(input?.pageSize ?? 25)),
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

type ExternalEvidenceAggregateRow = {
  evidence_type: ExternalEvidenceCatalogItemSummary['evidence_type'];
  review_status: ExternalEvidenceCatalogItemSummary['review_status'];
  source_type: ExternalEvidenceCatalogItemSummary['source_type'];
  publisher: string | null;
  doi: string | null;
  source_url: string | null;
  claim_count: number;
  metadata_quality_level: string | null;
  reviewed_claim_count: number;
  veracity_level: string | null;
};

function titleCaseToken(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createExplorerFacetBuckets(
  values: Array<string | null | undefined>,
  formatLabel: (value: string) => string = titleCaseToken,
): ExternalEvidenceCatalogListResponse['warehouse_aggregate']['facets']['source_types'] {
  const counts = new Map<string, number>();

  for (const rawValue of values) {
    const value = rawValue?.trim() || 'not_stated';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: formatLabel(value),
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });
}

function createExplorerFacetBucketsFromCounts(
  values: Array<{ value: string | null | undefined; count: number }>,
  formatLabel: (value: string) => string = titleCaseToken,
): ExternalEvidenceCatalogListResponse['warehouse_aggregate']['facets']['source_types'] {
  const counts = new Map<string, number>();

  for (const entry of values) {
    const value = entry.value?.trim() || 'not_stated';
    counts.set(value, (counts.get(value) ?? 0) + entry.count);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: formatLabel(value),
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });
}

function buildExternalEvidenceWarehouseAggregate(
  rows: ExternalEvidenceAggregateRow[],
  returnedItemCount: number,
): ExternalEvidenceCatalogListResponse['warehouse_aggregate'] {
  return {
    facets: {
      source_types: createExplorerFacetBuckets(
        rows.map((row) => row.source_type),
      ),
      evidence_types: createExplorerFacetBuckets(
        rows.map((row) => row.evidence_type),
      ),
      review_statuses: createExplorerFacetBuckets(
        rows.map((row) => row.review_status),
      ),
      publishers: createExplorerFacetBuckets(
        rows.map((row) => row.publisher),
        (value) => (value === 'not_stated' ? 'Publisher not stated' : value),
      ),
      metadata_quality_levels: createExplorerFacetBuckets(
        rows.map((row) => row.metadata_quality_level),
      ),
      veracity_levels: createExplorerFacetBuckets(
        rows.map((row) => row.veracity_level),
      ),
    },
    snapshot: {
      filtered_item_count: rows.length,
      returned_item_count: returnedItemCount,
      claim_count: rows.reduce((total, row) => total + row.claim_count, 0),
      reviewed_claim_count: rows.reduce(
        (total, row) => total + row.reviewed_claim_count,
        0,
      ),
      doi_count: rows.filter((row) => Boolean(row.doi)).length,
      linked_source_count: rows.filter((row) => Boolean(row.source_url)).length,
      publisher_count: new Set(
        rows
          .map((row) => row.publisher?.trim())
          .filter((value): value is string => Boolean(value)),
      ).size,
    },
  };
}

function buildExternalEvidenceWarehouseAggregateFromStats(input: {
  sourceTypes: Array<{ value: string | null | undefined; count: number }>;
  evidenceTypes: Array<{ value: string | null | undefined; count: number }>;
  reviewStatuses: Array<{ value: string | null | undefined; count: number }>;
  publishers: Array<{ value: string | null | undefined; count: number }>;
  qualityLevels: Array<{ value: string | null | undefined; count: number }>;
  filteredItemCount: number;
  returnedItemCount: number;
  claimCount: number;
  reviewedClaimCount: number;
  doiCount: number;
  linkedSourceCount: number;
  publisherCount: number;
}): ExternalEvidenceCatalogListResponse['warehouse_aggregate'] {
  return {
    facets: {
      source_types: createExplorerFacetBucketsFromCounts(input.sourceTypes),
      evidence_types: createExplorerFacetBucketsFromCounts(input.evidenceTypes),
      review_statuses: createExplorerFacetBucketsFromCounts(
        input.reviewStatuses,
      ),
      publishers: createExplorerFacetBucketsFromCounts(
        input.publishers,
        (value) => (value === 'not_stated' ? 'Publisher not stated' : value),
      ),
      metadata_quality_levels: createExplorerFacetBucketsFromCounts(
        input.qualityLevels,
      ),
      veracity_levels: createExplorerFacetBucketsFromCounts(
        input.qualityLevels,
      ),
    },
    snapshot: {
      filtered_item_count: input.filteredItemCount,
      returned_item_count: input.returnedItemCount,
      claim_count: input.claimCount,
      reviewed_claim_count: input.reviewedClaimCount,
      doi_count: input.doiCount,
      linked_source_count: input.linkedSourceCount,
      publisher_count: input.publisherCount,
    },
  };
}

type EvaluationListItem = EvaluationListResponse['items'][number];

const evaluationConfidenceScore: Record<ConfidenceLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function toEvaluationPagination(input?: { page?: number; pageSize?: number }): {
  page: number;
  pageSize: number;
  skip: number;
} | null {
  if (input?.page === undefined && input?.pageSize === undefined) {
    return null;
  }

  const page = Math.max(1, Math.trunc(input?.page ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Math.trunc(input?.pageSize ?? 25)),
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

function matchesEvaluationSearch(
  item: EvaluationListItem,
  searchQuery: string | undefined,
): boolean {
  const normalizedQuery = searchQuery?.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    item.evaluation_id,
    item.case_id,
    item.summary,
    item.technology_family,
    item.technology_family.replaceAll('_', ' '),
    item.primary_objective,
    item.primary_objective.replaceAll('_', ' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function compareEvaluationItems(
  left: EvaluationListItem,
  right: EvaluationListItem,
  sortKey: NonNullable<EvaluationListInput['sortKey']>,
  sortDirection: NonNullable<EvaluationListInput['sortDirection']>,
): number {
  let comparison = 0;

  if (sortKey === 'confidence_level') {
    comparison =
      (evaluationConfidenceScore[left.confidence_level] ?? 0) -
      (evaluationConfidenceScore[right.confidence_level] ?? 0);
  } else if (sortKey === 'case_id') {
    comparison = left.case_id.localeCompare(right.case_id);
  } else {
    comparison = left.created_at.localeCompare(right.created_at);
  }

  return sortDirection === 'asc' ? comparison : comparison * -1;
}

function buildEvaluationListResponse(
  items: EvaluationListItem[],
  input: EvaluationListInput = {},
): EvaluationListResponse {
  const filteredItems = items.filter((item) => {
    if (
      input.confidenceLevel &&
      item.confidence_level !== input.confidenceLevel
    ) {
      return false;
    }

    return matchesEvaluationSearch(item, input.searchQuery);
  });

  const sortKey = input.sortKey ?? 'created_at';
  const sortDirection = input.sortDirection ?? 'desc';
  const sortedItems = [...filteredItems].sort((left, right) =>
    compareEvaluationItems(left, right, sortKey, sortDirection),
  );
  const pagination = toEvaluationPagination(input);
  const pagedItems = pagination
    ? sortedItems.slice(pagination.skip, pagination.skip + pagination.pageSize)
    : sortedItems;
  const filteredTotal = sortedItems.length;
  const page = pagination?.page ?? 1;
  const pageSize =
    pagination?.pageSize ?? Math.max(1, filteredTotal || items.length || 1);
  const totalPages = pagination
    ? Math.max(1, Math.ceil(filteredTotal / pageSize))
    : 1;

  return evaluationListResponseSchema.parse({
    items: pagedItems,
    summary: {
      total: items.length,
      filtered_total: filteredTotal,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      returned: pagedItems.length,
    },
  });
}

const catalogEvidenceIdPrefix = 'catalog:';
const researchEvidenceIdPrefix = 'research:';
const canonicalScientificFactLayer = 'canonical_scientific_fact_v1';
const acceptedCatalogEvidenceUsageNote =
  'Accepted catalog evidence attached during intake selection.';
const attachedResearchEvidenceUsageNote =
  'Research evidence pack attached during intake selection.';

function extractCatalogEvidenceIdsFromEvaluation(
  evaluation: EvaluationResponse,
): string[] {
  const rawInputSnapshot = evaluation.audit_record.raw_input_snapshot as {
    evidence_records?: Array<{ evidence_id?: string }>;
  };

  if (!Array.isArray(rawInputSnapshot?.evidence_records)) {
    return [];
  }

  return [
    ...new Set(
      rawInputSnapshot.evidence_records
        .map((record) => record?.evidence_id?.trim() ?? '')
        .filter((evidenceId) => evidenceId.startsWith(catalogEvidenceIdPrefix))
        .map((evidenceId) => evidenceId.slice(catalogEvidenceIdPrefix.length))
        .filter((catalogItemId) => catalogItemId.length > 0),
    ),
  ];
}

function extractResearchEvidenceReferencesFromEvaluation(
  evaluation: EvaluationResponse,
): Array<{ evidenceType: string; sourceDocumentId: string }> {
  return Array.from(
    new Map(
      evaluation.audit_record.typed_evidence
        .filter((record) =>
          (record.evidence_id ?? '').startsWith(researchEvidenceIdPrefix),
        )
        .flatMap((record) => {
          const sourceDocumentId =
            typeof record.applicability_scope?.source_document_id === 'string'
              ? record.applicability_scope.source_document_id
              : null;

          return sourceDocumentId
            ? [
                [
                  sourceDocumentId,
                  {
                    sourceDocumentId,
                    evidenceType: record.evidence_type,
                  },
                ],
              ]
            : [];
        }),
    ).values(),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const text = readString(entry);
    return text ? [text] : [];
  });
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function countByValue(values: Array<string | null | undefined>) {
  return values.reduce<Record<string, number>>((counts, value) => {
    if (!value) {
      return counts;
    }

    return {
      ...counts,
      [value]: (counts[value] ?? 0) + 1,
    };
  }, {});
}

function buildEvidenceQualitySummary(evaluation: EvaluationResponse) {
  const entries = evaluation.audit_record.typed_evidence.map((record) => {
    const recordFields = record as Record<string, unknown>;
    const applicabilityScope = asRecord(record.applicability_scope);
    const metadataQualityResult = metadataQualityProfileSchema.safeParse(
      recordFields.metadata_quality,
    );
    const veracityScoreResult = evidenceVeracityScoreSchema.safeParse(
      recordFields.veracity_score,
    );
    const metadataQuality = metadataQualityResult.success
      ? metadataQualityResult.data
      : null;
    const veracityScore = veracityScoreResult.success
      ? veracityScoreResult.data
      : null;
    const sourceDocumentId =
      readString(recordFields.source_document_id) ??
      readString(applicabilityScope?.source_document_id);
    const sourceArtifactIds = uniqueStrings([
      readString(recordFields.source_artifact_id),
      ...readStringArray(recordFields.source_artifact_ids),
    ]);
    const sourceLocatorRefs = readStringArray(recordFields.source_locator_refs);
    const reviewedClaimIds = readStringArray(recordFields.reviewed_claim_ids);
    const reviewedClaimLocatorRefs = readStringArray(
      recordFields.reviewed_claim_locator_refs,
    );
    const confidencePenalties = veracityScore?.confidence_penalties ?? [];
    const reviewStatus = readString(recordFields.review_status);

    return {
      evidence_id: record.evidence_id,
      title: record.title,
      evidence_type: record.evidence_type,
      strength_level: record.strength_level,
      source_document_id: sourceDocumentId,
      source_artifact_ids: sourceArtifactIds,
      source_locator_refs: sourceLocatorRefs,
      reviewed_claim_ids: reviewedClaimIds,
      reviewed_claim_locator_refs: reviewedClaimLocatorRefs,
      review_status: reviewStatus,
      metadata_quality_level: metadataQuality?.level ?? null,
      metadata_quality_score: metadataQuality?.score ?? null,
      veracity_level: veracityScore?.level ?? null,
      veracity_score: veracityScore?.score ?? null,
      confidence_penalties: confidencePenalties,
      trace_limited:
        metadataQuality?.level === 'low' ||
        veracityScore?.level === 'low' ||
        confidencePenalties.length > 0 ||
        reviewStatus === 'pending',
    };
  });

  return {
    typed_evidence_count: entries.length,
    trace_limited_count: entries.filter((entry) => entry.trace_limited).length,
    metadata_quality_levels: countByValue(
      entries.map((entry) => entry.metadata_quality_level),
    ),
    veracity_levels: countByValue(entries.map((entry) => entry.veracity_level)),
    confidence_penalties: uniqueStrings(
      entries.flatMap((entry) => entry.confidence_penalties),
    ),
    source_document_ids: uniqueStrings(
      entries.map((entry) => entry.source_document_id),
    ),
    source_artifact_ids: uniqueStrings(
      entries.flatMap((entry) => entry.source_artifact_ids),
    ),
    source_locator_refs: uniqueStrings(
      entries.flatMap((entry) => entry.source_locator_refs),
    ),
    reviewed_claim_ids: uniqueStrings(
      entries.flatMap((entry) => entry.reviewed_claim_ids),
    ),
    reviewed_claim_locator_refs: uniqueStrings(
      entries.flatMap((entry) => entry.reviewed_claim_locator_refs),
    ),
    entries,
  };
}

function toEvaluationSourceUsageType(input: {
  sourceType: DatabaseExternalSourceType;
  evidenceType: string;
}) {
  const normalizedEvidenceType = input.evidenceType.toLowerCase();

  if (
    input.sourceType === 'SUPPLIER_PROFILE' ||
    input.sourceType === 'SUPPLIER_DOCUMENT' ||
    input.sourceType === 'MARKET_SNAPSHOT' ||
    input.sourceType === 'MARKET_REPORT' ||
    normalizedEvidenceType.includes('supplier') ||
    normalizedEvidenceType.includes('market')
  ) {
    return 'SUPPLIER_SUPPORT' as const;
  }

  return 'ATTACHED_INPUT' as const;
}

function toEvaluationClaimUsageType(
  sourceUsageType: ReturnType<typeof toEvaluationSourceUsageType>,
) {
  return sourceUsageType === 'SUPPLIER_SUPPORT'
    ? ('SUPPLIER_SUPPORT' as const)
    : ('INPUT_SUPPORT' as const);
}

function buildWorkspaceSnapshots(evaluation: EvaluationResponse): Array<{
  evaluationId: string;
  snapshotType: 'EVALUATION' | 'REPORT' | 'EXPORT_JSON';
  payload: Record<string, unknown>;
}> {
  const catalogItemIds = extractCatalogEvidenceIdsFromEvaluation(evaluation);
  const researchSourceDocumentIds =
    extractResearchEvidenceReferencesFromEvaluation(evaluation).map(
      (entry) => entry.sourceDocumentId,
    );
  const evidenceQualitySummary = buildEvidenceQualitySummary(evaluation);
  const basePayload = {
    evaluation_id: evaluation.evaluation_id,
    case_id: evaluation.case_id,
    created_at: evaluation.audit_record.timestamp,
    confidence_level:
      evaluation.decision_output.confidence_and_uncertainty_summary
        .confidence_level,
    attached_catalog_item_ids: catalogItemIds,
    attached_research_source_document_ids: researchSourceDocumentIds,
    evidence_quality_summary: evidenceQualitySummary,
  };

  return [
    {
      evaluationId: evaluation.evaluation_id,
      snapshotType: 'EVALUATION',
      payload: {
        ...basePayload,
        normalized_case: evaluation.normalized_case,
        decision_output: evaluation.decision_output,
        narrative: evaluation.narrative,
        narrative_metadata: evaluation.narrative_metadata,
        simulation_enrichment: evaluation.simulation_enrichment ?? null,
        audit_record: {
          audit_id: evaluation.audit_record.audit_id,
          summary: evaluation.audit_record.summary,
          runtime_versions: evaluation.audit_record.runtime_versions,
          traceability: evaluation.audit_record.traceability,
        },
      },
    },
    {
      evaluationId: evaluation.evaluation_id,
      snapshotType: 'REPORT',
      payload: {
        ...basePayload,
        current_stack_diagnosis:
          evaluation.decision_output.current_stack_diagnosis,
        prioritized_improvement_options:
          evaluation.decision_output.prioritized_improvement_options,
        impact_map: evaluation.decision_output.impact_map,
        supplier_shortlist: evaluation.decision_output.supplier_shortlist,
        phased_roadmap: evaluation.decision_output.phased_roadmap,
        assumptions_and_defaults_audit:
          evaluation.decision_output.assumptions_and_defaults_audit,
        confidence_and_uncertainty_summary:
          evaluation.decision_output.confidence_and_uncertainty_summary,
        narrative: evaluation.narrative,
      },
    },
    {
      evaluationId: evaluation.evaluation_id,
      snapshotType: 'EXPORT_JSON',
      payload: evaluation as unknown as Record<string, unknown>,
    },
  ];
}

function createSourceDocumentRecord(sourceRecord: {
  id: string;
  sourceType: DatabaseExternalSourceType;
  sourceCategory: string | null;
  sourceUrl: string | null;
  doi: string | null;
  publisher: string | null;
  journal?: string | null;
  publishedAt: Date | null;
  accessStatus?: 'GOLD' | 'GREEN' | 'HYBRID' | 'BRONZE' | 'CLOSED' | 'UNKNOWN';
  license?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  authors?: unknown;
}) {
  return sourceDocumentRecordSchema.parse({
    id: sourceRecord.id,
    source_type: mapExternalEvidenceSourceType(sourceRecord.sourceType),
    source_category: sourceRecord.sourceCategory ?? null,
    source_url: sourceRecord.sourceUrl ?? null,
    doi: sourceRecord.doi ?? null,
    publisher: sourceRecord.publisher ?? null,
    journal: sourceRecord.journal ?? null,
    published_at: sourceRecord.publishedAt?.toISOString() ?? null,
    access_status: externalEvidenceAccessStatusSchema.parse(
      sourceRecord.accessStatus?.toLowerCase() ?? 'unknown',
    ),
    license: sourceRecord.license ?? null,
    pdf_url: sourceRecord.pdfUrl ?? null,
    xml_url: sourceRecord.xmlUrl ?? null,
    authors: Array.isArray(sourceRecord.authors) ? sourceRecord.authors : [],
  });
}

function createEvidenceClaim(record: {
  id: string;
  sourceRecordId: string;
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
  content: string;
  extractedValue: string | null;
  unit: string | null;
  confidence: number;
  extractionMethod: 'MANUAL' | 'LLM' | 'REGEX' | 'ML' | 'IMPORT_RULE';
  extractorVersion: string;
  sourceSnippet: string;
  sourceLocator: string | null;
  pageNumber: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  reviews?: Array<{
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    analystId: string | null;
    analystRole: string | null;
    analystNote: string | null;
    reviewedAt: Date | null;
  }>;
  ontologyMappings?: Array<{
    id: string;
    ontologyPath: string;
    mappingConfidence: number;
    mappedBy: 'AUTO' | 'ANALYST' | 'IMPORT_RULE';
    note: string | null;
  }>;
}): EvidenceClaim {
  return evidenceClaimSchema.parse({
    id: record.id,
    source_document_id: record.sourceRecordId,
    catalog_item_id: record.catalogItemId,
    claim_type: evidenceClaimTypeSchema.parse(record.claimType.toLowerCase()),
    content: record.content,
    extracted_value: record.extractedValue,
    unit: record.unit,
    confidence: record.confidence,
    extraction_method: evidenceExtractionMethodSchema.parse(
      record.extractionMethod.toLowerCase(),
    ),
    extractor_version: record.extractorVersion,
    source_snippet: record.sourceSnippet,
    source_locator: record.sourceLocator,
    page_number: record.pageNumber,
    metadata: (record.metadata as Record<string, unknown>) ?? {},
    reviews: (record.reviews ?? []).map((review) => ({
      id: review.id,
      status: mapExternalEvidenceReviewStatus(review.status),
      analyst_id: review.analystId,
      analyst_role: review.analystRole,
      analyst_note: review.analystNote,
      reviewed_at: review.reviewedAt?.toISOString() ?? null,
    })),
    ontology_mappings: (record.ontologyMappings ?? []).map((mapping) => ({
      id: mapping.id,
      ontology_path: mapping.ontologyPath,
      mapping_confidence: mapping.mappingConfidence,
      mapped_by: ontologyMappingSourceSchema.parse(
        mapping.mappedBy.toLowerCase(),
      ),
      note: mapping.note,
    })),
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

function createSupplierDocument(record: {
  id: string;
  supplierId: string;
  sourceRecordId: string;
  productId: string | null;
  documentType:
    | 'PROFILE'
    | 'DATASHEET'
    | 'SPECIFICATION'
    | 'CERTIFICATE'
    | 'MARKET_BRIEF'
    | 'CASE_STUDY'
    | 'PATENT_FILING'
    | 'REPORT'
    | 'OTHER';
  note: string | null;
}) {
  return supplierDocumentSchema.parse({
    id: record.id,
    supplier_id: record.supplierId,
    source_document_id: record.sourceRecordId,
    product_id: record.productId,
    document_type: supplierDocumentTypeSchema.parse(
      record.documentType.toLowerCase(),
    ),
    note: record.note,
  });
}

function createEvaluationSourceUsage(record: {
  id: string;
  evaluationId: string;
  sourceRecordId: string;
  usageType:
    | 'ATTACHED_INPUT'
    | 'INPUT_SUPPORT'
    | 'DIAGNOSTIC_SUPPORT'
    | 'RECOMMENDATION_SUPPORT'
    | 'SUPPLIER_SUPPORT'
    | 'REPORT_CITATION';
  note: string | null;
  createdAt: Date;
}) {
  return evaluationSourceUsageSchema.parse({
    id: record.id,
    evaluation_id: record.evaluationId,
    source_document_id: record.sourceRecordId,
    usage_type: record.usageType.toLowerCase(),
    note: record.note,
    created_at: record.createdAt.toISOString(),
  });
}

function createEvaluationClaimUsage(record: {
  id: string;
  evaluationId: string;
  claimId: string;
  usageType:
    | 'ATTACHED_INPUT'
    | 'INPUT_SUPPORT'
    | 'DIAGNOSTIC_SUPPORT'
    | 'RECOMMENDATION_SUPPORT'
    | 'SUPPLIER_SUPPORT'
    | 'REPORT_CITATION';
  note: string | null;
  createdAt: Date;
}) {
  return evaluationClaimUsageSchema.parse({
    id: record.id,
    evaluation_id: record.evaluationId,
    claim_id: record.claimId,
    usage_type: record.usageType.toLowerCase(),
    note: record.note,
    created_at: record.createdAt.toISOString(),
  });
}

function createWorkspaceSnapshotRecord(record: {
  id: string;
  evaluationId: string | null;
  caseId: string | null;
  snapshotType:
    | 'DASHBOARD'
    | 'EVALUATION'
    | 'COMPARISON'
    | 'HISTORY'
    | 'EVIDENCE_REVIEW'
    | 'REPORT'
    | 'EXPORT_JSON'
    | 'EXPORT_CSV';
  payload: unknown;
  createdAt: Date;
}) {
  return workspaceSnapshotRecordSchema.parse({
    id: record.id,
    evaluation_id: record.evaluationId,
    case_id: record.caseId,
    snapshot_type: record.snapshotType.toLowerCase(),
    payload: record.payload,
    created_at: record.createdAt.toISOString(),
  });
}

function attachLineageRuntimeVersions(
  evaluation: EvaluationResponse,
): EvaluationResponse {
  const runtimeVersions = evaluation.audit_record.runtime_versions;

  return {
    ...evaluation,
    source_usages: evaluation.source_usages.map((usage) => ({
      ...usage,
      runtime_versions: usage.runtime_versions ?? runtimeVersions,
    })),
    claim_usages: evaluation.claim_usages.map((usage) => ({
      ...usage,
      runtime_versions: usage.runtime_versions ?? runtimeVersions,
    })),
    workspace_snapshots: evaluation.workspace_snapshots.map((snapshot) => ({
      ...snapshot,
      runtime_versions: snapshot.runtime_versions ?? runtimeVersions,
    })),
  };
}

function createReportConversationTurn(record: {
  id: string;
  conversationId: string;
  actor: string;
  selectedSection: string | null;
  message: string;
  createdAt: Date;
}): ReportConversationTurn {
  return reportConversationTurnSchema.parse({
    turn_id: record.id,
    conversation_id: record.conversationId,
    actor: record.actor,
    message: record.message,
    selected_section: record.selectedSection,
    created_at: record.createdAt.toISOString(),
  });
}

function createExternalEvidenceSummary(record: {
  id: string;
  evidenceType: string;
  title: string;
  summary: string;
  strengthLevel: string;
  provenanceNote: string;
  reviewStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  sourceState: 'RAW' | 'PARSED' | 'NORMALIZED' | 'REVIEWED';
  applicabilityScope: unknown;
  extractedClaims: unknown;
  claimCount?: number;
  reviewedClaimCount?: number;
  acceptedBy?: string | null;
  acceptancePolicy?: string | null;
  acceptedAt?: Date | null;
  reviewRequired?: boolean;
  ingestionMode?: string | null;
  ingestionBatchId?: string | null;
  extractionStatus?: string | null;
  normalizationStatus?: string | null;
  evidenceQuality?: string | null;
  tags: string[];
  payload?: unknown;
  createdAt: Date;
  updatedAt: Date;
  sourceRecord: {
    sourceType: DatabaseExternalSourceType;
    sourceUrl: string | null;
    sourceCategory: string | null;
    doi: string | null;
    publisher: string | null;
    publishedAt: Date | null;
  };
}): ExternalEvidenceCatalogItemSummary {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    evidence_type: normalizeExternalEvidenceType(
      record.evidenceType,
      record.sourceRecord.sourceType,
    ),
    strength_level: evidenceStrengthSchema.parse(record.strengthLevel),
    review_status: mapExternalEvidenceReviewStatus(record.reviewStatus),
    source_state: mapExternalEvidenceSourceState(record.sourceState),
    source_type: mapExternalEvidenceSourceType(record.sourceRecord.sourceType),
    source_category: record.sourceRecord.sourceCategory,
    source_url: record.sourceRecord.sourceUrl,
    doi: record.sourceRecord.doi,
    publisher: record.sourceRecord.publisher,
    published_at: record.sourceRecord.publishedAt?.toISOString() ?? null,
    provenance_note: record.provenanceNote,
    claim_count: record.claimCount ?? 0,
    reviewed_claim_count: record.reviewedClaimCount ?? 0,
    accepted_by: record.acceptedBy ?? null,
    acceptance_policy: record.acceptancePolicy ?? null,
    accepted_at: record.acceptedAt?.toISOString() ?? null,
    review_required: record.reviewRequired ?? true,
    ingestion_mode: record.ingestionMode ?? 'manual',
    ingestion_batch_id: record.ingestionBatchId ?? null,
    extraction_status: record.extractionStatus ?? 'pending',
    normalization_status: record.normalizationStatus ?? 'pending',
    evidence_quality: record.evidenceQuality ?? null,
    applicability_scope:
      (record.applicabilityScope as Record<string, unknown>) ?? {},
    extracted_claims: Array.isArray(record.extractedClaims)
      ? record.extractedClaims
      : [],
    tags: record.tags,
    metadata_quality: metadataQualityFromPayload(record.payload),
    veracity_score: veracityScoreFromPayload(record.payload),
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}

function metadataQualityFromPayload(payload: unknown) {
  const candidate =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).metadata_quality
      : null;
  const parsed = metadataQualityProfileSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function veracityScoreFromPayload(payload: unknown) {
  const candidate =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).veracity_score
      : null;
  const parsed = evidenceVeracityScoreSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function createExternalEvidenceDetail(record: {
  id: string;
  evidenceType: string;
  title: string;
  summary: string;
  strengthLevel: string;
  provenanceNote: string;
  reviewStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  sourceState: 'RAW' | 'PARSED' | 'NORMALIZED' | 'REVIEWED';
  applicabilityScope: unknown;
  extractedClaims: unknown;
  tags: string[];
  payload: unknown;
  acceptedBy?: string | null;
  acceptancePolicy?: string | null;
  acceptedAt?: Date | null;
  reviewRequired?: boolean;
  ingestionMode?: string | null;
  ingestionBatchId?: string | null;
  extractionStatus?: string | null;
  normalizationStatus?: string | null;
  evidenceQuality?: string | null;
  createdAt: Date;
  updatedAt: Date;
  claims?: Array<{
    id: string;
    sourceRecordId: string;
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
    content: string;
    extractedValue: string | null;
    unit: string | null;
    confidence: number;
    extractionMethod: 'MANUAL' | 'LLM' | 'REGEX' | 'ML' | 'IMPORT_RULE';
    extractorVersion: string;
    sourceSnippet: string;
    sourceLocator: string | null;
    pageNumber: number | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    reviews?: Array<{
      id: string;
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
      analystId: string | null;
      analystRole: string | null;
      analystNote: string | null;
      reviewedAt: Date | null;
    }>;
    ontologyMappings?: Array<{
      id: string;
      ontologyPath: string;
      mappingConfidence: number;
      mappedBy: 'AUTO' | 'ANALYST' | 'IMPORT_RULE';
      note: string | null;
    }>;
  }>;
  sourceRecord: {
    id: string;
    sourceType: DatabaseExternalSourceType;
    sourceUrl: string | null;
    sourceCategory: string | null;
    doi: string | null;
    publisher: string | null;
    journal?: string | null;
    publishedAt: Date | null;
    accessStatus?:
      | 'GOLD'
      | 'GREEN'
      | 'HYBRID'
      | 'BRONZE'
      | 'CLOSED'
      | 'UNKNOWN';
    license?: string | null;
    pdfUrl?: string | null;
    xmlUrl?: string | null;
    authors?: unknown;
    abstractText: string | null;
    rawPayload: unknown;
    supplierDocuments?: Array<{
      id: string;
      supplierId: string;
      sourceRecordId: string;
      productId: string | null;
      documentType:
        | 'PROFILE'
        | 'DATASHEET'
        | 'SPECIFICATION'
        | 'CERTIFICATE'
        | 'MARKET_BRIEF'
        | 'CASE_STUDY'
        | 'PATENT_FILING'
        | 'REPORT'
        | 'OTHER';
      note: string | null;
    }>;
    sourceArtifacts?: Array<{
      accessStatus:
        | 'GOLD'
        | 'GREEN'
        | 'HYBRID'
        | 'BRONZE'
        | 'CLOSED'
        | 'UNKNOWN';
      chunks?: Array<{
        artifactId: string;
        charEnd: number | null;
        charStart: number | null;
        chunkIndex: number;
        createdAt: Date;
        id: string;
        metadata: unknown;
        pageNumber: number | null;
        sourceLocator: string;
        sourceRecordId: string;
        text: string;
      }>;
      doi: string | null;
      extractionMethod: string;
      failureMessage: string | null;
      fileHash: string;
      fileName: string;
      fileSizeBytes: number | null;
      id: string;
      importedAt: Date;
      ingestionStatus: string;
      license: string | null;
      localPath: string | null;
      metadataQuality: unknown;
      mimeType: string;
      pageCount: number | null;
      sourceRecordId: string;
      title: string | null;
      veracityScore: unknown;
    }>;
  };
}): ExternalEvidenceCatalogItemDetail {
  return {
    ...createExternalEvidenceSummary(record),
    source_document: createSourceDocumentRecord(record.sourceRecord),
    claims: (record.claims ?? []).map((claim) => createEvidenceClaim(claim)),
    supplier_documents: (record.sourceRecord.supplierDocuments ?? []).map(
      (document) => createSupplierDocument(document),
    ),
    source_artifacts: (record.sourceRecord.sourceArtifacts ?? []).map(
      (artifact) => createSourceArtifactRecord(artifact),
    ),
    abstract_text: record.sourceRecord.abstractText,
    payload: record.payload,
    raw_payload: record.sourceRecord.rawPayload,
  };
}

function normalizeTechnicalFilter(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function stringifyForTechnicalFilter(value: unknown): string {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return JSON.stringify(value).toLowerCase();
}

function memoryCatalogItemMatchesTechnicalFilters(
  item: ExternalEvidenceCatalogItemDetail,
  input: ExternalEvidenceCatalogListInput,
): boolean {
  const systemType = normalizeTechnicalFilter(input.systemType);
  const componentType = normalizeTechnicalFilter(input.componentType);
  const material = normalizeTechnicalFilter(input.material);
  const metricType = normalizeTechnicalFilter(input.metricType);

  if (!systemType && !componentType && !material && !metricType) {
    return true;
  }

  const searchable = stringifyForTechnicalFilter({
    title: item.title,
    summary: item.summary,
    tags: item.tags,
    applicability_scope: item.applicability_scope,
    extracted_claims: item.extracted_claims,
    payload: item.payload,
  });

  return [systemType, componentType, material, metricType].every(
    (filter) => !filter || searchable.includes(filter),
  );
}

function createSourceArtifactRecord(record: {
  accessStatus: 'GOLD' | 'GREEN' | 'HYBRID' | 'BRONZE' | 'CLOSED' | 'UNKNOWN';
  chunks?: Array<{
    artifactId: string;
    charEnd: number | null;
    charStart: number | null;
    chunkIndex: number;
    createdAt: Date;
    id: string;
    metadata: unknown;
    pageNumber: number | null;
    sourceLocator: string;
    sourceRecordId: string;
    text: string;
  }>;
  doi: string | null;
  extractionMethod: string;
  failureMessage: string | null;
  fileHash: string;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  importedAt: Date;
  ingestionStatus: string;
  license: string | null;
  localPath: string | null;
  metadataQuality: unknown;
  mimeType: string;
  pageCount: number | null;
  sourceRecordId: string;
  title: string | null;
  veracityScore: unknown;
}): SourceArtifact {
  return sourceArtifactSchema.parse({
    artifact_id: record.id,
    source_document_id: record.sourceRecordId,
    local_path: record.localPath,
    file_name: record.fileName,
    file_hash: record.fileHash,
    mime_type: record.mimeType,
    file_size_bytes: record.fileSizeBytes,
    page_count: record.pageCount,
    extraction_method: record.extractionMethod,
    ingestion_status: record.ingestionStatus === 'failed' ? 'failed' : 'parsed',
    title: record.title,
    doi: record.doi,
    license: record.license,
    access_status: record.accessStatus.toLowerCase(),
    metadata_quality: record.metadataQuality,
    veracity_score: record.veracityScore,
    failure_message: record.failureMessage,
    imported_at: record.importedAt.toISOString(),
    chunks: (record.chunks ?? []).map((chunk) => ({
      chunk_id: chunk.id,
      artifact_id: chunk.artifactId,
      source_document_id: chunk.sourceRecordId,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      text: chunk.text,
      source_locator: chunk.sourceLocator,
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
      metadata:
        chunk.metadata && typeof chunk.metadata === 'object'
          ? chunk.metadata
          : {},
      created_at: chunk.createdAt.toISOString(),
    })),
  });
}

function toCaseHistory(
  evaluations: EvaluationResponse[],
): CaseHistoryResponse | null {
  if (evaluations.length === 0) {
    return null;
  }

  const sorted = [...evaluations].sort((left, right) =>
    left.audit_record.timestamp.localeCompare(right.audit_record.timestamp),
  );
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];

  const evidenceRecords = Array.from(
    new Map(
      sorted
        .flatMap((evaluation) => evaluation.audit_record.typed_evidence)
        .map((record) => [record.evidence_id, record]),
    ).values(),
  );

  const auditEvents = sorted
    .flatMap((evaluation) => {
      const baseEvents = [
        {
          event_id: evaluation.audit_record.audit_id,
          case_id: evaluation.case_id,
          evaluation_id: evaluation.evaluation_id,
          event_type: 'evaluation_completed',
          actor_role: evaluation.audit_record.actor_role,
          actor_id: evaluation.audit_record.actor_id,
          payload: {
            confidence_level:
              evaluation.decision_output.confidence_and_uncertainty_summary
                .confidence_level,
            summary: evaluation.audit_record.summary,
            missing_data_count: evaluation.audit_record.missing_data_count,
            defaults_count: evaluation.audit_record.defaults_count,
          },
          created_at: evaluation.audit_record.timestamp,
        },
      ];

      if (!evaluation.simulation_enrichment) {
        return baseEvents;
      }

      return [
        ...baseEvents,
        {
          event_id: `${evaluation.audit_record.audit_id}:simulation`,
          case_id: evaluation.case_id,
          evaluation_id: evaluation.evaluation_id,
          event_type: `simulation_enrichment_${evaluation.simulation_enrichment.status}`,
          actor_role: evaluation.audit_record.actor_role,
          actor_id: evaluation.audit_record.actor_id,
          payload: {
            model_version: evaluation.simulation_enrichment.model_version,
            confidence_level: evaluation.simulation_enrichment.confidence.level,
            derived_observation_count:
              evaluation.simulation_enrichment.derived_observations.length,
            series_count: evaluation.simulation_enrichment.series.length,
            failure_detail: evaluation.simulation_enrichment.failure_detail,
          },
          created_at: evaluation.audit_record.timestamp,
        },
      ];
    })
    .sort((left, right) => left.created_at.localeCompare(right.created_at));

  return caseHistoryResponseSchema.parse({
    case: {
      case_id: latest.case_id,
      technology_family: latest.normalized_case.technology_family,
      architecture_family: latest.normalized_case.architecture_family,
      primary_objective: latest.normalized_case.primary_objective,
      raw_intake_snapshot: latest.audit_record.raw_input_snapshot,
      normalized_case: latest.normalized_case,
      defaults_used: latest.normalized_case.defaults_used,
      missing_data: latest.normalized_case.missing_data,
      assumptions: latest.normalized_case.assumptions,
      created_at: earliest.audit_record.timestamp,
      updated_at: latest.audit_record.timestamp,
    },
    evaluations: sorted.map((evaluation) => toEvaluationSummary(evaluation)),
    evidence_records: evidenceRecords,
    audit_events: auditEvents,
  });
}

export class MemoryEvaluationRepository implements EvaluationRepository {
  private readonly evaluations = new Map<string, EvaluationResponse>();
  private readonly evaluationsByIdempotencyKey = new Map<
    string,
    EvaluationResponse
  >();
  private readonly externalEvidenceCatalog = new Map<
    string,
    ExternalEvidenceCatalogItemDetail
  >();
  private readonly reportConversationSessions = new Map<string, string>();
  private readonly reportConversationTurns: ReportConversationTurn[] = [];

  constructor(options: MemoryEvaluationRepositoryOptions = {}) {
    for (const item of options.externalEvidenceCatalogItems ?? []) {
      this.externalEvidenceCatalog.set(item.id, item);
    }
  }

  async saveEvaluation(
    evaluation: EvaluationResponse,
  ): Promise<EvaluationResponse> {
    const normalizedEvaluation = attachLineageRuntimeVersions(evaluation);
    const idempotencyKey = evaluation.audit_record.idempotency_key?.trim();

    if (idempotencyKey) {
      const existing = this.evaluationsByIdempotencyKey.get(idempotencyKey);

      if (existing) {
        return existing;
      }
    }

    this.evaluations.set(
      normalizedEvaluation.evaluation_id,
      normalizedEvaluation,
    );

    if (idempotencyKey) {
      this.evaluationsByIdempotencyKey.set(
        idempotencyKey,
        normalizedEvaluation,
      );
    }

    return normalizedEvaluation;
  }

  async getEvaluation(
    evaluationId: string,
  ): Promise<EvaluationResponse | null> {
    return this.evaluations.get(evaluationId) ?? null;
  }

  async getEvaluationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<EvaluationResponse | null> {
    return this.evaluationsByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  async listEvaluations(
    input: EvaluationListInput = {},
  ): Promise<EvaluationListResponse> {
    return buildEvaluationListResponse(
      [...this.evaluations.values()].map((evaluation) =>
        toEvaluationSummary(evaluation),
      ),
      input,
    );
  }

  async getCaseHistory(caseId: string): Promise<CaseHistoryResponse | null> {
    const evaluations = [...this.evaluations.values()].filter(
      (evaluation) => evaluation.case_id === caseId,
    );

    return toCaseHistory(evaluations);
  }

  async getEvidenceBenchmarkSlice(
    input: EvidenceBenchmarkSliceInput = {},
  ): Promise<EvidenceBenchmarkSlice> {
    return {
      aggregates: [],
      evidence: [],
      summary: {
        aggregate_count: 0,
        evidence_count: 0,
        limited_to: input.limit ?? 0,
      },
    };
  }

  async listExternalEvidenceCatalog(
    input: ExternalEvidenceCatalogListInput = {},
  ): Promise<ExternalEvidenceCatalogListResponse> {
    const allItems = [...this.externalEvidenceCatalog.values()];
    const { page, pageSize, skip } = toCatalogPagination(input);
    const searchQuery = input.searchQuery?.trim().toLowerCase();
    const filteredItems = allItems
      .filter((item) => {
        if (input.reviewStatus && item.review_status !== input.reviewStatus) {
          return false;
        }

        if (input.sourceType && item.source_type !== input.sourceType) {
          return false;
        }

        if (!memoryCatalogItemMatchesTechnicalFilters(item, input)) {
          return false;
        }

        if (!searchQuery) {
          return true;
        }

        return [
          item.title,
          item.summary,
          item.publisher ?? '',
          item.doi ?? '',
          item.tags.join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery);
      })
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));

    const pagedItems = filteredItems.slice(skip, skip + pageSize);
    const filteredTotal = filteredItems.length;
    const warehouseAggregate = buildExternalEvidenceWarehouseAggregate(
      filteredItems.map((item) => ({
        evidence_type: item.evidence_type,
        review_status: item.review_status,
        source_type: item.source_type,
        publisher: item.publisher,
        doi: item.doi,
        source_url: item.source_url,
        claim_count: item.claim_count,
        metadata_quality_level: item.metadata_quality?.level ?? null,
        reviewed_claim_count: item.reviewed_claim_count,
        veracity_level: item.veracity_score?.level ?? null,
      })),
      pagedItems.length,
    );

    return externalEvidenceCatalogListResponseSchema.parse({
      items: pagedItems,
      summary: {
        total: allItems.length,
        catalog_total: allItems.length,
        filtered_total: filteredTotal,
        pending: allItems.filter((item) => item.review_status === 'pending')
          .length,
        pending_review: allItems.filter(
          (item) => item.review_status === 'pending',
        ).length,
        accepted: allItems.filter((item) => item.review_status === 'accepted')
          .length,
        rejected: allItems.filter((item) => item.review_status === 'rejected')
          .length,
        failed_ingestion: 0,
        duplicate_skipped: 0,
        canonical_processed: 0,
        canonical_extracted: 0,
        canonical_insufficient_source: 0,
        canonical_needs_full_text: 0,
        canonical_needs_review: 0,
        canonical_failed: 0,
        canonical_facts: 0,
        benchmark_ready_facts: 0,
        benchmark_aggregates: 0,
        last_ingestion_batch: null,
        ingestion_progress: null,
        canonicalization_progress: null,
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
        returned: pagedItems.length,
      },
      warehouse_aggregate: warehouseAggregate,
    });
  }

  async getExternalEvidenceCatalogItem(
    catalogItemId: string,
  ): Promise<ExternalEvidenceCatalogItemDetail | null> {
    return (
      externalEvidenceCatalogDetailSchema.safeParse(
        this.externalEvidenceCatalog.get(catalogItemId),
      ).data ?? null
    );
  }

  async reviewExternalEvidenceCatalogItem(
    input: ReviewExternalEvidenceCatalogItemInput,
  ): Promise<ExternalEvidenceCatalogItemDetail | null> {
    const current = this.externalEvidenceCatalog.get(input.catalogItemId);

    if (!current) {
      return null;
    }

    const updated = externalEvidenceCatalogDetailSchema.parse({
      ...current,
      review_status: input.action === 'accept' ? 'accepted' : 'rejected',
      source_state: 'reviewed',
      claims:
        input.action === 'accept'
          ? current.claims.map((claim) => ({
              ...claim,
              reviews:
                claim.reviews.length > 0
                  ? claim.reviews
                  : [
                      {
                        id: randomUUID(),
                        status: 'accepted',
                        analyst_id: input.actorId ?? null,
                        analyst_role: input.actorRole,
                        analyst_note:
                          input.note ??
                          'Catalog item accepted; claim review state synchronized.',
                        reviewed_at: new Date().toISOString(),
                      },
                    ],
            }))
          : current.claims,
      reviewed_claim_count:
        input.action === 'accept'
          ? current.claims.length
          : current.reviewed_claim_count,
      updated_at: new Date().toISOString(),
    });

    this.externalEvidenceCatalog.set(updated.id, updated);

    return updated;
  }

  async reviewExternalEvidenceCatalogItems(
    input: ReviewExternalEvidenceCatalogItemsInput,
  ): Promise<ExternalEvidenceBulkReviewResponse> {
    const attemptedIds = normalizeCatalogItemIds(input.catalogItemIds);
    const failed: ExternalEvidenceBulkReviewResponse['failed'] = [];
    const succeededIds: string[] = [];

    for (const catalogItemId of attemptedIds) {
      const updated = await this.reviewExternalEvidenceCatalogItem({
        catalogItemId,
        action: input.action,
        actorRole: input.actorRole,
        actorId: input.actorId,
        note: input.note,
      });

      if (!updated) {
        failed.push(buildMissingCatalogItemFailure(catalogItemId));
        continue;
      }

      succeededIds.push(updated.id);
    }

    return externalEvidenceBulkReviewResponseSchema.parse({
      action: input.action,
      attempted_ids: attemptedIds,
      succeeded_ids: succeededIds,
      failed,
      note: input.note?.trim() || undefined,
    });
  }

  async saveReportConversationTurn(
    input: SaveReportConversationTurnInput,
  ): Promise<ReportConversationTurn> {
    const createdAt = new Date();
    const turn = reportConversationTurnSchema.parse({
      turn_id: randomUUID(),
      conversation_id: input.conversationId,
      actor: input.actor,
      message: input.message,
      selected_section: input.selectedSection ?? null,
      created_at: createdAt.toISOString(),
    });

    this.reportConversationSessions.set(
      input.conversationId,
      input.evaluationId,
    );
    this.reportConversationTurns.push(turn);

    return turn;
  }

  async listRecentReportConversationTurns(
    input: ListRecentReportConversationTurnsInput,
  ): Promise<ReportConversationTurn[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 12, 12));
    const evaluationId = this.reportConversationSessions.get(
      input.conversationId,
    );

    if (evaluationId !== input.evaluationId) {
      return [];
    }

    return this.reportConversationTurns
      .filter((turn) => turn.conversation_id === input.conversationId)
      .slice(-limit);
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

export class PrismaEvaluationRepository implements EvaluationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveEvaluation(
    evaluation: EvaluationResponse,
  ): Promise<EvaluationResponse> {
    return withSpan(
      'database.evaluation.save',
      async () => {
        const normalizedCase = toPrismaJsonObject(evaluation.normalized_case);
        const rawIntakeSnapshot = toPrismaJsonObject(
          evaluation.audit_record.raw_input_snapshot,
        );
        const decisionOutput = toPrismaJsonObject(evaluation.decision_output);
        const auditRecord = toPrismaJsonObject(evaluation.audit_record);
        const supplierPlan = deriveSupplierPersistencePlan(evaluation);
        const idempotencyKey = evaluation.audit_record.idempotency_key?.trim();

        try {
          await this.prisma.$transaction(async (tx) => {
            const database = tx as Prisma.TransactionClient;

            await database.caseRecord.upsert({
              where: { id: evaluation.case_id },
              update: {
                technologyFamily: evaluation.normalized_case.technology_family,
                architectureFamily:
                  evaluation.normalized_case.architecture_family,
                primaryObjective: evaluation.normalized_case.primary_objective,
                rawIntakeSnapshot,
                normalizedCase,
                defaultsUsed: evaluation.normalized_case.defaults_used,
                missingData: evaluation.normalized_case.missing_data,
                assumptions: evaluation.normalized_case.assumptions,
                typedEvidence: toRequiredPrismaJsonValue(
                  evaluation.audit_record.typed_evidence,
                ),
                supplierContext: toPrismaJsonObject(
                  evaluation.normalized_case.cross_cutting_layers
                    .risk_and_maturity.supplier_context,
                ),
                createdBy: evaluation.audit_record.actor_id,
              },
              create: {
                id: evaluation.case_id,
                technologyFamily: evaluation.normalized_case.technology_family,
                architectureFamily:
                  evaluation.normalized_case.architecture_family,
                primaryObjective: evaluation.normalized_case.primary_objective,
                rawIntakeSnapshot,
                normalizedCase,
                defaultsUsed: evaluation.normalized_case.defaults_used,
                missingData: evaluation.normalized_case.missing_data,
                assumptions: evaluation.normalized_case.assumptions,
                typedEvidence: toRequiredPrismaJsonValue(
                  evaluation.audit_record.typed_evidence,
                ),
                supplierContext: toPrismaJsonObject(
                  evaluation.normalized_case.cross_cutting_layers
                    .risk_and_maturity.supplier_context,
                ),
                createdBy: evaluation.audit_record.actor_id,
              },
            });

            await database.evaluationRecord.create({
              data: {
                id: evaluation.evaluation_id,
                caseId: evaluation.case_id,
                idempotencyKey: idempotencyKey ?? null,
                decisionOutput,
                auditRecord,
                narrative: evaluation.narrative,
                narrativeMetadata: toPrismaJsonObject(
                  evaluation.narrative_metadata,
                ),
                confidenceLevel:
                  evaluation.decision_output.confidence_and_uncertainty_summary
                    .confidence_level,
                provenanceSummary: toPrismaJsonObject({
                  provenance_notes:
                    evaluation.decision_output
                      .confidence_and_uncertainty_summary.provenance_notes,
                  agent_pipeline_trace:
                    evaluation.audit_record.agent_pipeline_trace,
                }),
                scoringSummary: toPrismaJsonObject({
                  sensitivity_level:
                    evaluation.decision_output
                      .confidence_and_uncertainty_summary.sensitivity_level,
                  recommendation_scores:
                    evaluation.decision_output.prioritized_improvement_options.map(
                      (recommendation) => ({
                        recommendation_id: recommendation.recommendation_id,
                        priority_score: recommendation.priority_score ?? null,
                      }),
                    ),
                }),
                defaultsUsed: evaluation.normalized_case.defaults_used,
                missingData: evaluation.normalized_case.missing_data,
                assumptions: evaluation.normalized_case.assumptions,
              },
            });

            if (evaluation.evidence_decision_context) {
              await database.evidenceDecisionContextRecord.create({
                data: {
                  evaluationId: evaluation.evaluation_id,
                  caseId: evaluation.case_id,
                  contextVersion: 'evidence_decision_context.v1',
                  builderVersion:
                    evaluation.evidence_decision_context.builder_version,
                  systemType: evaluation.evidence_decision_context.system_type,
                  primaryObjective:
                    evaluation.evidence_decision_context.primary_objective,
                  query: toPrismaJsonObject(
                    evaluation.evidence_decision_context.query,
                  ),
                  benchmarkRanges: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context.benchmark_ranges,
                  ),
                  matchedEvidence: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context.matched_evidence,
                  ),
                  materialComparisons: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context.material_comparisons,
                  ),
                  operatingWindowSignals: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context
                      .operating_window_signals,
                  ),
                  failureModeSignals: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context.failure_mode_signals,
                  ),
                  costSignals: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context.cost_signals,
                  ),
                  supplierSignals: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context.supplier_signals,
                  ),
                  regulatorySocialSignals: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context
                      .regulatory_social_signals,
                  ),
                  uncertaintySummary: toPrismaJsonObject(
                    evaluation.evidence_decision_context.uncertainty_summary,
                  ),
                  excludedEvidenceSummary: toRequiredPrismaJsonValue(
                    evaluation.evidence_decision_context
                      .excluded_evidence_summary,
                  ),
                  sourceRefs: evaluation.evidence_decision_context.source_refs,
                  provenanceNote:
                    evaluation.evidence_decision_context.provenance_note,
                  payload: toPrismaJsonObject(
                    evaluation.evidence_decision_context,
                  ),
                },
              });
            }

            if (evaluation.simulation_enrichment) {
              await database.simulationArtifactRecord.create({
                data: {
                  evaluationId: evaluation.evaluation_id,
                  status: evaluation.simulation_enrichment.status,
                  modelVersion: evaluation.simulation_enrichment.model_version,
                  inputSnapshot: toPrismaJsonObject(
                    evaluation.simulation_enrichment.input_snapshot,
                  ),
                  derivedObservations: toRequiredPrismaJsonValue(
                    evaluation.simulation_enrichment.derived_observations,
                  ),
                  series: toRequiredPrismaJsonValue(
                    evaluation.simulation_enrichment.series,
                  ),
                  assumptions: toRequiredPrismaJsonValue(
                    evaluation.simulation_enrichment.assumptions,
                  ),
                  confidence: toPrismaJsonObject(
                    evaluation.simulation_enrichment.confidence,
                  ),
                  provenance: toPrismaJsonObject(
                    evaluation.simulation_enrichment.provenance,
                  ),
                  failureDetail: evaluation.simulation_enrichment.failure_detail
                    ? toPrismaJsonObject(
                        evaluation.simulation_enrichment.failure_detail,
                      )
                    : Prisma.JsonNull,
                },
              });
            }

            const catalogItemIds =
              extractCatalogEvidenceIdsFromEvaluation(evaluation);

            if (catalogItemIds.length > 0) {
              const catalogItems =
                await database.externalEvidenceCatalogItem.findMany({
                  where: {
                    id: { in: catalogItemIds },
                  },
                  select: {
                    id: true,
                    evidenceType: true,
                    sourceRecordId: true,
                    sourceRecord: {
                      select: { sourceType: true },
                    },
                    claims: {
                      select: { id: true },
                    },
                  },
                });

              if (catalogItems.length > 0) {
                await database.evaluationSourceUsage.createMany({
                  data: catalogItems.map((catalogItem) => ({
                    evaluationId: evaluation.evaluation_id,
                    sourceRecordId: catalogItem.sourceRecordId,
                    usageType: toEvaluationSourceUsageType({
                      sourceType: catalogItem.sourceRecord.sourceType,
                      evidenceType: catalogItem.evidenceType,
                    }),
                    note: acceptedCatalogEvidenceUsageNote,
                  })),
                  skipDuplicates: true,
                });

                const claimUsageRows = catalogItems.flatMap((catalogItem) => {
                  const sourceUsageType = toEvaluationSourceUsageType({
                    sourceType: catalogItem.sourceRecord.sourceType,
                    evidenceType: catalogItem.evidenceType,
                  });

                  return catalogItem.claims.map((claim) => ({
                    evaluationId: evaluation.evaluation_id,
                    claimId: claim.id,
                    usageType: toEvaluationClaimUsageType(sourceUsageType),
                    note: acceptedCatalogEvidenceUsageNote,
                  }));
                });

                if (claimUsageRows.length > 0) {
                  await database.evaluationClaimUsage.createMany({
                    data: claimUsageRows,
                    skipDuplicates: true,
                  });
                }
              }
            }

            const researchEvidenceReferences =
              extractResearchEvidenceReferencesFromEvaluation(evaluation);

            if (researchEvidenceReferences.length > 0) {
              const sourceRecords =
                await database.externalSourceRecord.findMany({
                  where: {
                    id: {
                      in: researchEvidenceReferences.map(
                        (entry) => entry.sourceDocumentId,
                      ),
                    },
                  },
                  select: {
                    id: true,
                    sourceType: true,
                  },
                });

              if (sourceRecords.length > 0) {
                const evidenceTypeBySourceId = new Map(
                  researchEvidenceReferences.map((entry) => [
                    entry.sourceDocumentId,
                    entry.evidenceType,
                  ]),
                );

                await database.evaluationSourceUsage.createMany({
                  data: sourceRecords.map((sourceRecord) => ({
                    evaluationId: evaluation.evaluation_id,
                    sourceRecordId: sourceRecord.id,
                    usageType: toEvaluationSourceUsageType({
                      sourceType: sourceRecord.sourceType,
                      evidenceType:
                        evidenceTypeBySourceId.get(sourceRecord.id) ??
                        'literature_evidence',
                    }),
                    note: attachedResearchEvidenceUsageNote,
                  })),
                  skipDuplicates: true,
                });

                const claims = await database.evidenceClaim.findMany({
                  where: {
                    sourceRecordId: {
                      in: sourceRecords.map((sourceRecord) => sourceRecord.id),
                    },
                  },
                  select: {
                    id: true,
                    sourceRecordId: true,
                  },
                });

                if (claims.length > 0) {
                  const sourceTypeById = new Map(
                    sourceRecords.map((sourceRecord) => [
                      sourceRecord.id,
                      sourceRecord.sourceType,
                    ]),
                  );
                  await database.evaluationClaimUsage.createMany({
                    data: claims.map((claim) => {
                      const sourceUsageType = toEvaluationSourceUsageType({
                        sourceType:
                          sourceTypeById.get(claim.sourceRecordId) ?? 'MANUAL',
                        evidenceType:
                          evidenceTypeBySourceId.get(claim.sourceRecordId) ??
                          'literature_evidence',
                      });

                      return {
                        evaluationId: evaluation.evaluation_id,
                        claimId: claim.id,
                        usageType: toEvaluationClaimUsageType(sourceUsageType),
                        note: attachedResearchEvidenceUsageNote,
                      };
                    }),
                    skipDuplicates: true,
                  });
                }
              }
            }

            const workspaceSnapshots = buildWorkspaceSnapshots(evaluation);
            await database.workspaceSnapshotRecord.createMany({
              data: workspaceSnapshots.map((snapshot) => ({
                evaluationId: snapshot.evaluationId,
                snapshotType: snapshot.snapshotType,
                payload: toRequiredPrismaJsonValue(snapshot.payload),
              })),
            });

            const supplierIds = new Map<string, string>();

            for (const supplier of supplierPlan.suppliers) {
              const record = await database.supplier.upsert({
                where: { normalizedName: supplier.normalizedName },
                update: {
                  displayName: supplier.displayName,
                  category: supplier.category ?? undefined,
                  region: supplier.region ?? undefined,
                  metadata: toPrismaJsonObject(supplier.metadata),
                },
                create: {
                  normalizedName: supplier.normalizedName,
                  displayName: supplier.displayName,
                  category: supplier.category,
                  region: supplier.region,
                  metadata: toPrismaJsonObject(supplier.metadata),
                },
                select: {
                  id: true,
                  normalizedName: true,
                },
              });

              supplierIds.set(record.normalizedName, record.id);
            }

            await database.caseSupplierPreference.deleteMany({
              where: { caseId: evaluation.case_id },
            });

            if (supplierPlan.casePreferences.length > 0) {
              await database.caseSupplierPreference.createMany({
                data: supplierPlan.casePreferences.map((entry) => ({
                  caseId: evaluation.case_id,
                  supplierId: entry.supplierNormalizedName
                    ? (supplierIds.get(entry.supplierNormalizedName) ?? null)
                    : null,
                  supplierLabel: entry.supplierLabel,
                  preferenceType: entry.preferenceType,
                  note: entry.note,
                  sourceState: entry.sourceState,
                })),
              });
            }

            if (supplierPlan.shortlistItems.length > 0) {
              await database.supplierShortlistItem.createMany({
                data: supplierPlan.shortlistItems.map((entry) => ({
                  evaluationId: evaluation.evaluation_id,
                  supplierId: entry.supplierNormalizedName
                    ? (supplierIds.get(entry.supplierNormalizedName) ?? null)
                    : null,
                  candidateLabel: entry.candidateLabel,
                  category: entry.category,
                  fitNote: entry.fitNote,
                  missingInformation: toRequiredPrismaJsonValue(
                    entry.missingInformation,
                  ),
                  reviewStatus: entry.reviewStatus,
                })),
              });
            }

            const evidenceLinksById = new Map(
              supplierPlan.evidenceLinks.map((entry) => [
                entry.evidenceId,
                entry.supplierNormalizedName,
              ]),
            );

            for (const evidenceRecord of evaluation.audit_record
              .typed_evidence) {
              const storageEvidenceId = `${evaluation.case_id}:${evidenceRecord.evidence_id}`;
              const supplierNormalizedName = evidenceLinksById.get(
                evidenceRecord.evidence_id,
              );

              await database.evidenceRecord.upsert({
                where: { id: storageEvidenceId },
                update: {
                  evidenceType: evidenceRecord.evidence_type,
                  title: evidenceRecord.title,
                  strengthLevel: evidenceRecord.strength_level,
                  supplierName: evidenceRecord.supplier_name,
                  supplierId: supplierNormalizedName
                    ? (supplierIds.get(supplierNormalizedName) ?? null)
                    : null,
                  payload: toPrismaJsonObject(evidenceRecord),
                },
                create: {
                  id: storageEvidenceId,
                  caseId: evaluation.case_id,
                  evidenceType: evidenceRecord.evidence_type,
                  title: evidenceRecord.title,
                  strengthLevel: evidenceRecord.strength_level,
                  supplierName: evidenceRecord.supplier_name,
                  supplierId: supplierNormalizedName
                    ? (supplierIds.get(supplierNormalizedName) ?? null)
                    : null,
                  payload: toPrismaJsonObject(evidenceRecord),
                },
              });
            }

            await database.auditEvent.create({
              data: {
                id: evaluation.audit_record.audit_id,
                caseId: evaluation.case_id,
                evaluationId: evaluation.evaluation_id,
                eventType: 'evaluation_completed',
                actorRole: evaluation.audit_record.actor_role,
                actorId: evaluation.audit_record.actor_id,
                payload: toPrismaJsonObject({
                  summary: evaluation.audit_record.summary,
                  confidence_level:
                    evaluation.decision_output
                      .confidence_and_uncertainty_summary.confidence_level,
                  missing_data_count:
                    evaluation.audit_record.missing_data_count,
                  defaults_count: evaluation.audit_record.defaults_count,
                  runtime_versions: evaluation.audit_record.runtime_versions,
                  traceability: evaluation.audit_record.traceability,
                }),
              },
            });

            if (evaluation.simulation_enrichment) {
              await database.auditEvent.create({
                data: {
                  id: randomUUID(),
                  caseId: evaluation.case_id,
                  evaluationId: evaluation.evaluation_id,
                  eventType: `simulation_enrichment_${evaluation.simulation_enrichment.status}`,
                  actorRole: evaluation.audit_record.actor_role,
                  actorId: evaluation.audit_record.actor_id,
                  payload: toPrismaJsonObject({
                    model_version:
                      evaluation.simulation_enrichment.model_version,
                    confidence_level:
                      evaluation.simulation_enrichment.confidence.level,
                    derived_observation_count:
                      evaluation.simulation_enrichment.derived_observations
                        .length,
                    series_count:
                      evaluation.simulation_enrichment.series.length,
                    failure_detail:
                      evaluation.simulation_enrichment.failure_detail,
                  }),
                },
              });
            }
          }, PRISMA_TRANSACTION_OPTIONS);
        } catch (error) {
          if (
            idempotencyKey &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            const existing =
              await this.getEvaluationByIdempotencyKey(idempotencyKey);

            if (existing) {
              return existing;
            }
          }

          throw error;
        }

        return evaluation;
      },
      {
        case_id: evaluation.case_id,
        evaluation_id: evaluation.evaluation_id,
      },
    );
  }

  async getEvaluation(
    evaluationId: string,
  ): Promise<EvaluationResponse | null> {
    return withSpan(
      'database.evaluation.get',
      async () => {
        const record = await this.prisma.evaluationRecord.findUnique({
          where: { id: evaluationId },
          include: {
            case: true,
            evidenceDecisionContext: true,
            simulationArtifact: true,
            sourceUsages: true,
            claimUsages: true,
            workspaceSnapshots: true,
          },
        });

        if (!record) {
          return null;
        }

        return attachLineageRuntimeVersions(
          evaluationResponseSchema.parse({
            evaluation_id: record.id,
            case_id: record.caseId,
            normalized_case: record.case.normalizedCase,
            decision_output: record.decisionOutput,
            audit_record: record.auditRecord,
            evidence_decision_context:
              record.evidenceDecisionContext?.payload ??
              (record.auditRecord as Record<string, unknown>)
                .evidence_decision_context ??
              null,
            narrative: record.narrative,
            narrative_metadata: record.narrativeMetadata,
            simulation_enrichment: record.simulationArtifact
              ? fromSimulationArtifactRecord(record.simulationArtifact)
              : undefined,
            source_usages: record.sourceUsages.map((usage) =>
              createEvaluationSourceUsage(usage),
            ),
            claim_usages: record.claimUsages.map((usage) =>
              createEvaluationClaimUsage(usage),
            ),
            workspace_snapshots: record.workspaceSnapshots.map((snapshot) =>
              createWorkspaceSnapshotRecord(snapshot),
            ),
          }),
        );
      },
      { evaluation_id: evaluationId },
    );
  }

  async getEvaluationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<EvaluationResponse | null> {
    return withSpan(
      'database.evaluation.get_by_idempotency',
      async () => {
        const record = await this.prisma.evaluationRecord.findUnique({
          where: { idempotencyKey },
          include: {
            case: true,
            evidenceDecisionContext: true,
            simulationArtifact: true,
            sourceUsages: true,
            claimUsages: true,
            workspaceSnapshots: true,
          },
        });

        if (!record) {
          return null;
        }

        return attachLineageRuntimeVersions(
          evaluationResponseSchema.parse({
            evaluation_id: record.id,
            case_id: record.caseId,
            normalized_case: record.case.normalizedCase,
            decision_output: record.decisionOutput,
            audit_record: record.auditRecord,
            evidence_decision_context:
              record.evidenceDecisionContext?.payload ??
              (record.auditRecord as Record<string, unknown>)
                .evidence_decision_context ??
              null,
            narrative: record.narrative,
            narrative_metadata: record.narrativeMetadata,
            simulation_enrichment: record.simulationArtifact
              ? fromSimulationArtifactRecord(record.simulationArtifact)
              : undefined,
            source_usages: record.sourceUsages.map((usage) =>
              createEvaluationSourceUsage(usage),
            ),
            claim_usages: record.claimUsages.map((usage) =>
              createEvaluationClaimUsage(usage),
            ),
            workspace_snapshots: record.workspaceSnapshots.map((snapshot) =>
              createWorkspaceSnapshotRecord(snapshot),
            ),
          }),
        );
      },
      { idempotency_key: idempotencyKey },
    );
  }

  async listEvaluations(
    input: EvaluationListInput = {},
  ): Promise<EvaluationListResponse> {
    return withSpan('database.evaluation.list', async () => {
      const records = await this.prisma.evaluationRecord.findMany({
        include: { case: true, simulationArtifact: true },
        orderBy: { createdAt: 'desc' },
      });

      const items: EvaluationListResponse['items'] = records.map((record) => ({
        evaluation_id: record.id,
        case_id: record.caseId,
        created_at: record.createdAt.toISOString(),
        confidence_level:
          record.confidenceLevel as EvaluationListResponse['items'][number]['confidence_level'],
        technology_family: record.case
          .technologyFamily as EvaluationListResponse['items'][number]['technology_family'],
        primary_objective: record.case
          .primaryObjective as EvaluationListResponse['items'][number]['primary_objective'],
        summary:
          (record.decisionOutput as Record<string, Record<string, string>>)
            .current_stack_diagnosis?.summary ?? 'Evaluation completed',
        narrative_available: Boolean(record.narrative),
        simulation_summary: record.simulationArtifact
          ? toSimulationSummaryFromArtifact(record.simulationArtifact)
          : undefined,
      }));

      return buildEvaluationListResponse(items, input);
    });
  }

  async getCaseHistory(caseId: string): Promise<CaseHistoryResponse | null> {
    return withSpan(
      'database.case.history',
      async () => {
        const caseRecord = await this.prisma.caseRecord.findUnique({
          where: { id: caseId },
          include: {
            evaluations: {
              include: { simulationArtifact: true },
              orderBy: { createdAt: 'asc' },
            },
            evidenceRecords: true,
            auditEvents: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        if (!caseRecord) {
          return null;
        }

        return caseHistoryResponseSchema.parse({
          case: {
            case_id: caseRecord.id,
            technology_family: caseRecord.technologyFamily,
            architecture_family: caseRecord.architectureFamily,
            primary_objective: caseRecord.primaryObjective,
            raw_intake_snapshot: caseRecord.rawIntakeSnapshot,
            normalized_case: caseRecord.normalizedCase,
            defaults_used: caseRecord.defaultsUsed,
            missing_data: caseRecord.missingData,
            assumptions: caseRecord.assumptions,
            created_at: caseRecord.createdAt.toISOString(),
            updated_at: caseRecord.updatedAt.toISOString(),
          },
          evaluations: caseRecord.evaluations.map((record) => ({
            evaluation_id: record.id,
            case_id: record.caseId,
            created_at: record.createdAt.toISOString(),
            confidence_level: record.confidenceLevel,
            technology_family: caseRecord.technologyFamily,
            primary_objective: caseRecord.primaryObjective,
            summary:
              (record.decisionOutput as Record<string, Record<string, string>>)
                .current_stack_diagnosis?.summary ?? 'Evaluation completed',
            narrative_available: Boolean(record.narrative),
            simulation_summary: record.simulationArtifact
              ? toSimulationSummaryFromArtifact(record.simulationArtifact)
              : undefined,
          })),
          evidence_records: caseRecord.evidenceRecords.map(
            (record) => record.payload,
          ),
          audit_events: caseRecord.auditEvents.map((event) => ({
            event_id: event.id,
            case_id: event.caseId,
            evaluation_id: event.evaluationId,
            event_type: event.eventType,
            actor_role: event.actorRole,
            actor_id: event.actorId,
            payload: event.payload,
            created_at: event.createdAt.toISOString(),
          })),
        });
      },
      { case_id: caseId },
    );
  }

  async getEvidenceBenchmarkSlice(
    input: EvidenceBenchmarkSliceInput = {},
  ): Promise<EvidenceBenchmarkSlice> {
    return withSpan(
      'database.evidence_benchmark.slice',
      async () => {
        const limit = Math.min(50, Math.max(1, Math.trunc(input.limit ?? 12)));
        const stringIn = (values: string[] | undefined) =>
          values?.map((value) => value.trim()).filter(Boolean);
        const metricTypes = stringIn(input.metricTypes);
        const materials = stringIn(input.materials);
        const componentTypes = stringIn(input.componentTypes);
        const aggregateSystemType = input.systemType
          ? { equals: input.systemType, mode: 'insensitive' as const }
          : undefined;
        const aggregateApplication = input.application
          ? { equals: input.application, mode: 'insensitive' as const }
          : undefined;
        const aggregateMetricType =
          metricTypes && metricTypes.length > 0
            ? { in: metricTypes, mode: 'insensitive' as const }
            : undefined;
        const aggregateMaterial =
          materials && materials.length > 0
            ? { in: materials, mode: 'insensitive' as const }
            : undefined;
        const aggregateComponentType =
          componentTypes && componentTypes.length > 0
            ? { in: componentTypes, mode: 'insensitive' as const }
            : undefined;
        const aggregateWhere: Prisma.EvidenceBenchmarkAggregateWhereInput = {
          systemType: aggregateSystemType,
          application: aggregateApplication,
          metricType: aggregateMetricType,
          material: aggregateMaterial,
          componentType: aggregateComponentType,
        };
        const recordWhere: Prisma.EvidenceBenchmarkRecordWhereInput = {
          decisionReady: true,
          systemType: aggregateSystemType,
          application: aggregateApplication,
          metricType: aggregateMetricType,
          material: aggregateMaterial,
          componentType: aggregateComponentType,
        };
        const [aggregates, evidence] = await this.prisma.$transaction([
          this.prisma.evidenceBenchmarkAggregate.findMany({
            where: aggregateWhere,
            orderBy: [{ recordCount: 'desc' }, { updatedAt: 'desc' }],
            take: limit,
          }),
          this.prisma.evidenceBenchmarkRecord.findMany({
            where: recordWhere,
            include: {
              catalogItem: {
                select: {
                  title: true,
                },
              },
              sourceRecord: {
                select: {
                  doi: true,
                  sourceUrl: true,
                  publicationYear: true,
                },
              },
            },
            orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
            take: limit,
          }),
        ]);

        return {
          aggregates: aggregates.map((record) => ({
            canonical_key: record.canonicalKey,
            metric_type: record.metricType,
            normalized_unit: record.normalizedUnit,
            system_type: record.systemType,
            application: record.application,
            component_type: record.componentType,
            material: record.material,
            publication_year: record.publicationYear,
            evidence_quality: record.evidenceQuality,
            record_count: record.recordCount,
            min_value: record.minValue,
            p25_value: record.p25Value,
            median_value: record.medianValue,
            p75_value: record.p75Value,
            p90_value: record.p90Value,
            max_value: record.maxValue,
            mean_value: record.meanValue,
            confidence_coverage: record.confidenceCoverage,
          })),
          evidence: evidence.map((record) => ({
            catalog_item_id: record.catalogItemId,
            source_record_id: record.sourceRecordId,
            title: record.catalogItem.title,
            doi: record.sourceRecord.doi,
            source_url: record.sourceRecord.sourceUrl,
            canonical_key: record.canonicalKey,
            metric_type: record.metricType,
            normalized_value: record.normalizedValue,
            normalized_unit: record.normalizedUnit,
            material: record.material,
            component_type: record.componentType,
            confidence: record.confidence,
            publication_year: record.sourceRecord.publicationYear,
          })),
          summary: {
            aggregate_count: aggregates.length,
            evidence_count: evidence.length,
            limited_to: limit,
          },
        };
      },
      {
        system_type: input.systemType ?? 'all',
        application: input.application ?? 'all',
      },
    );
  }

  async listExternalEvidenceCatalog(
    input: ExternalEvidenceCatalogListInput = {},
  ): Promise<ExternalEvidenceCatalogListResponse> {
    return withSpan(
      'database.external_evidence.list',
      async () => {
        const reviewStatus = input.reviewStatus
          ? toDatabaseExternalEvidenceReviewStatus(input.reviewStatus)
          : undefined;
        const sourceType = input.sourceType
          ? toDatabaseExternalEvidenceSourceType(input.sourceType)
          : undefined;
        const { page, pageSize, skip } = toCatalogPagination(input);
        const searchQuery = input.searchQuery?.trim();
        const scientificFactFilters =
          input.systemType ||
          input.componentType ||
          input.material ||
          input.metricType ||
          input.decisionReady !== undefined
            ? {
                some: {
                  factLayer:
                    input.decisionReady === true
                      ? canonicalScientificFactLayer
                      : undefined,
                  decisionReady:
                    input.decisionReady !== undefined
                      ? input.decisionReady
                      : undefined,
                  systemType: input.systemType
                    ? { equals: input.systemType, mode: 'insensitive' as const }
                    : undefined,
                  componentType: input.componentType
                    ? {
                        equals: input.componentType,
                        mode: 'insensitive' as const,
                      }
                    : undefined,
                  material: input.material
                    ? { contains: input.material, mode: 'insensitive' as const }
                    : undefined,
                  metricType: input.metricType
                    ? {
                        equals: input.metricType,
                        mode: 'insensitive' as const,
                      }
                    : undefined,
                },
              }
            : undefined;
        const where: Prisma.ExternalEvidenceCatalogItemWhereInput = {
          reviewStatus,
          scientificFacts: scientificFactFilters,
          sourceRecord: sourceType
            ? {
                is: {
                  sourceType,
                },
              }
            : undefined,
          OR: searchQuery
            ? [
                {
                  title: { contains: searchQuery, mode: 'insensitive' },
                },
                {
                  summary: { contains: searchQuery, mode: 'insensitive' },
                },
                {
                  sourceRecord: {
                    is: {
                      doi: { contains: searchQuery, mode: 'insensitive' },
                    },
                  },
                },
                {
                  sourceRecord: {
                    is: {
                      publisher: {
                        contains: searchQuery,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ]
            : undefined,
        };
        const sourceRecordFacetWhere: Prisma.ExternalSourceRecordWhereInput = {
          catalogEvidenceItems: {
            some: where,
          },
        };
        const withSourceRecordCondition = (
          sourceRecordWhere: Prisma.ExternalSourceRecordWhereInput,
        ): Prisma.ExternalEvidenceCatalogItemWhereInput => ({
          AND: [
            where,
            {
              sourceRecord: {
                is: sourceRecordWhere,
              },
            },
          ],
        });

        const [
          records,
          total,
          filteredTotal,
          pendingTotal,
          acceptedTotal,
          rejectedTotal,
          failedIngestionTotal,
          duplicateSkippedTotal,
          lastIngestionRun,
          activeIngestionRun,
          latestCanonicalizationRun,
          activeCanonicalizationRun,
          canonicalFactTotal,
          benchmarkReadyFactTotal,
          benchmarkAggregateTotal,
          canonicalExtractionStatusGroups,
          sourceTypeFacetGroups,
          evidenceTypeFacetGroups,
          reviewStatusFacetGroups,
          publisherFacetGroups,
          qualityFacetGroups,
          claimCountAggregate,
          reviewedClaimTotal,
          doiTotal,
          linkedSourceTotal,
        ] = await this.prisma.$transaction(
          async (tx) =>
            Promise.all([
              tx.externalEvidenceCatalogItem.findMany({
                where,
                include: {
                  sourceRecord: {
                    select: {
                      sourceType: true,
                      sourceUrl: true,
                      sourceCategory: true,
                      doi: true,
                      publisher: true,
                      publishedAt: true,
                    },
                  },
                  claims: {
                    where: {
                      reviews: {
                        some: {
                          status: {
                            not: 'PENDING',
                          },
                        },
                      },
                    },
                    select: {
                      id: true,
                    },
                  },
                },
                orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: pageSize,
              }),
              tx.externalEvidenceCatalogItem.count(),
              tx.externalEvidenceCatalogItem.count({ where }),
              tx.externalEvidenceCatalogItem.count({
                where: { reviewStatus: 'PENDING' },
              }),
              tx.externalEvidenceCatalogItem.count({
                where: { reviewStatus: 'ACCEPTED' },
              }),
              tx.externalEvidenceCatalogItem.count({
                where: { reviewStatus: 'REJECTED' },
              }),
              tx.evidenceIngestionAudit.count({
                where: { eventType: 'evidence_ingestion_failed' },
              }),
              tx.evidenceDuplicateDecision.count({
                where: { decision: 'skipped_duplicate' },
              }),
              tx.ingestionRun.findFirst({
                orderBy: [{ updatedAt: 'desc' }],
                select: {
                  id: true,
                  targetTotal: true,
                  recordsFetched: true,
                  recordsStored: true,
                  recordsFailed: true,
                  duplicatesSkipped: true,
                  status: true,
                },
              }),
              tx.ingestionRun.findFirst({
                where: { status: 'STARTED' },
                orderBy: [{ updatedAt: 'desc' }],
                select: {
                  id: true,
                  targetTotal: true,
                  recordsFetched: true,
                  recordsStored: true,
                  recordsFailed: true,
                  duplicatesSkipped: true,
                },
              }),
              tx.evidenceCanonicalizationRun.findFirst({
                orderBy: [{ updatedAt: 'desc' }],
                select: {
                  id: true,
                  targetTotal: true,
                  recordsProcessed: true,
                  recordsCanonicalExtracted: true,
                  recordsInsufficientSource: true,
                  recordsNeedsFullText: true,
                  recordsNeedsReview: true,
                  recordsFailed: true,
                  canonicalFactsStored: true,
                  benchmarkRecordsStored: true,
                  status: true,
                },
              }),
              tx.evidenceCanonicalizationRun.findFirst({
                where: { status: 'STARTED' },
                orderBy: [{ updatedAt: 'desc' }],
                select: {
                  id: true,
                  targetTotal: true,
                  recordsProcessed: true,
                  recordsCanonicalExtracted: true,
                  recordsInsufficientSource: true,
                  recordsNeedsFullText: true,
                  recordsNeedsReview: true,
                  recordsFailed: true,
                  canonicalFactsStored: true,
                  benchmarkRecordsStored: true,
                },
              }),
              tx.scientificEvidenceFact.count({
                where: { factLayer: canonicalScientificFactLayer },
              }),
              tx.scientificEvidenceFact.count({
                where: {
                  factLayer: canonicalScientificFactLayer,
                  decisionReady: true,
                },
              }),
              tx.evidenceBenchmarkAggregate.count(),
              tx.externalEvidenceCatalogItem.groupBy({
                by: ['extractionStatus'],
                where: {
                  extractionStatus: {
                    in: [
                      'canonical_extracted',
                      'insufficient_source',
                      'needs_full_text',
                      'needs_review',
                      'extraction_failed',
                    ],
                  },
                },
                _count: {
                  _all: true,
                },
              }),
              tx.externalSourceRecord.groupBy({
                by: ['sourceType'],
                where: sourceRecordFacetWhere,
                _count: {
                  _all: true,
                },
              }),
              tx.externalEvidenceCatalogItem.groupBy({
                by: ['evidenceType'],
                where,
                _count: {
                  _all: true,
                },
              }),
              tx.externalEvidenceCatalogItem.groupBy({
                by: ['reviewStatus'],
                where,
                _count: {
                  _all: true,
                },
              }),
              tx.externalSourceRecord.groupBy({
                by: ['publisher'],
                where: sourceRecordFacetWhere,
                _count: {
                  _all: true,
                },
              }),
              tx.externalEvidenceCatalogItem.groupBy({
                by: ['evidenceQuality'],
                where,
                _count: {
                  _all: true,
                },
              }),
              tx.externalEvidenceCatalogItem.aggregate({
                where,
                _sum: {
                  claimCount: true,
                },
              }),
              tx.evidenceClaim.count({
                where: {
                  catalogItem: {
                    is: where,
                  },
                  reviews: {
                    some: {
                      status: {
                        not: 'PENDING',
                      },
                    },
                  },
                },
              }),
              tx.externalEvidenceCatalogItem.count({
                where: withSourceRecordCondition({
                  doi: {
                    not: null,
                  },
                }),
              }),
              tx.externalEvidenceCatalogItem.count({
                where: withSourceRecordCondition({
                  sourceUrl: {
                    not: null,
                  },
                }),
              }),
            ]),
          PRISMA_TRANSACTION_OPTIONS,
        );

        const items = records;
        const canonicalStatusCounts = new Map(
          canonicalExtractionStatusGroups.map((group) => [
            group.extractionStatus,
            group._count._all,
          ]),
        );
        const warehouseAggregate =
          buildExternalEvidenceWarehouseAggregateFromStats({
            sourceTypes: sourceTypeFacetGroups.map((group) => ({
              value: mapExternalEvidenceSourceType(group.sourceType),
              count: group._count._all,
            })),
            evidenceTypes: evidenceTypeFacetGroups.map((group) => ({
              value: normalizeExternalEvidenceType(
                group.evidenceType,
                'MANUAL',
              ),
              count: group._count._all,
            })),
            reviewStatuses: reviewStatusFacetGroups.map((group) => ({
              value: mapExternalEvidenceReviewStatus(group.reviewStatus),
              count: group._count._all,
            })),
            publishers: publisherFacetGroups.map((group) => ({
              value: group.publisher,
              count: group._count._all,
            })),
            qualityLevels: qualityFacetGroups.map((group) => ({
              value: group.evidenceQuality,
              count: group._count._all,
            })),
            filteredItemCount: filteredTotal,
            returnedItemCount: items.length,
            claimCount: claimCountAggregate._sum.claimCount ?? 0,
            reviewedClaimCount: reviewedClaimTotal,
            doiCount: doiTotal,
            linkedSourceCount: linkedSourceTotal,
            publisherCount: publisherFacetGroups.filter((group) =>
              Boolean(group.publisher?.trim()),
            ).length,
          });

        return externalEvidenceCatalogListResponseSchema.parse({
          items: items.map((record) =>
            createExternalEvidenceSummary({
              ...record,
              claimCount: record.claimCount,
              reviewedClaimCount: record.claims.length,
            }),
          ),
          summary: {
            total,
            catalog_total: total,
            filtered_total: filteredTotal,
            pending: pendingTotal,
            pending_review: pendingTotal,
            accepted: acceptedTotal,
            rejected: rejectedTotal,
            failed_ingestion: failedIngestionTotal,
            duplicate_skipped: duplicateSkippedTotal,
            canonical_processed:
              (canonicalStatusCounts.get('canonical_extracted') ?? 0) +
              (canonicalStatusCounts.get('insufficient_source') ?? 0) +
              (canonicalStatusCounts.get('needs_full_text') ?? 0) +
              (canonicalStatusCounts.get('needs_review') ?? 0) +
              (canonicalStatusCounts.get('extraction_failed') ?? 0),
            canonical_extracted:
              canonicalStatusCounts.get('canonical_extracted') ?? 0,
            canonical_insufficient_source:
              canonicalStatusCounts.get('insufficient_source') ?? 0,
            canonical_needs_full_text:
              canonicalStatusCounts.get('needs_full_text') ?? 0,
            canonical_needs_review:
              canonicalStatusCounts.get('needs_review') ?? 0,
            canonical_failed:
              canonicalStatusCounts.get('extraction_failed') ?? 0,
            canonical_facts: canonicalFactTotal,
            benchmark_ready_facts: benchmarkReadyFactTotal,
            benchmark_aggregates: benchmarkAggregateTotal,
            last_ingestion_batch: lastIngestionRun?.id ?? null,
            ingestion_progress: activeIngestionRun
              ? {
                  active: true,
                  run_id: activeIngestionRun.id,
                  target_total: activeIngestionRun.targetTotal ?? total,
                  current_total: total,
                  records_remaining: Math.max(
                    0,
                    (activeIngestionRun.targetTotal ?? total) - total,
                  ),
                  completion_ratio:
                    (activeIngestionRun.targetTotal ?? total) > 0
                      ? Math.min(
                          1,
                          total / (activeIngestionRun.targetTotal ?? total),
                        )
                      : 1,
                  records_fetched: activeIngestionRun.recordsFetched,
                  records_stored: activeIngestionRun.recordsStored,
                  records_failed: activeIngestionRun.recordsFailed,
                  duplicates_skipped: activeIngestionRun.duplicatesSkipped,
                }
              : null,
            canonicalization_progress: activeCanonicalizationRun
              ? {
                  active: true,
                  run_id: activeCanonicalizationRun.id,
                  target_total:
                    activeCanonicalizationRun.targetTotal ?? acceptedTotal,
                  processed_total: activeCanonicalizationRun.recordsProcessed,
                  records_remaining: Math.max(
                    0,
                    (activeCanonicalizationRun.targetTotal ?? acceptedTotal) -
                      activeCanonicalizationRun.recordsProcessed,
                  ),
                  completion_ratio:
                    (activeCanonicalizationRun.targetTotal ?? acceptedTotal) > 0
                      ? Math.min(
                          1,
                          activeCanonicalizationRun.recordsProcessed /
                            (activeCanonicalizationRun.targetTotal ??
                              acceptedTotal),
                        )
                      : 1,
                  canonical_facts:
                    activeCanonicalizationRun.canonicalFactsStored,
                  benchmark_records:
                    activeCanonicalizationRun.benchmarkRecordsStored,
                  insufficient_source:
                    activeCanonicalizationRun.recordsInsufficientSource,
                  needs_full_text:
                    activeCanonicalizationRun.recordsNeedsFullText,
                  needs_review: activeCanonicalizationRun.recordsNeedsReview,
                  failed: activeCanonicalizationRun.recordsFailed,
                }
              : latestCanonicalizationRun
                ? {
                    active: latestCanonicalizationRun.status === 'STARTED',
                    run_id: latestCanonicalizationRun.id,
                    target_total:
                      latestCanonicalizationRun.targetTotal ?? acceptedTotal,
                    processed_total: latestCanonicalizationRun.recordsProcessed,
                    records_remaining: Math.max(
                      0,
                      (latestCanonicalizationRun.targetTotal ?? acceptedTotal) -
                        latestCanonicalizationRun.recordsProcessed,
                    ),
                    completion_ratio:
                      (latestCanonicalizationRun.targetTotal ?? acceptedTotal) >
                      0
                        ? Math.min(
                            1,
                            latestCanonicalizationRun.recordsProcessed /
                              (latestCanonicalizationRun.targetTotal ??
                                acceptedTotal),
                          )
                        : 1,
                    canonical_facts:
                      latestCanonicalizationRun.canonicalFactsStored,
                    benchmark_records:
                      latestCanonicalizationRun.benchmarkRecordsStored,
                    insufficient_source:
                      latestCanonicalizationRun.recordsInsufficientSource,
                    needs_full_text:
                      latestCanonicalizationRun.recordsNeedsFullText,
                    needs_review: latestCanonicalizationRun.recordsNeedsReview,
                    failed: latestCanonicalizationRun.recordsFailed,
                  }
                : null,
            page,
            page_size: pageSize,
            total_pages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
            returned: items.length,
          },
          warehouse_aggregate: warehouseAggregate,
        });
      },
      {
        review_status: input.reviewStatus ?? 'all',
        source_type: input.sourceType ?? 'all',
        search_query: input.searchQuery ?? '',
      },
    );
  }

  async getExternalEvidenceCatalogItem(
    catalogItemId: string,
  ): Promise<ExternalEvidenceCatalogItemDetail | null> {
    return withSpan(
      'database.external_evidence.get',
      async () => {
        const record = await this.prisma.externalEvidenceCatalogItem.findUnique(
          {
            where: { id: catalogItemId },
            include: {
              sourceRecord: {
                include: {
                  sourceArtifacts: {
                    include: {
                      chunks: {
                        orderBy: [{ chunkIndex: 'asc' }],
                        take: 12,
                      },
                    },
                  },
                  supplierDocuments: true,
                },
              },
              claims: {
                include: {
                  reviews: true,
                  ontologyMappings: true,
                },
                orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
              },
            },
          },
        );

        if (!record) {
          return null;
        }

        return externalEvidenceCatalogDetailSchema.parse(
          createExternalEvidenceDetail(record),
        );
      },
      { catalog_item_id: catalogItemId },
    );
  }

  async reviewExternalEvidenceCatalogItem(
    input: ReviewExternalEvidenceCatalogItemInput,
  ): Promise<ExternalEvidenceCatalogItemDetail | null> {
    return withSpan(
      'database.external_evidence.review',
      async () => {
        const updated = await this.prisma.$transaction(async (tx) => {
          const current = await tx.externalEvidenceCatalogItem.findUnique({
            where: { id: input.catalogItemId },
            include: {
              sourceRecord: {
                include: {
                  sourceArtifacts: {
                    include: {
                      chunks: {
                        orderBy: [{ chunkIndex: 'asc' }],
                        take: 12,
                      },
                    },
                  },
                  supplierDocuments: true,
                },
              },
              claims: {
                include: {
                  reviews: true,
                  ontologyMappings: true,
                },
              },
            },
          });

          if (!current) {
            return null;
          }

          const nextReviewStatus = toDatabaseExternalEvidenceReviewStatus(
            input.action,
          );
          const nextSourceState = 'REVIEWED';

          const record = await tx.externalEvidenceCatalogItem.update({
            where: { id: input.catalogItemId },
            data: {
              reviewStatus: nextReviewStatus,
              sourceState: nextSourceState,
              acceptedBy:
                nextReviewStatus === 'ACCEPTED'
                  ? (input.actorId ?? 'analyst')
                  : null,
              acceptancePolicy:
                nextReviewStatus === 'ACCEPTED'
                  ? 'manual_exception_review_acceptance'
                  : null,
              acceptedAt: nextReviewStatus === 'ACCEPTED' ? new Date() : null,
              reviewRequired: nextReviewStatus === 'PENDING',
            },
            include: {
              sourceRecord: {
                include: {
                  sourceArtifacts: {
                    include: {
                      chunks: {
                        orderBy: [{ chunkIndex: 'asc' }],
                        take: 12,
                      },
                    },
                  },
                  supplierDocuments: true,
                },
              },
              claims: {
                include: {
                  reviews: true,
                  ontologyMappings: true,
                },
              },
            },
          });

          if (nextReviewStatus === 'ACCEPTED') {
            const claimReviewRows = current.claims
              .filter(
                (claim) =>
                  !claim.reviews.some((review) => review.status !== 'PENDING'),
              )
              .map((claim) => ({
                claimId: claim.id,
                status: 'ACCEPTED' as const,
                analystId: input.actorId ?? null,
                analystRole: input.actorRole,
                analystNote:
                  input.note ??
                  'Catalog item accepted; claim review state synchronized.',
                reviewedAt: new Date(),
              }));

            if (claimReviewRows.length > 0) {
              await tx.evidenceClaimReview.createMany({
                data: claimReviewRows,
              });
            }
          }

          await tx.auditEvent.create({
            data: {
              id: randomUUID(),
              eventType: 'external_evidence_reviewed',
              actorRole: input.actorRole,
              actorId: input.actorId,
              payload: toPrismaJsonObject({
                catalog_item_id: input.catalogItemId,
                source_type: mapExternalEvidenceSourceType(
                  record.sourceRecord.sourceType,
                ),
                previous_review_status: mapExternalEvidenceReviewStatus(
                  current.reviewStatus,
                ),
                next_review_status: mapExternalEvidenceReviewStatus(
                  record.reviewStatus,
                ),
                note: input.note,
              }),
            },
          });

          return tx.externalEvidenceCatalogItem.findUnique({
            where: { id: record.id },
            include: {
              sourceRecord: {
                include: {
                  supplierDocuments: true,
                },
              },
              claims: {
                include: {
                  reviews: true,
                  ontologyMappings: true,
                },
              },
            },
          });
        }, PRISMA_TRANSACTION_OPTIONS);

        if (!updated) {
          return null;
        }

        return externalEvidenceCatalogDetailSchema.parse(
          createExternalEvidenceDetail(updated),
        );
      },
      {
        catalog_item_id: input.catalogItemId,
        action: input.action,
      },
    );
  }

  async reviewExternalEvidenceCatalogItems(
    input: ReviewExternalEvidenceCatalogItemsInput,
  ): Promise<ExternalEvidenceBulkReviewResponse> {
    return withSpan(
      'database.external_evidence.review_bulk',
      async () => {
        const attemptedIds = normalizeCatalogItemIds(input.catalogItemIds);
        const failed: ExternalEvidenceBulkReviewResponse['failed'] = [];
        const succeededIds: string[] = [];

        for (const catalogItemId of attemptedIds) {
          const updated = await this.reviewExternalEvidenceCatalogItem({
            catalogItemId,
            action: input.action,
            actorRole: input.actorRole,
            actorId: input.actorId,
            note: input.note,
          });

          if (!updated) {
            failed.push(buildMissingCatalogItemFailure(catalogItemId));
            continue;
          }

          succeededIds.push(updated.id);
        }

        return externalEvidenceBulkReviewResponseSchema.parse({
          action: input.action,
          attempted_ids: attemptedIds,
          succeeded_ids: succeededIds,
          failed,
          note: input.note?.trim() || undefined,
        });
      },
      {
        actor_id: input.actorId ?? 'anonymous',
        attempted_count: input.catalogItemIds.length,
        review_action: input.action,
      },
    );
  }

  async saveReportConversationTurn(
    input: SaveReportConversationTurnInput,
  ): Promise<ReportConversationTurn> {
    return withSpan(
      'database.report_conversation.turn.save',
      async () => {
        const record = await this.prisma.$transaction(async (tx) => {
          await tx.reportConversationSession.upsert({
            where: { id: input.conversationId },
            update: {
              reportSnapshotId: input.reportSnapshotId ?? undefined,
            },
            create: {
              id: input.conversationId,
              evaluationId: input.evaluationId,
              reportSnapshotId: input.reportSnapshotId ?? null,
              createdBy: input.actorId ?? null,
            },
          });

          return tx.reportConversationTurn.create({
            data: {
              conversationId: input.conversationId,
              actor: input.actor,
              selectedSection: input.selectedSection ?? null,
              message: input.message,
              narrativeMetadata: input.narrativeMetadata
                ? toPrismaJsonObject(input.narrativeMetadata)
                : Prisma.JsonNull,
              citations: input.citations
                ? toRequiredPrismaJsonValue(input.citations)
                : Prisma.JsonNull,
              grounding: input.grounding
                ? toPrismaJsonObject(input.grounding)
                : Prisma.JsonNull,
              refusalReason: input.refusalReason ?? null,
            },
          });
        }, PRISMA_TRANSACTION_OPTIONS);

        return createReportConversationTurn(record);
      },
      {
        evaluation_id: input.evaluationId,
        conversation_id: input.conversationId,
        actor: input.actor,
      },
    );
  }

  async listRecentReportConversationTurns(
    input: ListRecentReportConversationTurnsInput,
  ): Promise<ReportConversationTurn[]> {
    return withSpan(
      'database.report_conversation.turn.list_recent',
      async () => {
        const limit = Math.max(1, Math.min(input.limit ?? 12, 12));
        const records = await this.prisma.reportConversationTurn.findMany({
          where: {
            conversationId: input.conversationId,
            conversation: {
              evaluationId: input.evaluationId,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
        });

        return records
          .map((record) => createReportConversationTurn(record))
          .reverse();
      },
      {
        evaluation_id: input.evaluationId,
        conversation_id: input.conversationId,
      },
    );
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createEvaluationRepository(): EvaluationRepository {
  assertRuntimeDatabaseConfiguration();
  return new PrismaEvaluationRepository(getPrismaClient());
}
