import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  spatialModelInputV2Schema,
  spatialModelInputV2Sha256,
} from './spatial-model-v2-schema';
import {
  structuredCellInputSchema,
  type StructuredCellInput,
} from './structured-cell-schema';

export const spatialRuntimeInputSchema = z.union([
  spatialModelInputV2Schema,
  structuredCellInputSchema,
]);
export type SpatialRuntimeInput = z.infer<typeof spatialRuntimeInputSchema>;
export function spatialRuntimeInputSha256(candidate: unknown): string {
  const input = spatialRuntimeInputSchema.parse(candidate);
  if (input.contract_version === 'spatial-input-v2')
    return spatialModelInputV2Sha256(input);
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
export function structuredCellGeometrySha256(
  input: StructuredCellInput,
): string {
  return createHash('sha256')
    .update(JSON.stringify(input.geometry))
    .digest('hex');
}
export function spatialRuntimeMeshRequestSha256(
  input: SpatialRuntimeInput,
): string {
  return input.contract_version === 'spatial-input-v2'
    ? input.mesh.input_sha256
    : structuredCellGeometrySha256(input);
}
