import { randomUUID } from 'node:crypto';

import type { FastifyBaseLogger } from 'fastify';

import { createAuditRecord } from '@metrev/audit';
import type { SessionActor } from '@metrev/auth';
import type { EvaluationRepository } from '@metrev/database';
import {
  evaluationResponseSchema,
  normalizeCaseInput,
  validateDecisionOutputContract,
  type DecisionOutputValidationIssue,
  type EvaluationResponse,
  type ExternalEvidenceCatalogItemDetail,
  type RawCaseInput,
  type RawEvidenceRecord,
} from '@metrev/domain-contracts';
import { evaluateSimulationEnrichment } from '@metrev/electrochem-models';
import { generateNarrative } from '@metrev/llm-adapter';
import { runCaseEvaluation } from '@metrev/rule-engine';
import { withSpan } from '@metrev/telemetry';
import { buildRuntimeVersions } from '../presenters/workspace-presenters';

type RuntimeLogger = Pick<FastifyBaseLogger, 'warn'>;

export interface CreatePersistedCaseEvaluationInput {
  rawInput: RawCaseInput;
  actor: SessionActor;
  evaluationRepository: EvaluationRepository;
  logger: RuntimeLogger;
  environment?: string;
  simulationMode?: string;
  idempotencyKey?: string;
  entrypoint?: 'ui' | 'api' | 'batch' | 'test';
}

const catalogEvidenceIdPrefix = 'catalog:';
const reviewedCatalogEvidenceNote =
  'Reviewed and accepted into the external evidence catalog before intake selection.';

export class InvalidCatalogEvidenceSelectionError extends Error {
  readonly code = 'invalid_catalog_evidence';
  readonly statusCode = 400;

