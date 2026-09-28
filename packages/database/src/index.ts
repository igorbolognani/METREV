import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '../generated/prisma/client';

import {
  buildReportModelingSection,
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
  externalEvidenceBenchmarkRecordSchema,
  externalEvidenceBulkReviewResponseSchema,
  externalEvidenceCatalogDetailSchema,
  externalEvidenceCatalogListResponseSchema,
  externalEvidenceScientificFactSchema,
  externalEvidenceSourceTextStatusSchema,
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

export {
  createEvidenceAuditRepository,
  MemoryEvidenceAuditRepository,
  type AcquisitionStatusSummary,
  type DiscoveryStatusSummary,
  type EvidenceAuditRepository,
  type OutlierCandidateRow,
  type RawCoverageRow,
  type SourceRecordForAcquisition,
} from './evidence-audit-repository';
export { disconnectPrismaClient, getPrismaClient } from './prisma-client';
export {
  createSpatialSimulationRunRepository,
  MemorySpatialSimulationRunRepository,
  PrismaSpatialSimulationRunRepository,
  SpatialSimulationRunError,
  type CreateSpatialSimulationRunResult,
  type RetrySpatialSimulationRunResult,
  type SpatialSimulationRunErrorCode,
  type SpatialSimulationRunLeaseResult,
  type SpatialSimulationRunRepository,
  type SpatialSimulationRunWorkItem,
} from './spatial-simulation-runs';
export {
  FOCUSED_MFC_MEC_WASTEWATER_BIOSENSORS_PRESET_ID,
  planResearchBackfillPreset,
  type PlannedResearchBackfill,
  type PlannedResearchBackfillPreset,
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
  type SaveResearchExtractionResultInput,
} from './research-repository';
export {
  buildEvidenceVeracityScore,
  getSourceArtifactForSourceDocument,
  importLocalPdfSources,
  localSourceImportRequestToInput,
  normalizeCliFiles,
  resolveLocalSourceImportRequestToInput,
  type LocalPdfImportFile,
  type LocalPdfImportInput,
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
    review_status: string | null;
    source_state: string | null;
    access_status: string | null;
    source_license: string | null;
    doi: string | null;
    source_url: string | null;
    canonical_key: string | null;
    metric_type: string | null;
    normalized_value: number | null;
    normalized_unit: string | null;
    material: string | null;
    component_type: string | null;
    evidence_quality: string | null;
    confidence: number | null;
    source_text_hash: string | null;
    source_locator: string | null;
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

function readJsonStringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === 'string' && entry.trim() ? entry : null;
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
  sensitivityAnalysis: unknown;
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
    sensitivity_analysis: record.sensitivityAnalysis ?? undefined,
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
      return '