import { randomUUID } from 'node:crypto';

import type { FastifyBaseLogger } from 'fastify';

import { createAuditRecord } from '@metrev/audit';
import type { SessionActor } from '@metrev/auth';
import type {
  EvaluationRepository,
  EvidenceBenchmarkSlice,
} from '@metrev/database';
import {
  evaluationResponseSchema,
  evidenceDecisionContextSchema,
  normalizeCaseInput,
  validateDecisionOutputContract,
  type DecisionOutputValidationIssue,
  type DerivedObservation,
  type EvaluationResponse,
  type EvidenceDecisionContext,
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

function systemTypeForTechnologyFamily(value: string): string {
  switch (value) {
    case 'microbial_fuel_cell':
      return 'MFC';
    case 'microbial_electrolysis_cell':
      return 'MEC';
    default:
      return 'MET';
  }
}

function canonicalMaterialToken(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized.includes('carbon_felt')) {
    return 'carbon_felt';
  }
  if (normalized.includes('carbon_cloth')) {
    return 'carbon_cloth';
  }
  if (normalized.includes('activated_carbon')) {
    return 'activated_carbon';
  }
  if (normalized.includes('graphite')) {
    return 'graphite';
  }
  if (normalized.includes('nafion')) {
    return 'nafion';
  }
  if (normalized.includes('stainless_steel')) {
    return 'stainless_steel';
  }

  return [
    'unknown',
    'needs_classification',
    'present',
    'absent',
    'none',
    'not_stated',
  ].includes(normalized)
    ? null
    : normalized;
}

function metricTypesForObjective(value: string): string[] {
  switch (value) {
    case 'hydrogen_recovery':
      return ['hydrogen_production', 'current_density', 'energy_input'];
    case 'biogas_synergy':
      return ['methane_biogas_relationship', 'removal_efficiency'];
    case 'nitrogen_recovery':
      return ['removal_efficiency', 'current_density'];
    case 'low_power_generation':
      return ['power_density', 'current_density'];
    default:
      return ['removal_efficiency', 'power_density', 'current_density'];
  }
}

function evidenceBenchmarkObservation(input: {
  aggregateCount: number;
  evidenceCount: number;
}): DerivedObservation {
  return {
    observation_id: `evidence-benchmark-slice-${randomUUID()}`,
    key: 'evidence_benchmark_slice_count',
    label: 'Decision evidence benchmark slice',
    value: input.aggregateCount,
    unit: null,
    source_kind: 'measured',
    confidence_level: input.aggregateCount > 0 ? 'medium' : 'low',
    decision_relevance: 'informational',
    provenance_note: `Database benchmark retrieval returned ${input.aggregateCount} aggregate range(s) and ${input.evidenceCount} top evidence record(s); the full corpus was not loaded or sent to the LLM.`,
    assumptions: [],
    missing_dependencies:
      input.aggregateCount > 0
        ? []
        : ['canonical decision-ready benchmark aggregates'],
  };
}

