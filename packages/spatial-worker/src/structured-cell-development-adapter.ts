import { StructuredCellDevelopmentExecutor } from './structured-cell-executor';
import { developmentSidecarConfiguration } from './development-sidecar-config';

const configuration = developmentSidecarConfiguration(process.env);
/** Only loaded by an explicitly configured worker/API runtime module. */
export const spatialSimulationExecutor = new StructuredCellDevelopmentExecutor({
  ...configuration,
  artifactStore: configuration.fieldArtifactStore,
});
export const spatialFieldArtifactReader = configuration.fieldArtifactStore;
