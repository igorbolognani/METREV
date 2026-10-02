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
/** Versioned case binding uses locale-independent object order; arrays remain ordered. */
export function canonicalJsonStringify(value: unknown): string {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([key, child]) => [key, canonical(child)]),
          )
        : v;
  return JSON.stringify(canonical(value));
}
export function serializeStructuredCellInput(
  input: StructuredCellInput,
): string {
  return input.case_context
    ? canonicalJsonStringify(input)
    : JSON.stringify(input);
}
export function serializeStructuredCellGeometry(
  input: StructuredCellInput,
): string {
  return input.case_context
    ? canonicalJsonStringify(input.geometry)
    : JSON.stringify(input.geometry);
}
export function spatialRuntimeInputSha256(candidate: unknown): string {
  const input = spatialRuntimeInputSchema.parse(candidate);
  if (input.contract_version === 'spatial-input-v2')
    return spatialModelInputV2Sha256(input);
  return createHash('sha256')
    .update(serializeStructuredCellInput(input))
    .digest('hex');
}
export function structuredCellGeometrySha256(
  input: StructuredCellInput,
): string {
  return createHash('sha256')
    .update(serializeStructuredCellGeometry(input))
    .digest('hex');
}
export function spatialRuntimeMeshRequestSha256(
  input: SpatialRuntimeInput,
): string {
  return input.contract_version === 'spatial-input-v2'
    ? input.mesh.input_sha256
    : structuredCellGeometrySha256(input);
}
