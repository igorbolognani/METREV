import { afterEach, describe, expect, it } from 'vitest';

import {
    createWorkerHealthMonitor,
    startWorkerHealthServer,
    type StartedWorkerHealthServer,
} from '../../apps/research-worker/src/health';

describe('research worker health server', () => {
  let server: StartedWorkerHealthServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('reports startup, readiness, work progress, and fatal failures', async () => {
    const monitor = createWorkerHealthMonitor(
      () => new Date('2026-04-29T00:00:00.000Z'),
    );
    server = await startWorkerHealthServer({
      host: '127.0.0.1',
      monitor,
      port: 0,
    });

    let response = await fetch(server.url);
    expect(response.status).toBe(503);
    let payload = (await response.json()) as {
      fatal_error: string | null;
      last_cycle_result: {
        backfillsProcessed: number;
        extractionFailures: number;
        extractionJobsProcessed: number;
      } | null;
      ready: boolean;
      status: string;
    };
    expect(payload).toMatchObject({
      fatal_error: null,
      last_cycle_result: null,
      ready: false,
      status: 'starting',
    });

    monitor.markReady();
    response = await fetch(server.url);
    expect(response.status).toBe(200);
    payload = (await response.json()) as typeof payload;
    expect(payload).toMatchObject({
      ready: true,
      status: 'idle',
    });

    monitor.markCycleStart();
    response = await fetch(server.url);
    expect(response.status).toBe(200);
    payload = (await response.json()) as typeof payload;
    expect(payload.status).toBe('working');

    monitor.markCycleComplete({
      backfillsProcessed: 1,
      extractionFailures: 0,
      extractionJobsProcessed: 2,
    });
    response = await fetch(server.url);
    expect(response.status).toBe(200);
    payload = (await response.json()) as typeof payload;
    expect(payload).toMatchObject({
      last_cycle_result: {
        backfillsProcessed: 1,
        extractionFailures: 0,
        extractionJobsProcessed: 2,
      },
      ready: true,
      status: 'idle',
    });

    monitor.markFatal(new Error('worker boom'));
    response = await fetch(server.url);
    expect(response.status).toBe(503);
    payload = (await response.json()) as typeof payload;
    expect(payload).toMatchObject({
      fatal_error: 'worker boom',
      ready: false,
      status: 'fatal',
    });
  });

  it('returns not found for non-health routes', async () => {
    const monitor = createWorkerHealthMonitor();
    server = await startWorkerHealthServer({
      host: '127.0.0.1',
      monitor,
      port: 0,
    });

    const response = await fetch(server.url.replace('/health', '/unknown'));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not Found');
  });
});
