import { defineConfig } from '@playwright/test';

const port = process.env.SITE_PREVIEW_PORT?.trim() || '3184';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/site-preview-e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory site-dist`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
