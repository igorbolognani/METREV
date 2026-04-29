import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { ResearchWorkerCycleResult } from './worker';

export type WorkerHealthStatus = 'starting' | 'idle' | 'working' | 'fatal';

export interface WorkerHealthSnapshot {
  fatal_error: string | null;
  last_cycle_completed_at: string | null;
  last_cycle_result: ResearchWorkerCycleResult | null;
  last_cycle_started_at: string | null;
  ready: boolean;
  started_at: string;
  status: WorkerHealthStatus;
}

export interface WorkerHealthMonitor {
  markCycleComplete(result: ResearchWorkerCycleResult): void;
  markCycleStart(): void;
  markFatal(error: unknown): void;
  markReady(): void;
  snapshot(): WorkerHealthSnapshot;
}

export interface StartedWorkerHealthServer {
  close(): Promise<void>;
  url: string;
}

export function createWorkerHealthMonitor(
  now: () => Date = () => new Date(),
): WorkerHealthMonitor {
  const startedAt = now().toISOString();
  let status: WorkerHealthStatus = 'starting';
  let ready = false;
  let lastCycleStartedAt: string | null = null;
  let lastCycleCompletedAt: string | null = null;
  let lastCycleResult: ResearchWorkerCycleResult | null = null;
  let fatalError: string | null = null;

  return {
    markReady() {
      ready = true;
      fatalError = null;
      if (status === 'starting' || status === 'fatal') {
        status = 'idle';
      }
    },
    markCycleStart() {
      ready = true;
      fatalError = null;
      status = 'working';
      lastCycleStartedAt = now().toISOString();
    },
    markCycleComplete(result) {
      ready = true;
      fatalError = null;
      status = 'idle';
      lastCycleCompletedAt = now().toISOString();
      lastCycleResult = result;
    },
    markFatal(error) {
      ready = false;
      status = 'fatal';
      fatalError =
        error instanceof Error
          ? error.message
          : String(error ?? 'Unknown error');
    },
    snapshot() {
      return {
        fatal_error: fatalError,
        last_cycle_completed_at: lastCycleCompletedAt,
        last_cycle_result: lastCycleResult,
        last_cycle_started_at: lastCycleStartedAt,
        ready,
        started_at: startedAt,
        status,
      };
    },
  };
}

export async function startWorkerHealthServer(input: {
  host: string;
  monitor: WorkerHealthMonitor;
  port: number;
}): Promise<StartedWorkerHealthServer> {
  const server = createServer((request, response) => {
    if (request.url !== '/health') {
      response.statusCode = 404;
      response.setHeader('content-type', 'text/plain; charset=utf-8');
      response.end('Not Found');
      return;
    }

    const snapshot = input.monitor.snapshot();
    response.statusCode = snapshot.ready ? 200 : 503;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(snapshot));
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(input.port, input.host);
  });

  const address = server.address() as AddressInfo | null;
  const resolvedPort = address?.port ?? input.port;

  return {
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    url: `http://${input.host}:${resolvedPort}/health`,
  };
}
