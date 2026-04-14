import { Prisma, PrismaClient } from '@prisma/client';

import {
  caseHistoryResponseSchema,
  evaluationListResponseSchema,
  evaluationResponseSchema,
  type CaseHistoryResponse,
  type EvaluationListResponse,
  type EvaluationResponse,
} from '@metrev/domain-contracts';
import { withSpan } from '@metrev/telemetry';

import { getPrismaClient } from './prisma-client';
import { deriveSupplierPersistencePlan } from './supplier-persistence';

export { disconnectPrismaClient, getPrismaClient } from './prisma-client';

export interface EvaluationRepository {
  saveEvaluation(evaluation: EvaluationResponse): Promise<EvaluationResponse>;
  getEvaluation(evaluationId: string): Promise<EvaluationResponse | null>;
  listEvaluations(): Promise<EvaluationListResponse>;
  getCaseHistory(caseId: string): Promise<CaseHistoryResponse | null>;
  disconnect(): Promise<void>;
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

  const auditEvents = sorted.map((evaluation) => ({
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
  }));

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

  async saveEvaluation(
    evaluation: EvaluationResponse,
  ): Promise<EvaluationResponse> {
    this.evaluations.set(evaluation.evaluation_id, evaluation);
    return evaluation;
  }

  async getEvaluation(
    evaluationId: string,
  ): Promise<EvaluationResponse | null> {
    return this.evaluations.get(evaluationId) ?? null;
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
              }),
            },
          });
        });

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
          include: { case: true },
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
        });
      },
      { evaluation_id: evaluationId },
    );
  }

  async listEvaluations(): Promise<EvaluationListResponse> {
    return withSpan('database.evaluation.list', async () => {
      const records = await this.prisma.evaluationRecord.findMany({
        include: { case: true },
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

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createEvaluationRepository(): EvaluationRepository {
  assertRuntimeDatabaseConfiguration();
  return new PrismaEvaluationRepository(getPrismaClient());
}
