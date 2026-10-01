import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { BuildAppOptions } from './app';

/** An operator-supplied local adapter is required; no default solver is promoted. */
export async function configuredSpatialRuntime(
  environment: NodeJS.ProcessEnv,
): Promise<
  Pick<
    BuildAppOptions,
    'spatialSimulationRunAdmission' | 'spatialFieldArtifactReader'
  >
> {
  const path = environment.METREV_SPATIAL_API_RUNTIME_MODULE;
  if (path === undefined) return {};
  if (!path.trim())
    throw new Error('Spatial API runtime module path must not be empty');
  const loaded = (await import(pathToFileURL(resolve(path)).href)) as {
    spatialSimulationExecutor?: BuildAppOptions['spatialSimulationRunAdmission'];
    spatialFieldArtifactReader?: BuildAppOptions['spatialFieldArtifactReader'];
  };
  const admission = loaded.spatialSimulationExecutor;
  const reader = loaded.spatialFieldArtifactReader;
  if (
    !admission ||
    typeof admission.supports !== 'function' ||
    typeof admission.solverVersion !== 'string' ||
    !admission.solverVersion.trim() ||
    typeof admission.runtimeVersion !== 'string' ||
    !admission.runtimeVersion.trim() ||
    !reader ||
    typeof reader.readField !== 'function'
  )
    throw new Error(
      'Spatial runtime module must export an admission and an artifact reader',
    );
  return {
    spatialSimulationRunAdmission: admission,
    spatialFieldArtifactReader: reader,
  };
}
