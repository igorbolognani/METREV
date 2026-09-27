// Exercise the same Node ESM + tsx path used by the API container. Vitest and
// the web bundler resolve JSON differently and cannot catch this integration.
import {
  spatialModelInputSchema,
  spatialParameterAuthority,
} from '../packages/domain-contracts/src/spatial-model-schema.ts';

if (spatialParameterAuthority.schema_version !== 1)
  throw new Error('Spatial parameter authority version mismatch');
if (!spatialModelInputSchema) throw new Error('Spatial schema is unavailable');

console.log('spatial Node ESM import: pass');
