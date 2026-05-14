#!/usr/bin/env node
/**
 * Spec 037 / Phase 8 — research-coverage-report CLI scaffold.
 *
 * Emits a JSON summary of research-cell coverage (filled_with_trace vs.
 * missing_reason buckets). v1 ships as a dry-run scaffold; live Prisma
 * queries land in a follow-up after the doctor aggregator (Phase 9) is
 * consumed.
 *
 * Exit codes (per ADR 0009): 0=PASS, 1=FAIL, 2=WARN.
 *
 * Usage:
 *   pnpm run research:coverage
 *   pnpm run research:coverage -- --dry-run --json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run') || !argv.has('--live');
const asJson = argv.has('--json');

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const summary = {
  tool: 'research-coverage-report',
  version: 'research-coverage-v1',
  mode: dryRun ? 'dry-run' : 'live',
  generated_at: new Date().toISOString(),
  status: dryRun ? 'scaffold' : 'unsupported',
  cell_status_counts: {
    filled_with_trace: null,
    filled_without_enough_trace: null,
    not_reported_by_paper: null,
    full_text_missing: null,
    document_parse_failed: null,
    table_detected_but_no_match: null,
    extraction_failed: null,
    queued: null,
    needs_analyst_review: null,
  },
  notes: dryRun
    ? 'Dry-run scaffold. Live aggregation across reviews lands in a follow-up.'
    : 'Live mode not implemented yet; see spec 037 Phase 8.',
};

const outputPath = resolve(repoRoot, 'test-results', 'research-coverage.json');
try {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(summary, null, 2));
} catch (err) {
  console.error('[research:coverage] FAIL writing summary:', err.message);
  process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify(summary));
} else {
  console.log(
    `[research:coverage] ${summary.status} (${summary.mode}) → ${outputPath}`,
  );
}
process.exit(0);