  constructor(
    readonly catalogItemId: string,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidCatalogEvidenceSelectionError';
  }
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function resolveCatalogSourceDocumentId(
  item: ExternalEvidenceCatalogItemDetail,
): string | undefined {
  return (
    item.source_document?.id ??
    item.source_artifacts.find((artifact) => artifact.source_document_id)
      ?.source_document_id ??
    item.claims.find((claim) => claim.source_document_id)?.source_document_id
  );
}

function hasAcceptedClaimReview(
  claim: ExternalEvidenceCatalogItemDetail['claims'][number],
): boolean {
  return claim.reviews.some((review) => review.status === 'accepted');
}

function collectReviewedClaimIds(
  item: ExternalEvidenceCatalogItemDetail,
): string[] {
  return item.claims
    .filter((claim) => hasAcceptedClaimReview(claim))
    .map((claim) => claim.id);
}

function collectReviewedClaimLocatorRefs(
  item: ExternalEvidenceCatalogItemDetail,
): string[] {
  return dedupeStrings(
    item.claims.flatMap((claim) =>
      hasAcceptedClaimReview(claim) && claim.source_locator
        ? [claim.source_locator]
        : [],
    ),
  );
}

function collectSourceArtifactIds(
  item: ExternalEvidenceCatalogItemDetail,
): string[] {
  return dedupeStrings(
    item.source_artifacts.map((artifact) => artifact.artifact_id),
  );
}

function toCatalogEvidenceRecord(
  item: ExternalEvidenceCatalogItemDetail,
): RawEvidenceRecord {
  const sourceDocumentId = resolveCatalogSourceDocumentId(item);
  const sourceArtifactIds = collectSourceArtifactIds(item);
  const reviewedClaimIds = collectReviewedClaimIds(item);
  const reviewedClaimLocatorRefs = collectReviewedClaimLocatorRefs(item);

  return {
    evidence_id: `${catalogEvidenceIdPrefix}${item.id}`,
    evidence_type: item.evidence_type,
    title: item.title,
    summary: item.summary,
    applicability_scope: {
      ...item.applicability_scope,
      ...(sourceDocumentId ? { source_document_id: sourceDocumentId } : {}),
    },
    strength_level: item.strength_level,
    provenance_note: `${item.provenance_note} ${reviewedCatalogEvidenceNote}`,
    quantitative_metrics: {},
    operating_conditions: {},
    block_mapping: [],
    limitations: [],
    contradiction_notes: [],
    benchmark_context: `${item.source_type}${item.publisher ? ` via ${item.publisher}` : ''}`,
    tags: dedupeStrings([
      ...item.tags,
      'reviewed-catalog',
      `source:${item.source_type}`,
    ]),
    catalog_item_id: item.id,
    review_status: item.review_status,
    source_state: item.source_state,
    source_type: item.source_type,
    source_category: item.source_category,
    source_url: item.source_url,
    doi: item.doi,
    publisher: item.publisher,
    published_at: item.published_at,
    claim_count: item.claim_count,
    reviewed_claim_count: item.reviewed_claim_count,
    metadata_quality: item.metadata_quality,
    veracity_score: item.veracity_score,
    source_document_id: sourceDocumentId,
    source_artifact_count: sourceArtifactIds.length,
    source_artifact_ids: sourceArtifactIds,
    reviewed_claim_ids: reviewedClaimIds,
    reviewed_claim_locator_refs: reviewedClaimLocatorRefs,
  };
}

async function sanitizeCatalogEvidenceSelections(
  rawInput: RawCaseInput,
  repository: EvaluationRepository,
): Promise<RawCaseInput> {
  if (!rawInput.evidence_records?.length) {
    return rawInput;
  }

  const catalogCache = new Map<string, ExternalEvidenceCatalogItemDetail>();
  const evidenceRecords = await Promise.all(
    rawInput.evidence_records.map(async (record) => {
      if (!record.evidence_id?.startsWith(catalogEvidenceIdPrefix)) {
        return record;
      }

      const catalogItemId = record.evidence_id
        .slice(catalogEvidenceIdPrefix.length)
        .trim();

      if (!catalogItemId) {
        throw new InvalidCatalogEvidenceSelectionError(
          record.evidence_id,
          'Catalog evidence selections must include a catalog item id.',
        );
      }

      let catalogItem = catalogCache.get(catalogItemId);

      if (!catalogItem) {
        catalogItem =
          (await repository.getExternalEvidenceCatalogItem(catalogItemId)) ??
          undefined;

        if (catalogItem) {
          catalogCache.set(catalogItemId, catalogItem);
        }
      }

      if (!catalogItem) {
        throw new InvalidCatalogEvidenceSelectionError(
          catalogItemId,
          `Catalog evidence ${catalogItemId} was not found.`,
        );
      }

      if (catalogItem.review_status !== 'accepted') {
        throw new InvalidCatalogEvidenceSelectionError(
          catalogItemId,
          `Catalog evidence ${catalogItemId} is ${catalogItem.review_status} and cannot be attached.`,
        );
      }

      return toCatalogEvidenceRecord(catalogItem);
    }),
  );

  return {
    ...rawInput,
    evidence_records: evidenceRecords,
  };
}

function logDecisionOutputValidationIssue(
  logger: RuntimeLogger,
  issue: DecisionOutputValidationIssue,
): void {
  logger.warn(
    {
      field: issue.field,
      received_value: issue.received,
      expected: issue.expected,
      source_state: issue.source_state,
      missing_behavior: issue.missing_behavior,
    },
    'decision_output_contract_validation_issue',
  );
}

export async function createPersistedCaseEvaluation(
  input: CreatePersistedCaseEvaluationInput,
): Promise<EvaluationResponse> {
  const idempotencyKey = input.idempotencyKey?.trim();

  if (idempotencyKey) {
    const existing =
      await input.evaluationRepository.getEvaluationByIdempotencyKey(
        idempotencyKey,
      );

    if (existing) {
      return existing;
    }
  }

  const evaluation = await withSpan(
    'case.evaluate',
    async () => {
      const sanitizedRawInput = await sanitizeCatalogEvidenceSelections(
        input.rawInput,
        input.evaluationRepository,
      );
      const normalizedCase = normalizeCaseInput(sanitizedRawInput);
      const simulationEnrichment = await withSpan(
        'case.evaluate.simulation_enrichment',
        () =>
          Promise.resolve(
            evaluateSimulationEnrichment({
              normalizedCase,
              mode: input.simulationMode ?? process.env.METREV_SIMULATION_MODE,
            }),
          ),
        {
          case_id: normalizedCase.case_id,
          technology_family: normalizedCase.technology_family,
        },
      );
      const decisionOutput = runCaseEvaluation(normalizedCase, {
        derivedObservations: simulationEnrichment.derived_observations,
      });
      const validation = validateDecisionOutputContract({
        decisionOutput,
        environment: input.environment,
        logger: (issue) => {
          logDecisionOutputValidationIssue(input.logger, issue);
        },
      });
      const reviewedDecisionOutput =
        validation.decisionOutput ?? decisionOutput;
      const narrativeResult = await generateNarrative({
        decisionOutput: reviewedDecisionOutput,
        normalizedCase,
      });
      const evaluationId = randomUUID();
      const runtimeVersions = buildRuntimeVersions({
        promptVersion: narrativeResult.narrativeMetadata.prompt_version,
        modelVersion:
          simulationEnrichment.model_version ??
          narrativeResult.narrativeMetadata.model ??
          null,
      });
      const auditRecord = createAuditRecord({
        actorRole: input.actor.role,
        actorId: input.actor.userId,
        decisionOutput: reviewedDecisionOutput,
        normalizedCase,
        rawInput: sanitizedRawInput,
        simulationEnrichment,
        runtimeVersions,
        entrypoint: input.entrypoint ?? 'api',
        evaluationId,
        idempotencyKey,
      });

      return evaluationResponseSchema.parse({
        evaluation_id: evaluationId,
        case_id: normalizedCase.case_id,
        normalized_case: normalizedCase,
        decision_output: reviewedDecisionOutput,
        audit_record: auditRecord,
        narrative: narrativeResult.narrative,
        narrative_metadata: narrativeResult.narrativeMetadata,
        simulation_enrichment: simulationEnrichment,
      });
    },
    {
      actor_id: input.actor.userId,
      role: input.actor.role,
      session_id: input.actor.sessionId,
    },
  );

  return withSpan(
    'case.evaluation.persist',
    () => input.evaluationRepository.saveEvaluation(evaluation),
    {
      case_id: evaluation.case_id,
      evaluation_id: evaluation.evaluation_id,
    },
  );
}
