import { defineConfig } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3012';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/e2e/global.setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
