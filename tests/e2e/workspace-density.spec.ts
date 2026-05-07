import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

import {
  analystEmail,
  analystPassword,
  seededResearchReviewFixtures,
} from './support/local-runtime';

const desktopViewports = [
  { height: 768, label: '1366x768', width: 1366 },
  { height: 900, label: '1440x900', width: 1440 },
  { height: 1080, label: '1920x1080', width: 1920 },
] as const;

const workspacePaths = [
  '/dashboard',
  '/cases/new',
  '/evaluations',
  '/reports',
  '/admin/intelligence/evidence/explorer',
  '/admin/intelligence/evidence/review',
  '/admin/intelligence/research/reviews',
] as const;

function playwrightDatabaseEnv(): NodeJS.ProcessEnv {
  const databaseUrl =
    process.env.PLAYWRIGHT_DATABASE_URL?.trim() ||
    'postgresql://metrev:metrev@localhost:5436/metrev?schema=public';

  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };
}

async function signInAsAnalyst(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(analystEmail);
  await page.getByLabel('Password').fill(analystPassword);
  await Promise.all([
    page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);

  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

async function expectWorkspaceToFitViewport(
  page: import('@playwright/test').Page,
  label: string,
) {
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const metrics = await page.evaluate(() => {
    const main = document.querySelector('.app-main');
    const mainRect = main?.getBoundingClientRect();

    return {
      documentOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      hasWorkspacePage: Boolean(document.querySelector('.workspace-page')),
      mainRight: mainRect?.right ?? 0,
      viewportWidth: window.innerWidth,
    };
  });

  expect(
    metrics.hasWorkspacePage,
    `${label} should render workspace chrome`,
  ).toBe(true);
  expect(
    metrics.documentOverflow,
    `${label} should not require document-level horizontal scrolling at 100% zoom`,
  ).toBeLessThanOrEqual(6);
  expect(
    metrics.mainRight,
    `${label} main workspace should stay inside the viewport`,
  ).toBeLessThanOrEqual(metrics.viewportWidth + 6);
}

test.describe('workspace density at 100 percent zoom', () => {
  test.beforeAll(async () => {
    execFileSync(
      'pnpm',
      [
        '--filter',
        '@metrev/database',
        'exec',
        'tsx',
        '../../tests/e2e/support/seed-local-runtime.ts',
        '--research-review-fixtures-only',
      ],
      { env: playwrightDatabaseEnv(), stdio: 'inherit' },
    );
  });

  test.afterAll(async () => {
    const databaseEnv = playwrightDatabaseEnv();
    process.env.DATABASE_URL = databaseEnv.DATABASE_URL;
    process.env.DIRECT_URL = databaseEnv.DIRECT_URL;
    const { disconnectPrismaClient, getPrismaClient } =
      await import('@metrev/database');
    const prisma = getPrismaClient();

    try {
      await prisma.researchReview.deleteMany({
        where: {
          id: {
            in: seededResearchReviewFixtures.map((fixture) => fixture.reviewId),
          },
        },
      });
      await prisma.externalSourceRecord.deleteMany({
        where: {
          OR: seededResearchReviewFixtures.map((fixture) => ({
            sourceKey: {
              startsWith: `${fixture.reviewId}-paper-`,
            },
          })),
        },
      });
    } finally {
      await disconnectPrismaClient();
    }
  });

  test('keeps authenticated workspace pages inside desktop viewports', async ({
    page,
  }) => {
    await page.setViewportSize(desktopViewports[0]);
    await signInAsAnalyst(page);

    for (const viewport of desktopViewports) {
      await page.setViewportSize(viewport);

      for (const path of workspacePaths) {
        await page.goto(path);
        await expectWorkspaceToFitViewport(page, `${viewport.label} ${path}`);
      }
    }
  });

  test('shows usable research review rows without browser zooming out', async ({
    page,
  }) => {
    const reviewId = seededResearchReviewFixtures[0].reviewId;

    await page.setViewportSize(desktopViewports[0]);
    await signInAsAnalyst(page);

    for (const viewport of desktopViewports) {
      await page.setViewportSize(viewport);
      await page.goto(`/admin/intelligence/research/reviews/${reviewId}`);

      await expect(
        page.getByRole('heading', {
          name: seededResearchReviewFixtures[0].title,
        }),
      ).toBeVisible();
      await expect(page.getByText('Search papers')).toBeVisible();
      await expect(page.getByText('Rows per page')).toBeVisible();
      await expect(page.getByRole('tab', { name: /Table\s+25/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Overview/ })).toBeVisible();
      await expect(page.locator('.research-review-row').first()).toBeVisible();
      await expectWorkspaceToFitViewport(
        page,
        `${viewport.label} research review detail`,
      );

      const visibleRows = await page
        .locator('.research-review-row')
        .evaluateAll(
          (rows) =>
            rows.filter((row) => {
              const rect = row.getBoundingClientRect();
              return rect.bottom > 0 && rect.top < window.innerHeight;
            }).length,
        );

      expect(
        visibleRows,
        `${viewport.label} should show multiple research rows at 100% zoom`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
