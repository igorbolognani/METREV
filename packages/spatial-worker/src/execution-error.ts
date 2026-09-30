import { spatialSimulationFailureSchema } from '@metrev/domain-contracts';
import { SidecarTransportError } from '@metrev/spatial-sidecar-client';

const sidecarFailures = {
  timeout: {
    code: 'spatial_sidecar_timeout',
    message: 'The spatial solver exceeded its process time limit',
  },
  cancelled: {
    code: 'spatial_sidecar_cancelled',
    message: 'The spatial solver process was cancelled',
  },
  process_failure: {
    code: 'spatial_sidecar_process_failure',
    message: 'The spatial solver process exited unexpectedly',
  },
  invalid_response: {
    code: 'spatial_sidecar_invalid_response',
    message: 'The spatial solver returned invalid protocol data',
  },
  artifact_integrity: {
    code: 'spatial_artifact_integrity_failure',
    message: 'The spatial solver artifacts failed integrity validation',
  },
} satisfies Record<
  SidecarTransportError['code'],
  { code: string; message: string }
>;

/** Failure detail safe to persist and return through the run API. */
export class SpatialSimulationExecutionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    const failure = spatialSimulationFailureSchema.parse({ code, message });
    super(failure.message);
    this.name = 'SpatialSimulationExecutionError';
    this.code = failure.code;
  }
}

/** Map low-level solver transport errors to stable, non-sensitive run failures. */
export function normalizeSpatialSimulationExecutionError(
  error: unknown,
): unknown {
  if (error instanceof SpatialSimulationExecutionError) return error;
  if (error instanceof SidecarTransportError) {
    const failure = sidecarFailures[error.code];
    return new SpatialSimulationExecutionError(failure.code, failure.message);
  }
  return error;
}
