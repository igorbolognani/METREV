import { resolve, join } from 'node:path';

import {
  LocalSpatialArtifactStore,
  LocalSpatialFieldArtifactStore,
} from '@metrev/spatial-artifact-store';

import { StokesDevelopmentExecutor } from './stokes-development-executor';

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`${name} is required for the development Stokes executor`);
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

/** Explicit opt-in worker module. Product run admission remains separately closed. */
export const spatialSimulationExecutor = new StokesDevelopmentExecutor({
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
