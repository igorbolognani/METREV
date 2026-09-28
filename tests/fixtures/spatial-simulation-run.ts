import {
  spatialModelInputV2Schema,
  spatialModelInputV2Sha256,
  type CreateSpatialSimulationRunInput,
} from '@metrev/domain-contracts';

import { validSpatialInput } from './spatial-input-v2';

export function createSpatialSimulationRunInput(input: {
  ownerId: string;
  idempotencyKey: string;
}): CreateSpatialSimulationRunInput {
  const modelInput = spatialModelInputV2Schema.parse(validSpatialInput());
  return {
    owner_id: input.ownerId,
    evaluation_id: null,
    idempotency_key: input.idempotencyKey,
    model_id: modelInput.model_id,
    system: modelInput.system,
    dimension: modelInput.dimension,
    input_contract_version: modelInput.contract_version,
    input_sha256: spatialModelInputV2Sha256(modelInput),
    solver_version: 'solver-dev-1',
    runtime_version: 'sidecar-dev-1',
    mesh_request_sha256: modelInput.mesh.input_sha256,
    input_snapshot: modelInput,
  };
}
