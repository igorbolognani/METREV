import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

import {
    analystEmail,
    analystPassword,
    playwrightApiBaseUrl,
    seededResearchPaperTitle,
    seededResearchReviewFixtures,
} from './support/local-runtime';

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

  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

test.describe('seeded research review fixtures', () => {
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

  test.beforeEach(async ({ page }) => {
    await signInAsAnalyst(page);
  });

  for (const fixture of seededResearchReviewFixtures) {
    test(`renders the full ${fixture.paperCount}-paper seeded review in the papers tab`, async ({
      page,
    }) => {
      await page.goto(
        `/admin/intelligence/research/reviews/${fixture.reviewId}`,
      );

      await expect(page).toHaveURL(
        new RegExp(`/admin/intelligence/research/reviews/${fixture.reviewId}$`),
      );
      await expect(
        page.getByRole('heading', { name: fixture.title }).first(),
      ).toBeVisible();
      await expect(
        page.getByText(`${fixture.paperCount} papers`).first(),
      ).toBeVisible();

      await page
        .getByRole('tablist', { name: 'Research review detail tabs' })
        .getByRole('tab', { name: /^Papers/ })
        .click();

      await expect(page.getByText('Paper details')).toBeVisible();
      await expect(
        page.getByRole('heading', {
          name: seededResearchPaperTitle(fixture.paperCount, 1),
        }),
      ).toBeVisible();

      const reviewResponse = await page.evaluate(
        async ({ apiBaseUrl, reviewId }) => {
          const response = await fetch(
            `${apiBaseUrl}/api/research/reviews/${reviewId}`,
            {
              credentials: 'include',
            },
          );
          const review = await response.json();

          return {
            status: response.status,
            paperCount: review.paper_count ?? null,
            papersLength: Array.isArray(review.papers)
              ? review.papers.length
              : null,
            lastTitle: Array.isArray(review.papers)
              ? (review.papers.at(-1)?.title ?? null)
              : null,
          };
        },
        {
          apiBaseUrl: playwrightApiBaseUrl,
          reviewId: fixture.reviewId,
        },
      );

      expect(reviewResponse).toEqual({
        status: 200,
        paperCount: fixture.paperCount,
        papersLength: fixture.paperCount,
        lastTitle: seededResearchPaperTitle(
          fixture.paperCount,
          fixture.paperCount,
        ),
      });
    });
  }
});
