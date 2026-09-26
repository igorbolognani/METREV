import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { devices, expect, test } from '@playwright/test';

interface PublicTopicRouteExpectation {
  slug: string;
  path: string;
  heading: string;
  nextLinkText: string;
}

const publicTopicRoutes: PublicTopicRouteExpectation[] = [
  {
    slug: 'problem',
    path: '/learn/problem',
    heading:
      'See the full operating pressure around a bioelectrochemical decision.',
    nextLinkText: 'Next: Technology',
  },
  {
    slug: 'technology',
    path: '/learn/technology',
    heading: 'Model wastewater MFCs, MECs, and electrochemical biosensors.',
    nextLinkText: 'Next: Stack',
  },
  {
    slug: 'stack',
    path: '/learn/stack',
    heading:
      'See the system the way METREV evaluates it: one explicit stack at a time.',
    nextLinkText: 'Next: Comparison',
  },
  {
    slug: 'comparison',
    path: '/learn/comparison',
    heading: 'Compare MFC and MEC wastewater cases with matched evidence.',
    nextLinkText: 'Next: Impact',
  },
  {
    slug: 'impact',
    path: '/learn/impact',
    heading:
      'Read modeled and measured system results on their stated boundaries.',
    nextLinkText: 'Next: METREV',
  },
  {
    slug: 'metrev',
    path: '/learn/metrev',
    heading:
      'Understand how METREV models wastewater systems and reports the evidence.',
    nextLinkText: 'Open workspace',
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
const desktopCaptureDirectory = resolve(
  process.cwd(),
  'visual-review/public-pages',
);

async function openPublicRoute(
  page: import('@playwright/test').Page,
  path: string,
) {
  await page.goto(path);
  await expect(page.getByTestId('public-topic-nav')).toBeVisible();
}

async function captureDesktopPage(
  page: import('@playwright/test').Page,
  filename: string,
) {
  await page.evaluate(() => window.scrollTo(0, 0));
  mkdirSync(desktopCaptureDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(desktopCaptureDirectory, filename),
    fullPage: true,
    animations: 'disabled',
  });
}

test.describe('public routes - desktop structure', () => {
  test('modeling workbench builds the assembly, toggles components, and records a desktop review capture', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/modeling');

    await expect(page.getByTestId('modeling-workbench')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Model the configured system at its declared scale.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', {
        name: 'Interactive fuel-cell stack assembly',
      }),
    ).toBeVisible();

    await page.getByLabel('Technology', { exact: true }).selectOption('MEC');
    await page
      .getByLabel('Cell / reactor architecture', { exact: true })
      .selectOption('dual-chamber');
    await page
      .getByLabel('Anode material', { exact: true })
      .selectOption('carbon felt');
    await page
      .getByLabel('Cathode catalyst family', { exact: true })
      .selectOption('activated carbon');
    await page
      .getByLabel('Membrane / separator', { exact: true })
      .selectOption('cation exchange membrane');

    await expect(
      page.getByRole('button', { name: 'Anode: carbon felt' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Membrane / separator: cation exchange membrane',
      }),
    ).toBeVisible();

    await page
      .getByLabel('Membrane / separator', { exact: true })
      .selectOption('membrane-free');
    await expect(
      page.getByRole('button', {
        name: 'Membrane / separator: cation exchange membrane',
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        'The separator layer is removed because membrane presence is explicitly set to absent.',
      ),
    ).toBeVisible();

    await page
      .getByLabel('Model fidelity requested', { exact: true })
      .selectOption('biofilm-1d-direct-transfer-research-v1');
    await expect(page.getByTestId('selected-model-profile')).toContainText(
      'Research profile · not executable',
    );
    const oneDimensionalProfile = page
      .locator('.modeling-workbench__fidelity-card')
      .filter({ hasText: 'biofilm-1d-direct-transfer-research-v1' });
    await oneDimensionalProfile.locator('summary').click();
    await expect(
      oneDimensionalProfile.getByText(
        'operational_biology.biofilm_thickness_m',
      ),
    ).toBeVisible();

    const documentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(documentWidth).toBeLessThanOrEqual(1440);
    await captureDesktopPage(page, 'desktop-modeling.png');
  });

  test('overview hub exposes the six public lenses', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    await expect(page.getByTestId('public-overview-hub')).toBeVisible();
    await expect(page.getByTestId('public-landing-infographic')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'METREV MFC/MEC + BIOSENSOR DECISION SUPPORT',
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
        name: 'Map wastewater, MFC/MEC, and biosensor constraints before choosing a system.',
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
      page.getByRole('link', { name: 'Read the full chapter' }),
    ).toHaveAttribute('href', '/learn/problem');

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
    await expect(page.locator('.public-board-dialog-shell')).toBeHidden();
    await captureDesktopPage(page, 'desktop-overview.png');
  });

  for (const route of publicTopicRoutes) {
    test(`${route.slug} page renders a long-form chapter and explorable SVGs`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await openPublicRoute(page, route.path);

      await expect(
        page.getByRole('heading', { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(
        page.getByTestId(`public-topic-${route.slug}`),
      ).toBeVisible();
      await expect(
        page.getByRole('navigation', { name: 'On this page' }),
      ).toBeVisible();
      const sectionCount = await page
        .getByTestId('public-article-section')
        .count();
      expect(sectionCount).toBeGreaterThanOrEqual(5);
      await expect(page.locator('.public-article-diagram')).toHaveCount(
        sectionCount,
      );
      await expect(
        page.getByRole('heading', {
          name: 'Sources, scope, and review status',
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: route.nextLinkText }),
      ).toBeVisible();

      const explanation = page
        .locator('.public-article-figure__explanation')
        .first();
      const initialExplanation = await explanation.innerText();
      await page.getByTestId('public-article-diagram-node-2').first().click();
      await expect(explanation).not.toHaveText(initialExplanation);
      await captureDesktopPage(page, `desktop-${route.slug}.png`);
    });
  }
});

test.describe('public routes - mobile views', () => {
  test.use(mobileViewportUse);

  test('overview hub exposes the focused decision model on mobile', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('public-overview-hub')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'METREV MFC/MEC + BIOSENSOR DECISION SUPPORT',
      }),
    ).toBeVisible();
    await expect(page.getByTestId('public-landing-infographic')).toBeVisible();
  });

  for (const route of publicTopicRoutes) {
    test(`${route.slug} route exposes its chapter and table of contents on mobile`, async ({
      page,
    }) => {
      await openPublicRoute(page, route.path);
      await expect(
        page.getByRole('heading', { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(
        page.getByTestId(`public-topic-${route.slug}`),
      ).toBeVisible();
      await expect(
        page.getByRole('navigation', { name: 'On this page' }),
      ).toBeVisible();
      await expect(
        page.getByTestId('public-article-section').first(),
      ).toBeVisible();
    });
  }
});
