import { devices, expect, test } from '@playwright/test';

interface PublicTopicRouteExpectation {
  slug: string;
  path: string;
  heading: string;
  firstDialogTitle: string;
  firstDialogSnippet: string;
  nextLinkText: string;
}

const publicTopicRoutes: PublicTopicRouteExpectation[] = [
  {
    slug: 'problem',
    path: '/learn/problem',
    heading:
      'See the full operating pressure around a bioelectrochemical decision.',
    firstDialogTitle: 'Influent chemistry',
    firstDialogSnippet:
      'Conductivity, COD strength, salts, inhibitors, and pH can either stabilize the electroactive pathway',
    nextLinkText: 'Next: Technology',
  },
  {
    slug: 'technology',
    path: '/learn/technology',
    heading: 'Understand the BES families before comparing designs.',
    firstDialogTitle: 'MFC',
    firstDialogSnippet:
      'Microbial fuel cells couple treatment with direct current generation',
    nextLinkText: 'Next: Stack',
  },
  {
    slug: 'stack',
    path: '/learn/stack',
    heading:
      'See the system the way METREV evaluates it: one explicit stack at a time.',
    firstDialogTitle: 'Reactor',
    firstDialogSnippet:
      'Architecture fixes residence time distribution, hydraulic path, footprint',
    nextLinkText: 'Next: Comparison',
  },
  {
    slug: 'comparison',
    path: '/learn/comparison',
    heading:
      'Make route comparison directional, readable, and honest about tradeoffs.',
    firstDialogTitle: 'Conventional treatment',
    firstDialogSnippet:
      'Activated sludge and other mature treatment trains remain critical anchors',
    nextLinkText: 'Next: ODS',
  },
  {
    slug: 'impact',
    path: '/learn/impact',
    heading:
      'Show impact as a result of disciplined engineering, not as a slogan.',
    firstDialogTitle: 'Water quality',
    firstDialogSnippet:
      'Cleaner effluent, stable removal, and better process visibility are often the most immediate BES value pathways',
    nextLinkText: 'Next: METREV',
  },
  {
    slug: 'metrev',
    path: '/learn/metrev',
    heading:
      'Understand how METREV moves from stack description to report-ready output.',
    firstDialogTitle: 'Configure stack',
    firstDialogSnippet:
      'The workflow begins with explicit reactor, electrodes, separator, biology, auxiliaries',
    nextLinkText: 'Open dashboard',
  },
];

const pixel5 = devices['Pixel 5'];
const mobileViewportUse = {
  viewport: pixel5.viewport,
  userAgent: pixel5.userAgent,
  deviceScaleFactor: pixel5.deviceScaleFactor,
  isMobile: pixel5.isMobile,
  hasTouch: pixel5.hasTouch,
};

async function openPublicRoute(
  page: import('@playwright/test').Page,
  path: string,
) {
  await page.goto(path);
  await expect(page.getByTestId('public-topic-nav')).toBeVisible();
}