function buildEvidenceDecisionContext(input: {
  normalizedCase: ReturnType<typeof normalizeCaseInput>;
  benchmarkSlice: EvidenceBenchmarkSlice;
  componentTypes: string[];
  materials: string[];
  metricTypes: string[];
}): EvidenceDecisionContext {
  const systemType = evidenceDecisionContextSchema.shape.system_type.parse(
    systemTypeForTechnologyFamily(input.normalizedCase.technology_family),
  );
  const sourceRefs = dedupeStrings(
    input.benchmarkSlice.evidence.map(
      (record) => `catalog:${record.catalog_item_id}`,
    ),
  );
  const missingDependencies = dedupeStrings([
    ...(input.benchmarkSlice.summary.aggregate_count > 0
      ? []
      : ['canonical decision-ready benchmark aggregates']),
    ...(input.benchmarkSlice.summary.evidence_count > 0
      ? []
      : ['accepted decision-ready evidence records']),
  ]);

  return {
    case_id: input.normalizedCase.case_id,
    technology_family: input.normalizedCase.technology_family,
    system_type: systemType,
    primary_objective: input.normalizedCase.primary_objective,
    query: {
      system_type: systemType,
      application: input.normalizedCase.primary_objective,
      component_types: input.componentTypes,
      materials: input.materials,
      metric_types: input.metricTypes,
      limit: input.benchmarkSlice.summary.limited_to,
      decision_ready_only: true,
    },
    benchmark_ranges: input.benchmarkSlice.aggregates,
    matched_evidence: input.benchmarkSlice.evidence,
    material_comparisons: [],
    operating_window_signals: [],
    failure_mode_signals: [],
    cost_signals: [],
    supplier_signals: [],
    uncertainty_summary: {
      confidence_level:
        input.benchmarkSlice.summary.aggregate_count > 0 ? 'medium' : 'low',
      summary:
        input.benchmarkSlice.summary.aggregate_count > 0
          ? `Retrieved ${input.benchmarkSlice.summary.aggregate_count} decision-ready benchmark aggregate range(s) and ${input.benchmarkSlice.summary.evidence_count} top evidence record(s) for this case.`
          : 'No decision-ready benchmark aggregates matched the current case filters.',
      missing_dependencies: missingDependencies,
      excluded_evidence_reasons: [
        'Pending, rejected, supplier-only, or non-decision-ready evidence was excluded from this decision context.',
      ],
    },
    provenance_note:
      'EvidenceDecisionContext was built from decision-ready benchmark aggregates and accepted catalog evidence only; the full corpus was not loaded or sent to the LLM.',
    source_refs: sourceRefs,
    builder_version: 'initial_benchmark_slice_v1',
  };
}

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
      const stackBlocks = normalizedCase.stack_blocks as Record<
        string,
        Record<string, unknown>
      >;
      const anodeMaterial = canonicalMaterialToken(
        stackBlocks.anode_biofilm_support?.material_family,
      );
      const cathodeMaterial = canonicalMaterialToken(
        stackBlocks.cathode_catalyst_support?.catalyst_family ??
          stackBlocks.cathode_catalyst_support?.material_family,
      );
      const membraneMaterial = canonicalMaterialToken(
        stackBlocks.membrane_or_separator?.type,
      );
      const materials = dedupeStrings(
        [anodeMaterial, cathodeMaterial, membraneMaterial].filter(
          (value): value is string => Boolean(value),
        ),
      );
      const componentTypes = dedupeStrings([
        ...(anodeMaterial ? ['anode'] : []),
        ...(cathodeMaterial ? ['cathode', 'catalyst'] : []),
        ...(membraneMaterial ? ['membrane_separator'] : []),
      ]);
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
      const metricTypes = metricTypesForObjective(
        normalizedCase.primary_objective,
      );
      const benchmarkSlice = await withSpan(
        'case.evaluate.evidence_benchmark_slice',
        () =>
          input.evaluationRepository.getEvidenceBenchmarkSlice({
            application: normalizedCase.primary_objective,
            componentTypes,
            limit: 12,
            materials,
            metricTypes,
            systemType: systemTypeForTechnologyFamily(
              normalizedCase.technology_family,
            ),
          }),
        {
          case_id: normalizedCase.case_id,
          technology_family: normalizedCase.technology_family,
          primary_objective: normalizedCase.primary_objective,
        },
      );
      const evidenceDecisionContext = buildEvidenceDecisionContext({
        normalizedCase,
        benchmarkSlice,
        componentTypes,
        materials,
        metricTypes,
      });
      const evidenceBenchmarkObservations = [
        evidenceBenchmarkObservation({
          aggregateCount: benchmarkSlice.summary.aggregate_count,
          evidenceCount: benchmarkSlice.summary.evidence_count,
        }),
      ];
      const decisionDerivedObservations = [
        ...simulationEnrichment.derived_observations,
        ...evidenceBenchmarkObservations,
      ];
      const evaluationEnrichment = {
        ...simulationEnrichment,
        derived_observations: decisionDerivedObservations,
        provenance: {
          ...simulationEnrichment.provenance,
          source_refs: dedupeStrings([
            ...simulationEnrichment.provenance.source_refs,
            ...benchmarkSlice.evidence.map(
              (record) => `catalog:${record.catalog_item_id}`,
            ),
          ]),
          note: [
            simulationEnrichment.provenance.note,
            `Evidence benchmark slice used ${benchmarkSlice.summary.aggregate_count} aggregate range(s), ${benchmarkSlice.summary.evidence_count} top record(s), and a limit of ${benchmarkSlice.summary.limited_to}.`,
          ]
            .filter(Boolean)
            .join(' '),
        },
      };
      const decisionOutput = runCaseEvaluation(normalizedCase, {
        derivedObservations: decisionDerivedObservations,
        evidenceContext: evidenceDecisionContext,
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
        simulationEnrichment: evaluationEnrichment,
        evidenceDecisionContext,
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
        evidence_decision_context: evidenceDecisionContext,
        narrative: narrativeResult.narrative,
        narrative_metadata: narrativeResult.narrativeMetadata,
        simulation_enrichment: evaluationEnrichment,
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
