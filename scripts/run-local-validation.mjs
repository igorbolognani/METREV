import { execFileSync } from 'node:child_process';

const DEFAULT_COMPOSE_PROJECT = 'metrev-local-view';
const DEFAULT_POSTGRES_PORT = '5436';
const DEFAULT_API_PORT = '4012';
const DEFAULT_WEB_PORT = '3012';
const DEFAULT_JAEGER_UI_PORT = '16689';
const DEFAULT_OTLP_HTTP_PORT = '4321';

function localViewComposeEnv() {
  return {
    ...process.env,
    COMPOSE_PROJECT_NAME:
      process.env.COMPOSE_PROJECT_NAME?.trim() || DEFAULT_COMPOSE_PROJECT,
    POSTGRES_PORT:
      process.env.PLAYWRIGHT_POSTGRES_PORT?.trim() ||
      process.env.POSTGRES_PORT?.trim() ||
      DEFAULT_POSTGRES_PORT,
    API_PORT: process.env.API_PORT?.trim() || DEFAULT_API_PORT,
    WEB_PORT: process.env.WEB_PORT?.trim() || DEFAULT_WEB_PORT,
    JAEGER_UI_PORT:
      process.env.JAEGER_UI_PORT?.trim() || DEFAULT_JAEGER_UI_PORT,
    OTLP_HTTP_PORT:
      process.env.OTLP_HTTP_PORT?.trim() || DEFAULT_OTLP_HTTP_PORT,
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      `http://localhost:${process.env.API_PORT?.trim() || DEFAULT_API_PORT}`,
    AUTH_URL:
      process.env.AUTH_URL?.trim() ||
      `http://localhost:${process.env.WEB_PORT?.trim() || DEFAULT_WEB_PORT}`,
  };
}

function localViewRuntimeUrl() {
  return (
    process.env.PLAYWRIGHT_BASE_URL?.trim() || localViewComposeEnv().AUTH_URL
  );
}

function execPnpm(args, envOverrides = {}) {
  execFileSync('pnpm', args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...envOverrides,
    },
    stdio: 'inherit',
  });
}

function resolveActivePostgresPort() {
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

  return process.env.POSTGRES_PORT?.trim() || DEFAULT_POSTGRES_PORT;
}

function resolveLocalDatabaseUrl() {
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

async function localRuntimeReachable(url) {
  try {
    const response = await fetch(`${url}/login`, {
      redirect: 'manual',
    });

    return response.ok || response.status === 302 || response.status === 307;
  } catch {
    return false;
  }
}

async function waitForLocalRuntime(url, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await localRuntimeReachable(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(
    `Local runtime is not reachable at ${url} after waiting ${timeoutMs}ms.`,
  );
}

async function ensureLocalViewStack(url) {
  if (await localRuntimeReachable(url)) {
    console.log(`Local-view runtime already reachable at ${url}.`);
    return false;
  }

  console.log(`Starting local-view runtime at ${url}...`);
  execPnpm(['run', 'local:view:up']);
  await waitForLocalRuntime(url);
  return true;
}

async function main() {
  const runtimeUrl = localViewRuntimeUrl();
  const startedLocalView = await ensureLocalViewStack(runtimeUrl);
  const localDatabaseUrl = resolveLocalDatabaseUrl();
  const validationEnv = {
    DATABASE_URL: localDatabaseUrl,
    DIRECT_URL: localDatabaseUrl,
  };

  console.log(`Using local validation database ${localDatabaseUrl}.`);
  execPnpm(['run', 'db:seed'], validationEnv);
  execPnpm(['run', 'test:db'], validationEnv);
  execPnpm(['run', 'test:e2e']);

  if (startedLocalView) {
    console.log(
      'Local-view runtime was started for validation and remains running.',
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
