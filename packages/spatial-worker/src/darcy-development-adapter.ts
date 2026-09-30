import { resolve, join } from 'node:path';

import {
  LocalSpatialArtifactStore,
  LocalSpatialFieldArtifactStore,
} from '@metrev/spatial-artifact-store';

import { DarcyDevelopmentExecutor } from './darcy-development-executor';

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`${name} is required for the development Darcy executor`);
  return value;
}

function sidecarTimeout(): number {
  const raw = process.env.METREV_SPATIAL_SIDECAR_TIMEOUT_MS;
  if (raw === undefined) return 120_000;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 120_000)
    throw new Error('METREV_SPATIAL_SIDECAR_TIMEOUT_MS must be in [1, 120000]');
  return parsed;
}

const artifactRoot = resolve(
  requiredEnvironment('METREV_SPATIAL_DEVELOPMENT_ARTIFACT_ROOT'),
);

/**
 * Explicit opt-in executor module for local/development worker runs.
 * Product admission remains disabled unless the API receives a separate, reviewed admission.
 */
export const spatialSimulationExecutor = new DarcyDevelopmentExecutor({
  pythonExecutable: requiredEnvironment('METREV_SPATIAL_SIDECAR_PYTHON'),
  moduleDirectory: requiredEnvironment('METREV_SPATIAL_SIDECAR_MODULE_DIR'),
  artifactRoot: join(artifactRoot, 'sidecar-output'),
  timeoutMs: sidecarTimeout(),
  meshArtifactStore: new LocalSpatialArtifactStore({
    rootDirectory: join(artifactRoot, 'mesh-artifacts'),
  }),
  fieldArtifactStore: new LocalSpatialFieldArtifactStore({
    rootDirectory: join(artifactRoot, 'field-artifacts'),
  }),
});
