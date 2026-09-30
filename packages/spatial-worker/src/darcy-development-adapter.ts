import { DarcyDevelopmentExecutor } from './darcy-development-executor';
import { developmentSidecarConfiguration } from './development-sidecar-config';

/** Explicit development opt-in; product admission remains separately closed. */
export const spatialSimulationExecutor = new DarcyDevelopmentExecutor(
  developmentSidecarConfiguration(process.env),
);
