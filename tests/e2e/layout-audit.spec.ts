/**
 * Spec 037 / Phase 2: layout audit for 100% browser zoom.
 *
 * Visits every critical admin/intelligence route at multiple desktop
 * viewports, captures document/main overflow metrics + a screenshot, and
 * fails if any route requires horizontal document scrolling at 100% zoom.
 *
 * Artifacts:
 *   - test-results/layout-audit/<viewport>/<slug>.png
 *   - test-results/layout-audit/summary.json
 *
 * Overflow is allowed only inside containers carrying
 * `data-layout-scroll="true"` (DenseTableShell, .workspace-scroll-x,
 * payload preview, etc.). The audit asserts on the DOCUMENT-level
 * overflow, not on inner scroll shells.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { analystEmail, analystPassword } from './support/local-runtime';

const auditViewports = [
  { height: 800, label: '1280x800', width: 1280 },
  { height: 900, label: '1440x900', width: 1440 },
  { height: 900, label: '1600x900', width: 1600 },
  { height: 1080, label: '1920x1080', width: 1920 },
] as const;

/**
 * Critical routes. Verified to exist under `apps/web-ui/src/app/`.
 * Keep this list aligned with spec 037 plan §13 "Critical Routes".
 */
const auditRoutes = [
  '/dashboard',
  '/cases/new',
  '/evaluations',
  '/reports',
  '/admin',
  '/admin/intelligence/evidence/explorer',
  '/admin/intelligence/evidence/review',
  '/admin/intelligence/evidence/quality',
  '/admin/intelligence/research/reviews',
  '/evidence',
  '/evidence/review',
  '/evidence/quality',
  '/research',
] as const;

const ALLOWED_DOCUMENT_OVERFLOW_PX = 6;

const auditOutputDir = resolve(process.cwd(), 'test-results', 'layout-audit');

type ViewportMetrics = {
  documentOverflow: number;
  hasWorkspacePage: boolean;
  illegalOverflowElements: Array<{
    classList: string;
    overflowPx: number;
    tag: string;
  }>;
  mainRight: number;
  viewportWidth: number;
};

type AuditEntry = {
  metrics: ViewportMetrics;
  passed: boolean;
  reasons: string[];
  route: string;
  screenshotPath: string;
  viewport: (typeof auditViewports)[number]['label'];
};

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
    page.waitForURL(/\/home(?:\?.*)?$/, { timeout: 15_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);

  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

function slugifyRoute(route: string): string {
  return route.replace(/^\//, '').replace(/[\/]/g, '__') || 'root';
}

function ensureDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

test.describe('Spec 037 / Phase 2: layout audit', () => {
  test.beforeAll(() => {
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

  test('all critical routes fit 100% zoom across desktop viewports', async ({
    page,
  }) => {
    test.slow();

    await page.setViewportSize(auditViewports[0]);
    await signInAsAnalyst(page);

    const entries: AuditEntry[] = [];

    for (const viewport of auditViewports) {
      await page.setViewportSize(viewport);

      for (const route of auditRoutes) {
        const slug = slugifyRoute(route);
        const screenshotPath = resolve(
          auditOutputDir,
          viewport.label,
          `${slug}.png`,
        );

        try {
          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await page
            .waitForLoadState('networkidle', { timeout: 8_000 })
            .catch(() => undefined);
        } catch (error) {
          entries.push({
            metrics: {
              documentOverflow: 0,
              hasWorkspacePage: false,
              illegalOverflowElements: [],
              mainRight: 0,
              viewportWidth: viewport.width,
            },
            passed: false,
            reasons: [`navigation_failed: ${(error as Error).message}`],
            route,
            screenshotPath,
            viewport: viewport.label,
          });
          continue;
        }

        const metrics: ViewportMetrics = await page.evaluate(() => {
          const main = document.querySelector('.app-main');
          const mainRect = main?.getBoundingClientRect();

          const illegalOverflowElements: ViewportMetrics['illegalOverflowElements'] =
            [];
          const candidates = Array.from(
            document.querySelectorAll<HTMLElement>('.app-main *'),
          );
          for (const node of candidates) {
            if (node.dataset.layoutScroll === 'true') {
              continue;
            }
            if (node.closest('[data-layout-scroll="true"]')) {
              continue;
            }
            const overflowPx = node.scrollWidth - node.clientWidth;
            if (overflowPx > 4 && node.clientWidth > 0) {
              illegalOverflowElements.push({
                classList: node.className?.toString().slice(0, 120) ?? '',
                overflowPx,
                tag: node.tagName.toLowerCase(),
              });
            }
            if (illegalOverflowElements.length >= 8) {
              break;
            }
          }

          return {
            documentOverflow:
              document.documentElement.scrollWidth - window.innerWidth,
            hasWorkspacePage: Boolean(
              document.querySelector('.workspace-page'),
            ),
            illegalOverflowElements,
            mainRight: mainRect?.right ?? 0,
            viewportWidth: window.innerWidth,
          };
        });

        ensureDir(screenshotPath);
        await page.screenshot({ fullPage: true, path: screenshotPath });

        const reasons: string[] = [];
        if (metrics.documentOverflow > ALLOWED_DOCUMENT_OVERFLOW_PX) {
          reasons.push(
            `document_overflow_${metrics.documentOverflow}px_exceeds_${ALLOWED_DOCUMENT_OVERFLOW_PX}px`,
          );
        }
        if (
          metrics.mainRight >
          metrics.viewportWidth + ALLOWED_DOCUMENT_OVERFLOW_PX
        ) {
          reasons.push(
            `main_right_${metrics.mainRight}_exceeds_viewport_${metrics.viewportWidth}`,
          );
        }
        if (metrics.illegalOverflowElements.length > 0) {
          reasons.push(
            `illegal_inner_overflow_${metrics.illegalOverflowElements.length}_elements`,
          );
        }

        entries.push({
          metrics,
          passed: reasons.length === 0,
          reasons,
          route,
          screenshotPath,
          viewport: viewport.label,
        });
      }
    }

    const summaryPath = resolve(auditOutputDir, 'summary.json');
    ensureDir(summaryPath);

    const totals = {
      failed: entries.filter((entry) => !entry.passed).length,
      passed: entries.filter((entry) => entry.passed).length,
      total: entries.length,
    };

    writeFileSync(
      summaryPath,
      `${JSON.stringify(
        {
          allowedDocumentOverflowPx: ALLOWED_DOCUMENT_OVERFLOW_PX,
          entries,
          generatedAt: new Date().toISOString(),
          totals,
          viewports: auditViewports.map((viewport) => viewport.label),
        },
        null,
        2,
      )}\n`,
    );

    const failures = entries.filter((entry) => !entry.passed);
    expect(
      failures,
      `Layout audit failures: ${JSON.stringify(failures, null, 2)}`,
    ).toEqual([]);
  });
});
