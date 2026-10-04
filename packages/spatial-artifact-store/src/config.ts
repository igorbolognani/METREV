import { z } from 'zod';

const integer = (fallback: number, minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      value === undefined
        ? fallback
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : value,
    z.number().int().min(minimum).max(maximum),
  );

const schema = z
  .object({
    maxObjectBytes: integer(256 * 1024 * 1024, 1, 4 * 1024 * 1024 * 1024),
    chunkBytes: integer(64 * 1024, 4 * 1024, 4 * 1024 * 1024),
    stagingTtlMs: integer(24 * 60 * 60 * 1000, 1_000, 30 * 24 * 60 * 60 * 1000),
  })
  .strict();

/** Pure configuration parsing; it performs no filesystem or provider access. */
export function spatialArtifactStoreConfigFromEnvironment(
  environment: Record<string, string | undefined>,
) {
  return schema.parse({
    maxObjectBytes: environment.METREV_SPATIAL_ARTIFACT_MAX_BYTES,
    chunkBytes: environment.METREV_SPATIAL_ARTIFACT_CHUNK_BYTES,
    stagingTtlMs: environment.METREV_SPATIAL_ARTIFACT_STAGING_TTL_MS,
  });
}
