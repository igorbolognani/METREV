#!/usr/bin/env node
/**
 * Spec 037 / Phase 2: UI layout audit runner.
 *
 * Runs the Playwright `layout-audit.spec.ts` and surfaces the produced
 * `test-results/layout-audit/summary.json` to the developer.
 *
 * Exit codes (per ADR 0009):
 *   0  PASS — all routes within document overflow tolerance.
 *   1  FAIL — at least one route exceeded tolerance OR runner errored.
 *   2  WARN — runner completed but summary.json missing/parse-failed.
 *
 * Usage:
 *   pnpm run ui:layout-audit
 *   pnpm run ui:layout-audit -- --dry-run     (skip Playwright, only print prior summary if present)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const summaryPath = resolve(
  repoRoot,
  'test-results',
  'layout-audit',
  'summary.json',
);

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run');

function printSummary() {
  if (!existsSync(summaryPath)) {
    console.error(`[ui:layout-audit] WARN summary not found at ${summaryPath}`);
    return 2;
  }
  try {
    const parsed = JSON.parse(readFileSync(summaryPath, 'utf-8'));
    console.log('[ui:layout-audit] summary:', summaryPath);
    console.log(
      JSON.stringify(
        {
          allowedDocumentOverflowPx: parsed.allowedDocumentOverflowPx,
          generatedAt: parsed.generatedAt,
          totals: parsed.totals,
          viewports: parsed.viewports,
        },
        null,
        2,
      ),
    );
    if (Array.isArray(parsed.entries)) {
      const failures = parsed.entries.filter((entry) => entry.passed === false);
      if (failures.length > 0) {
        console.error(
          '[ui:layout-audit] FAIL routes:',
          JSON.stringify(failures, null, 2),
        );
        return 1;
      }
    }
    console.log('[ui:layout-audit] PASS');
    return 0;
  } catch (error) {
    console.error('[ui:layout-audit] WARN summary parse failed:', error);
    return 2;
  }
}

if (dryRun) {
  process.exit(printSummary());
}

const result = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', 'tests/e2e/layout-audit.spec.ts'],
  { cwd: repoRoot, stdio: 'inherit' },
);

if (result.error) {
  console.error('[ui:layout-audit] runner error:', result.error);
  process.exit(1);
}

const summaryExit = printSummary();
const playwrightExit = result.status ?? 1;
process.exit(playwrightExit !== 0 ? playwrightExit : summaryExit);
