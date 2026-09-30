import { resolve, join } from 'node:path';

import {
  LocalSpatialArtifactStore,
  LocalSpatialFieldArtifactStore,
} from '@metrev/spatial-artifact-store';
import { validateSpatialContainerOptions } from '@metrev/spatial-sidecar-client';

function required(environment: NodeJS.ProcessEnv, name: string) {
  const value = environment[name]?.trim();
  if (!value)
    throw new Error(`${name} is required for the development spatial executor`);
  return value;
}

function integer(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const raw = environment[name];
  const value =
    raw === undefined ? fallback : /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new RangeError(`${name} must be in [${minimum}, ${maximum}]`);
  return value;
}

/** Development-only factory shared by both physical regimes; product admission is separate. */
export function developmentSidecarConfiguration(
  environment: NodeJS.ProcessEnv,
) {
  const artifactRoot = resolve(
    required(environment, 'METREV_SPATIAL_DEVELOPMENT_ARTIFACT_ROOT'),
  );
  const image = environment.METREV_SPATIAL_SIDECAR_IMAGE;
  const container =
    image === undefined
      ? undefined
      : validateSpatialContainerOptions({
          image,
          cpus: (() => {
            const raw = environment.METREV_SPATIAL_SIDECAR_CPUS;
            if (raw === undefined) return 2;
            if (!/^(?:\d+)(?:\.\d+)?$/.test(raw))
              throw new RangeError(
                'METREV_SPATIAL_SIDECAR_CPUS must be numeric',
              );
            return Number(raw);
          })(),
          memoryMiB: integer(
            environment,
            'METREV_SPATIAL_SIDECAR_MEMORY_MIB',
            4096,
            128,
            4096,
          ),
          pidsLimit: integer(
            environment,
            'METREV_SPATIAL_SIDECAR_PIDS',
            256,
            32,
            512,
          ),
          temporaryMiB: integer(
            environment,
            'METREV_SPATIAL_SIDECAR_TEMP_MIB',
            512,
            32,
            1024,
          ),
          ...(environment.METREV_SPATIAL_DOCKER_EXECUTABLE !== undefined
            ? {
                dockerExecutable: required(
                  environment,
                  'METREV_SPATIAL_DOCKER_EXECUTABLE',
                ),
              }
            : {}),
        });
  return {
    pythonExecutable: container
      ? 'python3'
      : required(environment, 'METREV_SPATIAL_SIDECAR_PYTHON'),
    moduleDirectory: container
      ? artifactRoot
      : required(environment, 'METREV_SPATIAL_SIDECAR_MODULE_DIR'),
    artifactRoot: join(artifactRoot, 'sidecar-output'),
    timeoutMs: integer(
      environment,
      'METREV_SPATIAL_SIDECAR_TIMEOUT_MS',
      120000,
      1,
      120000,
    ),
    ...(container ? { container } : {}),
    meshArtifactStore: new LocalSpatialArtifactStore({
      rootDirectory: join(artifactRoot, 'mesh-artifacts'),
    }),
    fieldArtifactStore: new LocalSpatialFieldArtifactStore({
      rootDirectory: join(artifactRoot, 'field-artifacts'),
    }),
  };
}
