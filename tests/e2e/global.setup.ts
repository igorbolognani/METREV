import { execFileSync } from 'node:child_process';

import type { FullConfig } from '@playwright/test';

import { playwrightBaseUrl } from './support/local-runtime';

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
  execFileSync('pnpm', ['run', 'db:bootstrap:e2e'], {
    stdio: 'inherit',
  });
}