test.describe('public routes - desktop structure', () => {
  test('overview hub exposes the six public lenses', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('public-overview-hub')).toBeVisible();
    await expect(page.getByTestId('public-landing-infographic')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'METREV BIOELETROCHEMICAL DECISION SUPPORT',
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Explore the scientific instrument one engineering lens at a time.',
      ),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid^="public-landing-board-"]'),
    ).toHaveCount(6);

    const landingBoardMetrics = await page
      .locator('[data-testid^="public-landing-board-"]')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const board = element as HTMLElement;
          const rect = board.getBoundingClientRect();
          const icon = board.querySelector(
            '.public-linear-board__icon-button',
          ) as HTMLElement | null;

          return {
            clientWidth: board.clientWidth,
            iconWidth: icon?.clientWidth ?? 0,
            left: rect.left,
            right: rect.right,
            scrollWidth: board.scrollWidth,
          };
        }),
      );

    for (const [index, metric] of landingBoardMetrics.entries()) {
      expect(metric.scrollWidth).toBeLessThanOrEqual(metric.clientWidth + 1);
      expect(metric.iconWidth).toBeLessThan(metric.clientWidth);

      if (index < landingBoardMetrics.length - 1) {
        expect(metric.right).toBeLessThanOrEqual(
          landingBoardMetrics[index + 1].left + 1,
        );
      }
    }

    await expect(
      page.getByTestId('public-landing-board-problem'),
    ).toContainText('Pressure map');
    await expect(page.getByTestId('public-landing-board-metrev')).toContainText(
      'Workflow instrument',
    );

    await page.getByTestId('public-landing-board-problem').click();
    await expect(
      page.getByRole('heading', {
        name: 'Map the real BES pressure before choosing a stack.',
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'influent chemistry, conductivity, pH, temperature, solids exposure, hydraulic regime',
      ),
    ).toBeVisible();
    await expect(page.getByText('System function')).toBeVisible();
    await expect(page.getByText('Engineering pressure')).toBeVisible();
    await expect(page.getByText('Decision risk')).toBeVisible();
    await expect(page.getByText('What METREV checks')).toBeVisible();
    await expect(page.getByText('METREV takeaway')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Open full page' }),
    ).toHaveCount(0);

    const landingDialogBounds = await page
      .locator('.public-board-dialog-shell')
      .boundingBox();
    const landingDialog = page.locator('.public-board-dialog-shell');
    const desktopViewport = page.viewportSize();
    const viewportWidth = desktopViewport?.width ?? 0;
    const viewportHeight = desktopViewport?.height ?? 0;

    expect(landingDialogBounds?.width ?? 0).toBeGreaterThan(
      viewportWidth * 0.95,
    );
    expect(landingDialogBounds?.height ?? 0).toBeGreaterThan(
      viewportHeight * 0.8,
    );
    await expect(page.getByText('Problem overview')).toBeVisible();
    await expect(
      landingDialog.getByText(
        'influent chemistry, conductivity, pH, temperature, solids exposure, hydraulic regime',
      ),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
  });

  for (const route of publicTopicRoutes) {
    test(`${route.slug} page renders an explainable infographic`, async ({
      page,
    }) => {
      await openPublicRoute(page, route.path);

      await expect(
        page.getByRole('heading', { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(
        page.getByTestId(`public-topic-${route.slug}`),
      ).toBeVisible();
      await expect(page.getByTestId('public-topic-infographic')).toBeVisible();
      await expect(
        page.locator(`[data-testid^="public-topic-board-${route.slug}-"]`),
      ).toHaveCount(6);

      await page.getByTestId(`public-topic-board-${route.slug}-1`).click();
      const dialog = page.locator('.public-board-dialog-shell');
      await expect(
        page.getByRole('heading', { name: route.firstDialogTitle }),
      ).toBeVisible();
      await expect(dialog.getByText(route.firstDialogSnippet)).toBeVisible();
      await expect(page.getByText('System function')).toBeVisible();
      await expect(page.getByText('What METREV checks')).toBeVisible();
      await expect(page.getByText('METREV takeaway')).toBeVisible();
      await page.getByRole('button', { name: 'Close' }).click();

      await expect(
        page.getByRole('link', { name: route.nextLinkText }),
      ).toBeVisible();
    });
  }
});

test.describe('public routes - mobile snapshots', () => {
  test.use(mobileViewportUse);

  test('overview hub matches the mobile landing snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('public-overview-hub')).toBeVisible();

    await expect(page).toHaveScreenshot('public-overview-mobile.png', {
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      maxDiffPixels: 220,
    });
  });

  for (const route of publicTopicRoutes) {
    test(`${route.slug} route matches the mobile infographic snapshot`, async ({
      page,
    }) => {
      await openPublicRoute(page, route.path);
      await expect(page.getByTestId('public-topic-infographic')).toBeVisible();

      await expect(page).toHaveScreenshot(`${route.slug}-mobile.png`, {
        animations: 'disabled',
        caret: 'hide',
        fullPage: true,
        maxDiffPixels: 220,
      });
    });
  }
});
