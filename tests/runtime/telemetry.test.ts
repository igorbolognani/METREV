import { createServer } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import {
  initializeTelemetry,
  shutdownTelemetry,
} from '../../packages/telemetry/src/node-sdk';
import { withSpan } from '@metrev/telemetry';

const originalTelemetryEnabled = process.env.METREV_OTEL_ENABLED;
const originalOtlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const originalOtlpTracesEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

describe.sequential('telemetry export', () => {
  afterEach(async () => {
    await shutdownTelemetry();

    if (originalTelemetryEnabled === undefined) {
      delete process.env.METREV_OTEL_ENABLED;
    } else {
      process.env.METREV_OTEL_ENABLED = originalTelemetryEnabled;
    }

    if (originalOtlpEndpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalOtlpEndpoint;
    }

    if (originalOtlpTracesEndpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT =
        originalOtlpTracesEndpoint;
    }
  });

  it('exports spans to the configured OTLP HTTP endpoint', async () => {
    const requests: string[] = [];

    const server = createServer((request, response) => {
      requests.push(request.url ?? '');
      request.resume();
      request.on('end', () => {
        response.statusCode = 200;
        response.end('{}');
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to bind the telemetry test server.');
      }

      process.env.METREV_OTEL_ENABLED = 'true';
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `http://127.0.0.1:${address.port}/v1/traces`;

      await initializeTelemetry('metrev-telemetry-test');
      await withSpan('telemetry.test', async () => 'ok', {
        suite: 'runtime',
      });
      await shutdownTelemetry();

      expect(requests).toContain('/v1/traces');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });
});
