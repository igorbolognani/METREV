import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '../generated/prisma/client';

import {
    caseHistoryResponseSchema,
    evaluationListResponseSchema,
    evaluationResponseSchema,
    evidenceStrengthSchema,
    evidenceTypeSchema,
    externalEvidenceCatalogDetailSchema,
    externalEvidenceCatalogListResponseSchema,
    simulationEnrichmentSchema,
    type CaseHistoryResponse,
    type EvaluationListResponse,
    type EvaluationResponse,
    type ExternalEvidenceCatalogItemDetail,
    type ExternalEvidenceCatalogItemSummary,
    type ExternalEvidenceCatalogListResponse,
    type ExternalEvidenceReviewAction,
    type ExternalEvidenceReviewStatus,
} from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

import { getPrismaClient } from './prisma-client';
import { deriveSupplierPersistencePlan } from './supplier-persistence';

export { disconnectPrismaClient, getPrismaClient } from './prisma-client';

export interface EvaluationRepository {
  saveEvaluation(evaluation: EvaluationResponse): Promise<EvaluationResponse>;
  getEvaluation(evaluationId: string): Promise<EvaluationResponse | null>;
  getEvaluationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<EvaluationResponse | null>;
  listEvaluations(): Promise<EvaluationListResponse>;
  getCaseHistory(caseId: string): Promise<CaseHistoryResponse | null>;
  listExternalEvidenceCatalog(
    input?: ExternalEvidenceCatalogListInput,
  ): Promise<ExternalEvidenceCatalogListResponse>;
  getExternalEvidenceCatalogItem(
    catalogItemId: string,
  ): Promise<ExternalEvidenceCatalogItemDetail | null>;
  reviewExternalEvidenceCatalogItem(
    input: ReviewExternalEvidenceCatalogItemInput,
  ): Promise<ExternalEvidenceCatalogItemDetail | null>;
  disconnect(): Promise<void>;
}

export interface ExternalEvidenceCatalogListInput {
  reviewStatus?: ExternalEvidenceReviewStatus;
  searchQuery?: string;
}

export interface ReviewExternalEvidenceCatalogItemInput {
  catalogItemId: string;
  action: ExternalEvidenceReviewAction;
  actorRole: string;
  actorId?: string;
  note?: string;
}

