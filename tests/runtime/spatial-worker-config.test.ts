import { describe, expect, it } from 'vitest';
import { spatialWorkerConfigFromEnvironment } from '../../packages/spatial-worker/src/config';

describe('spatial service configuration', () => {
  it('uses explicit operational defaults and bounded settings', () => {
    expect(spatialWorkerConfigFromEnvironment({})).toEqual({
      pollMs: 2000,
      maxJobs: 1,
      leaseDurationMs: 60000,
      executionTimeoutMs: 900000,
    });
    expect(
      spatialWorkerConfigFromEnvironment({
        METREV_SPATIAL_WORKER_MAX_JOBS_PER_CYCLE: '20',
        METREV_SPATIAL_WORKER_TIMEOUT_MS: '1800000',
      }),
    ).toMatchObject({ maxJobs: 20, executionTimeoutMs: 1800000 });
  });
  it.each(['10garbage', '1.5', '-2', '', ' ', '0', '21', '9007199254740992'])(
    'rejects malformed or unbounded batch size %j',
    (value) => {
      expect(() =>
        spatialWorkerConfigFromEnvironment({
          METREV_SPATIAL_WORKER_MAX_JOBS_PER_CYCLE: value,
        }),
      ).toThrow();
    },
  );
  it('imports the public worker API without starting a CLI or opening a database', async () => {
    const api = await import('../../packages/spatial-worker/src/index');
    expect(api.runSpatialSimulationWorkerCycle).toBeTypeOf('function');
  });
});
