import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  structuredCellInputSchema,
  spatialRuntimeInputSha256,
  spatialRuntimeMeshRequestSha256,
  canonicalJsonStringify,
  type CaseSpatialRequest,
} from '@metrev/domain-contracts';
import { resolveCaseSpatialComposition } from '@metrev/electrochem-models';

export class CaseSpatialEvaluationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
// Stable across PostgreSQL JSONB key ordering; arrays retain their scientific order.
export function caseSnapshotSha256(value: unknown): string {
  return createHash('sha256')
    .update(canonicalJsonStringify(value))
    .digest('hex');
}
export async function getOwnedSpatialCaseEvaluation(
  app: FastifyInstance,
  evaluationId: string,
  ownerId: string,
) {
  const evaluation = await app.evaluationRepository.getEvaluation(evaluationId);
  if (!evaluation || evaluation.audit_record.actor_id !== ownerId)
    throw new CaseSpatialEvaluationError(
      404,
      'not_found',
      'Evaluation was not found.',
    );
  return evaluation;
}

/** Existing evaluation identity owns the async branch of the common case pathway. */
export async function createPersistedCaseSpatialEvaluation(
  app: FastifyInstance,
  evaluationId: string,
  ownerId: string,
  request: CaseSpatialRequest,
  key: string,
  enqueue: boolean,
) {
  const evaluation = await getOwnedSpatialCaseEvaluation(
    app,
    evaluationId,
    ownerId,
  );
  const snapshot = evaluation.audit_record.normalized_case_snapshot;
  if (!snapshot)
    return {
      status: 'insufficient_data' as const,
      resolution: {
        model_id: request.model_id,
        dimension: request.dimension,
        missing_inputs: [
          'immutable evaluation normalized_case_snapshot; create a fresh evaluation',
        ],
        missing_modules: [],
        unsupported_configuration: [],
        equation_graph: null,
        decision_eligible: false,
      },
      run: null,
      created: false,
    };
  const resolution = resolveCaseSpatialComposition(snapshot, request);
  if (resolution.status !== 'ready')
    return { status: resolution.status, resolution, run: null, created: false };
  const input = structuredCellInputSchema.parse({
    ...resolution.input,
    case_context: {
      version: 'structured-cell-case-context-v1',
      case_id: snapshot.case_id,
      evaluation_id: evaluationId,
      normalized_case_sha256: caseSnapshotSha256(snapshot),
      mapping_policy: 'explicit_layer_to_case_stack_block_v1',
      component_domains: resolution.component_domains,
      architecture_family: snapshot.architecture_family,
      input_role: 'source_traced_case_development_input',
      decision_eligible: false,
    },
  });
  const plan = { ...resolution, input };
  if (!enqueue)
    return {
      status: 'ready' as const,
      resolution: plan,
      run: null,
      created: false,
    };
  const admission = app.spatialSimulationRunAdmission;
  if (!admission)
    throw new CaseSpatialEvaluationError(
      503,
      'spatial_execution_unavailable',
      'Configure the matching development API and worker adapters before execution.',
    );
  let supported = false;
  try {
    supported = admission.supports(input);
  } catch {
    throw new CaseSpatialEvaluationError(
      503,
      'spatial_admission_failed',
      'Spatial admission failed.',
    );
  }
  if (!supported)
    throw new CaseSpatialEvaluationError(
      422,
      'not_implemented',
      'The registered executor cannot execute the requested case profile.',
    );
  const result = await app.spatialSimulationRunRepository.createOrGet({
    owner_id: ownerId,
    evaluation_id: evaluationId,
    idempotency_key: key,
    model_id: input.model_id,
    system: input.system,
    dimension: input.dimension,
    input_contract_version: input.contract_version,
    input_sha256: spatialRuntimeInputSha256(input),
    mesh_request_sha256: spatialRuntimeMeshRequestSha256(input),
    input_snapshot: input,
    solver_version: admission.solverVersion,
    runtime_version: admission.runtimeVersion,
  });
  return { status: result.run.status, resolution: plan, ...result };
}
