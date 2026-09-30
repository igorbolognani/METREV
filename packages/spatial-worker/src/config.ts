import { z } from 'zod';

const integerSetting = (fallback: number, minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      value === undefined
        ? fallback
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : value,
    z.number().int().min(minimum).max(maximum),
  );

const configSchema = z.object({
  pollMs: integerSetting(2_000, 250, 60_000),
  maxJobs: integerSetting(1, 1, 20),
  leaseDurationMs: integerSetting(60_000, 1_000, 300_000),
  executionTimeoutMs: integerSetting(900_000, 1_000, 1_800_000),
});

/** Invalid configuration fails before opening the database or claiming jobs. */
export function spatialWorkerConfigFromEnvironment(
  environment: Record<string, string | undefined>,
) {
  return configSchema.parse({
    pollMs: environment.METREV_SPATIAL_WORKER_POLL_MS,
    maxJobs: environment.METREV_SPATIAL_WORKER_MAX_JOBS_PER_CYCLE,
    leaseDurationMs: environment.METREV_SPATIAL_WORKER_LEASE_MS,
    executionTimeoutMs: environment.METREV_SPATIAL_WORKER_TIMEOUT_MS,
  });
}
