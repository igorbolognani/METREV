import { assertRuntimeAuthConfiguration } from '@metrev/auth';
import { assertRuntimeDatabaseReady } from '@metrev/database';
import { initializeTelemetry } from '@metrev/telemetry/node';

import { buildApp } from './app';

async function start(): Promise<void> {
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';
  let app = null;

  try {
    await initializeTelemetry('metrev-api-server');
    assertRuntimeAuthConfiguration();
    await assertRuntimeDatabaseReady();
    app = await buildApp();
    await app.listen({ host, port });
    app.log.info(`METREV API listening on ${host}:${port}`);
  } catch (error) {
    if (app) {
      app.log.error(error);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

void start();
