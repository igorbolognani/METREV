import {
  spatialSimulationResultSchema,
  type SpatialSimulationRunSnapshot,
} from '@metrev/domain-contracts';

import { validSpatialSimulationResult } from './spatial-simulation-result';

const RESULT_MANIFEST_LIMIT_BYTES = 2 * 1024 * 1024;

/** A schema-valid result whose bounded solver histories exceed the DB manifest budget. */
export function oversizedSpatialSimulationResult(
  run: SpatialSimulationRunSnapshot,
) {
  const history = Array.from({ length: 10_000 }, (_, index) => ({
    iteration: index + 1,
    nonlinear_residual: 1e-9 / (index + 1),
  }));
  const result = spatialSimulationResultSchema.parse({
    ...validSpatialSimulationResult(run),
    convergence: Array.from({ length: 6 }, (_, index) => ({
      solver_id: `oversized_solver_${index}`,
      method: 'newton',
      status: 'converged',
      residual_unit: '1',
      absolute_tolerance: 1e-8,
      relative_tolerance: 1e-8,
      iterations: history.length,
      history,
      termination_reason: 'tolerance_satisfied',
    })),
  });
  if (
    Buffer.byteLength(JSON.stringify(result), 'utf8') <=
    RESULT_MANIFEST_LIMIT_BYTES
  )
    throw new Error('Persistence fixture must exceed the 2 MiB metadata limit');
  return result;
}
