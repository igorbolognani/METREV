import { execFileSync } from 'node:child_process';

import type { FullConfig } from '@playwright/test';

import { playwrightBaseUrl } from './support/local-runtime';

function localViewComposeEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    COMPOSE_PROJECT_NAME:
      process.env.COMPOSE_PROJECT_NAME?.trim() || 'metrev-local-view',
    POSTGRES_PORT:
      process.env.PLAYWRIGHT_POSTGRES_PORT?.trim() ||
      process.env.POSTGRES_PORT?.trim() ||
      '5436',
    API_PORT: process.env.API_PORT?.trim() || '4012',
    WEB_PORT: process.env.WEB_PORT?.trim() || '3012',
    JAEGER_UI_PORT: process.env.JAEGER_UI_PORT?.trim() || '16689',
    OTLP_HTTP_PORT: process.env.OTLP_HTTP_PORT?.trim() || '4321',
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4012',
    AUTH_URL: process.env.AUTH_URL?.trim() || 'http://localhost:3012',
  };
}

function resolveActivePostgresPort(): string {
  const explicitPort = process.env.PLAYWRIGHT_POSTGRES_PORT?.trim();
  if (explicitPort) {
    return explicitPort;
  }

  try {
    const portMapping = execFileSync(
      'docker',
      ['compose', 'port', 'postgres', '5432'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: localViewComposeEnv(),
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();

    const resolvedPort = portMapping.split(':').at(-1)?.trim();
    if (resolvedPort) {
      return resolvedPort;
    }
  } catch {
    // Fall back to the documented default when docker compose metadata is unavailable.
  }

  return process.env.POSTGRES_PORT?.trim() || '5436';
}

function resolvePlaywrightDatabaseUrl(): string {
  const explicitUrl = process.env.PLAYWRIGHT_DATABASE_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const user = process.env.POSTGRES_USER?.trim() || 'metrev';
  const password = process.env.POSTGRES_PASSWORD?.trim() || 'metrev';
  const database = process.env.POSTGRES_DB?.trim() || 'metrev';
  const port = resolveActivePostgresPort();

  return `postgresql://${user}:${password}@localhost:${port}/${database}?schema=public`;
}

async function assertLocalRuntimeReachable(url: string): Promise<void> {
  const response = await fetch(`${url}/login`, {
    redirect: 'manual',
  });

  if (!response.ok && response.status !== 302 && response.status !== 307) {
    throw new Error(
      `Local runtime is not reachable at ${url}. Run pnpm run local:view:up before running Playwright E2E.`,
    );
  }
}

export default async function globalSetup(_: FullConfig): Promise<void> {
  await assertLocalRuntimeReachable(playwrightBaseUrl);
  const localDatabaseUrl = resolvePlaywrightDatabaseUrl();

  execFileSync('pnpm', ['run', 'db:bootstrap:e2e'], {
    env: {
      ...process.env,
      DATABASE_URL: localDatabaseUrl,
      DIRECT_URL: localDatabaseUrl,
    },
    stdio: 'inherit',
  });
}
