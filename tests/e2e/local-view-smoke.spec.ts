import { expect, test } from '@playwright/test';

import { playwrightApiBaseUrl } from './support/local-runtime';

test.describe('local-view smoke', () => {
  test('serves the public landing and login entrypoints', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('public-overview-hub')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'METREV BIOELETROCHEMICAL DECISION SUPPORT',
      }),
    ).toBeVisible();

    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('reports API health through the local runtime boundary', async ({
    request,
  }) => {
    const response = await request.get(`${playwrightApiBaseUrl}/health`);

    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toMatchObject({
      service: 'api-server',
      status: 'ok',
    });
  });
});
