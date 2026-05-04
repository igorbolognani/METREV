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

function localApiBaseUrl() {
  return (
    process.env.PLAYWRIGHT_API_BASE_URL?.trim() ||
    localViewComposeEnv().NEXT_PUBLIC_API_BASE_URL
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
  const user = process.env.POSTGRES_USER?.trim() || 'metrev';
  const password = process.env.POSTGRES_PASSWORD?.trim() || 'metrev';
  const database = process.env.POSTGRES_DB?.trim() || 'metrev';
  const port = resolveActivePostgresPort();

  return `postgresql://${user}:${password}@localhost:${port}/${database}?schema=public`;
}

function redactUrlForLog(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password) {
      url.username = url.username ? 'redacted' : '';
      url.password = url.password ? 'redacted' : '';
    }

    return url.toString();
  } catch {
    return '[unprintable-url]';
  }
}

function logValidationError() {
  console.error(
    'Local validation failed; sensitive runtime URLs were not logged.',
  );
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

async function assertLocalApiHealth(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/health`);

  if (!response.ok) {
    throw new Error(
      `Local API health check failed at ${apiBaseUrl}/health with status ${response.status}.`,
    );
  }

  const payload = await response.json().catch(() => null);

  if (payload?.status !== 'ok') {
    throw new Error(
      `Local API health check at ${apiBaseUrl}/health returned unexpected payload ${JSON.stringify(payload)}.`,
    );
  }
}

async function ensureLocalViewStack(url) {
  if (await localRuntimeReachable(url)) {
    console.log(
      `Local-view runtime already reachable at ${redactUrlForLog(url)}.`,
    );
    return false;
  }

  console.log(`Starting local-view runtime at ${redactUrlForLog(url)}...`);
  execPnpm(['run', 'local:view:up']);
  await waitForLocalRuntime(url);
  return true;
}

async function runLocalSmokeValidation({
  runtimeUrl,
  apiBaseUrl,
  validationEnv,
}) {
  console.log(
    `Running local-view smoke validation against ${redactUrlForLog(runtimeUrl)} and ${redactUrlForLog(apiBaseUrl)}...`,
  );

  await assertLocalApiHealth(apiBaseUrl);
  execPnpm(['run', 'test:e2e:smoke'], {
    ...validationEnv,
    PLAYWRIGHT_SKIP_BOOTSTRAP: '1',
  });
}

async function main() {
  const smokeOnly = process.argv.includes('--smoke-only');
  const skipSmoke = process.env.METREV_SKIP_LOCAL_SMOKE?.trim() === '1';
  const runtimeUrl = localViewRuntimeUrl();
  const startedLocalView = await ensureLocalViewStack(runtimeUrl);
  const localDatabaseUrl = resolveLocalDatabaseUrl();
  const localComposeEnv = localViewComposeEnv();
  const apiBaseUrl = localApiBaseUrl();
  const validationEnv = {
    DATABASE_URL: localDatabaseUrl,
    DIRECT_URL: localDatabaseUrl,
    PLAYWRIGHT_DATABASE_URL: localDatabaseUrl,
    PLAYWRIGHT_BASE_URL: runtimeUrl,
    PLAYWRIGHT_API_BASE_URL:
      process.env.PLAYWRIGHT_API_BASE_URL?.trim() || apiBaseUrl,
  };

  if (smokeOnly || !skipSmoke) {
    await runLocalSmokeValidation({
      runtimeUrl,
      apiBaseUrl,
      validationEnv,
    });
  }

  if (smokeOnly) {
    if (startedLocalView) {
      console.log(
        'Local-view runtime was started for smoke validation and remains running.',
      );
    }

    return;
  }

  console.log(
    `Using local validation database ${redactUrlForLog(localDatabaseUrl)}.`,
  );
  execPnpm(['run', 'db:migrate:deploy'], validationEnv);
  execPnpm(['run', 'db:seed'], validationEnv);
  execPnpm(['run', 'test:db'], validationEnv);
  execPnpm(['run', 'test:e2e'], validationEnv);

  if (startedLocalView) {
    console.log(
      'Local-view runtime was started for validation and remains running.',
    );
  }
}

main().catch((error) => {
  logValidationError(error);
  process.exitCode = 1;
});
