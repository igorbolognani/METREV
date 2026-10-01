import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

const webURL = 'http://localhost:3024';
const apiURL = 'http://localhost:4024';
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  ),
);
Object.assign(env, {
  METREV_SPATIAL_E2E: '1',
  PORT: '4024',
  HOST: '127.0.0.1',
  METREV_STORAGE_MODE: 'postgres',
  AUTH_URL: webURL,
  NEXT_PUBLIC_API_BASE_URL: apiURL,
  PLAYWRIGHT_BASE_URL: webURL,
  PLAYWRIGHT_API_BASE_URL: apiURL,
  METREV_SPATIAL_API_RUNTIME_MODULE: resolve(
    'packages/spatial-worker/src/structured-cell-development-adapter.ts',
  ),
  METREV_SPATIAL_WORKER_EXECUTOR_MODULE: resolve(
    'packages/spatial-worker/src/structured-cell-development-adapter.ts',
  ),
  METREV_SPATIAL_SIDECAR_PYTHON: 'python3',
  METREV_SPATIAL_SIDECAR_MODULE_DIR: resolve('apps/spatial-sidecar'),
  METREV_SPATIAL_DEVELOPMENT_ARTIFACT_ROOT: resolve(
    'test-results/spatial-cell-artifacts',
  ),
  METREV_SPATIAL_WORKER_POLL_MS: '250',
  METREV_SPATIAL_WORKER_TIMEOUT_MS: '30000',
});
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'structured-cell-workbench.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 20000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/spatial-cell' }],
  ],
  use: {
    baseURL: webURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/run-spatial-cell-e2e-runtime.mjs',
      url: apiURL + '/health',
      env,
      timeout: 90000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
    },
    {
      command: 'pnpm --filter @metrev/web-ui dev --port 3024',
      url: webURL + '/login',
      env,
      timeout: 180000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
    },
  ],
});