export interface MemoryEvaluationRepositoryOptions {
  externalEvidenceCatalogItems?: ExternalEvidenceCatalogItemDetail[];
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

function mapExternalEvidenceSourceType(
  value:
    | 'OPENALEX'
    | 'CROSSREF'
    | 'SUPPLIER_PROFILE'
    | 'MARKET_SNAPSHOT'
    | 'MANUAL',
) {
  switch (value) {
    case 'OPENALEX':
      return 'openalex';
    case 'CROSSREF':
      return 'crossref';
    case 'SUPPLIER_PROFILE':
      return 'supplier_profile';
    case 'MARKET_SNAPSHOT':
      return 'market_snapshot';
    default:
      return 'manual';
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
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  sourceRecord: {
    sourceType:
      | 'OPENALEX'
      | 'CROSSREF'
      | 'SUPPLIER_PROFILE'
      | 'MARKET_SNAPSHOT'
      | 'MANUAL';
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
    evidence_type: evidenceTypeSchema.parse(record.evidenceType),
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
    applicability_scope:
      (record.applicabilityScope as Record<string, unknown>) ?? {},
    extracted_claims: Array.isArray(record.extractedClaims)
      ? record.extractedClaims
      : [],
    tags: record.tags,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
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
  createdAt: Date;
  updatedAt: Date;
  sourceRecord: {
    sourceType:
      | 'OPENALEX'
      | 'CROSSREF'
      | 'SUPPLIER_PROFILE'
      | 'MARKET_SNAPSHOT'
      | 'MANUAL';
    sourceUrl: string | null;
    sourceCategory: string | null;
    doi: string | null;
    publisher: string | null;
    publishedAt: Date | null;
    abstractText: string | null;
    rawPayload: unknown;
  };
}): ExternalEvidenceCatalogItemDetail {
  return {
    ...createExternalEvidenceSummary(record),
    abstract_text: record.sourceRecord.abstractText,
    payload: record.payload,
    raw_payload: record.sourceRecord.rawPayload,
  };
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

  constructor(options: MemoryEvaluationRepositoryOptions = {}) {
    for (const item of options.externalEvidenceCatalogItems ?? []) {
      this.externalEvidenceCatalog.set(item.id, item);
    }
  }

  async saveEvaluation(
    evaluation: EvaluationResponse,
  ): Promise<EvaluationResponse> {
    const idempotencyKey = evaluation.audit_record.idempotency_key?.trim();

    if (idempotencyKey) {
      const existing = this.evaluationsByIdempotencyKey.get(idempotencyKey);

      if (existing) {
        return existing;
      }
    }

    this.evaluations.set(evaluation.evaluation_id, evaluation);

    if (idempotencyKey) {
      this.evaluationsByIdempotencyKey.set(idempotencyKey, evaluation);
    }

    return evaluation;
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

  async listEvaluations(): Promise<EvaluationListResponse> {
    return evaluationListResponseSchema.parse({
      items: [...this.evaluations.values()]
        .sort((left, right) =>
          right.audit_record.timestamp.localeCompare(
            left.audit_record.timestamp,
          ),
        )
        .map((evaluation) => toEvaluationSummary(evaluation)),
    });
  }

  async getCaseHistory(caseId: string): Promise<CaseHistoryResponse | null> {
    const evaluations = [...this.evaluations.values()].filter(
      (evaluation) => evaluation.case_id === caseId,
    );

    return toCaseHistory(evaluations);
  }

  async listExternalEvidenceCatalog(
    input: ExternalEvidenceCatalogListInput = {},
  ): Promise<ExternalEvidenceCatalogListResponse> {
    const allItems = [...this.externalEvidenceCatalog.values()];
    const searchQuery = input.searchQuery?.trim().toLowerCase();
    const filteredItems = allItems
      .filter((item) => {
        if (input.reviewStatus && item.review_status !== input.reviewStatus) {
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

    return externalEvidenceCatalogListResponseSchema.parse({
      items: filteredItems,
      summary: {
        total: allItems.length,
        pending: allItems.filter((item) => item.review_status === 'pending')
          .length,
        accepted: allItems.filter((item) => item.review_status === 'accepted')
          .length,
        rejected: allItems.filter((item) => item.review_status === 'rejected')
          .length,
      },
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
      updated_at: new Date().toISOString(),
    });

    this.externalEvidenceCatalog.set(updated.id, updated);

    return updated;
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
                    evaluation.decision_output.confidence_and_uncertainty_summary
                      .provenance_notes,
                  agent_pipeline_trace:
                    evaluation.audit_record.agent_pipeline_trace,
                }),
                scoringSummary: toPrismaJsonObject({
                  sensitivity_level:
                    evaluation.decision_output.confidence_and_uncertainty_summary
                      .sensitivity_level,
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

            for (const evidenceRecord of evaluation.audit_record.typed_evidence) {
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
                    evaluation.decision_output.confidence_and_uncertainty_summary
                      .confidence_level,
                  missing_data_count: evaluation.audit_record.missing_data_count,
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
          });
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
          include: { case: true, simulationArtifact: true },
        });

        if (!record) {
          return null;
        }

        return evaluationResponseSchema.parse({
          evaluation_id: record.id,
          case_id: record.caseId,
          normalized_case: record.case.normalizedCase,
          decision_output: record.decisionOutput,
          audit_record: record.auditRecord,
          narrative: record.narrative,
          narrative_metadata: record.narrativeMetadata,
          simulation_enrichment: record.simulationArtifact
            ? fromSimulationArtifactRecord(record.simulationArtifact)
            : undefined,
        });
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
          include: { case: true, simulationArtifact: true },
        });

        if (!record) {
          return null;
        }

        return evaluationResponseSchema.parse({
          evaluation_id: record.id,
          case_id: record.caseId,
          normalized_case: record.case.normalizedCase,
          decision_output: record.decisionOutput,
          audit_record: record.auditRecord,
          narrative: record.narrative,
          narrative_metadata: record.narrativeMetadata,
          simulation_enrichment: record.simulationArtifact
            ? fromSimulationArtifactRecord(record.simulationArtifact)
            : undefined,
        });
      },
      { idempotency_key: idempotencyKey },
    );
  }

  async listEvaluations(): Promise<EvaluationListResponse> {
    return withSpan('database.evaluation.list', async () => {
      const records = await this.prisma.evaluationRecord.findMany({
        include: { case: true, simulationArtifact: true },
        orderBy: { createdAt: 'desc' },
      });

      return evaluationListResponseSchema.parse({
        items: records.map((record) => ({
          evaluation_id: record.id,
          case_id: record.caseId,
          created_at: record.createdAt.toISOString(),
          confidence_level: record.confidenceLevel,
          technology_family: record.case.technologyFamily,
          primary_objective: record.case.primaryObjective,
          summary:
            (record.decisionOutput as Record<string, Record<string, string>>)
              .current_stack_diagnosis?.summary ?? 'Evaluation completed',
          narrative_available: Boolean(record.narrative),
          simulation_summary: record.simulationArtifact
            ? toSimulationSummaryFromArtifact(record.simulationArtifact)
            : undefined,
        })),
      });
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

  async listExternalEvidenceCatalog(
    input: ExternalEvidenceCatalogListInput = {},
  ): Promise<ExternalEvidenceCatalogListResponse> {
    return withSpan(
      'database.external_evidence.list',
      async () => {
        const reviewStatus = input.reviewStatus
          ? toDatabaseExternalEvidenceReviewStatus(input.reviewStatus)
          : undefined;
        const searchQuery = input.searchQuery?.trim();
        const where: Prisma.ExternalEvidenceCatalogItemWhereInput = {
          reviewStatus,
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

        const [records, total, pending, accepted, rejected] =
          await this.prisma.$transaction([
            this.prisma.externalEvidenceCatalogItem.findMany({
              where,
              include: { sourceRecord: true },
              orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            }),
            this.prisma.externalEvidenceCatalogItem.count(),
            this.prisma.externalEvidenceCatalogItem.count({
              where: { reviewStatus: 'PENDING' },
            }),
            this.prisma.externalEvidenceCatalogItem.count({
              where: { reviewStatus: 'ACCEPTED' },
            }),
            this.prisma.externalEvidenceCatalogItem.count({
              where: { reviewStatus: 'REJECTED' },
            }),
          ]);

        return externalEvidenceCatalogListResponseSchema.parse({
          items: records.map((record) => createExternalEvidenceSummary(record)),
          summary: {
            total,
            pending,
            accepted,
            rejected,
          },
        });
      },
      {
        review_status: input.reviewStatus ?? 'all',
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
            include: { sourceRecord: true },
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
            include: { sourceRecord: true },
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
            },
            include: { sourceRecord: true },
          });

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

          return record;
        });

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

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createEvaluationRepository(): EvaluationRepository {
  assertRuntimeDatabaseConfiguration();
  return new PrismaEvaluationRepository(getPrismaClient());
}
