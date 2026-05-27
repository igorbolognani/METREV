#!/usr/bin/env node
/**
 * Spec 037 / Phase 8 — audit-explain CLI scaffold.
 *
 * Explains the most recent evidence-quality audit by surfacing per-funnel
 * stage counts and any failing issue flags. v1 ships as a dry-run scaffold;
 * live mode (calls the api-server /evidence/audit endpoint) lands in a
 * follow-up.
 *
 * Exit codes: 0=PASS, 1=FAIL, 2=WARN.
 *
 * Usage:
 *   pnpm run audit:explain
 *   pnpm run audit:explain -- --dry-run --json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run') || !argv.has('--live');
const asJson = argv.has('--json');

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const summary = {
  tool: 'audit-explain',
  version: 'audit-explain-v1',
  mode: dryRun ? 'dry-run' : 'live',
  generated_at: new Date().toISOString(),
  status: dryRun ? 'scaffold' : 'unsupported',
  funnels: {
    article: [],
    document: [],
    fact: [],
    benchmark: [],
    research_cell: [],
  },
  issue_flags: [],
  notes: dryRun
    ? 'Dry-run scaffold. Live mode will hit api-server /evidence/audit and pretty-print failing stages.'
    : 'Live mode not implemented yet; see spec 037 Phase 8.',
};

const outputPath = resolve(repoRoot, 'test-results', 'audit-explain.json');
try {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(summary, null, 2));
} catch (err) {
  console.error('[audit:explain] FAIL writing summary:', err.message);
  process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify(summary));
} else {
  console.log(
    `[audit:explain] ${summary.status} (${summary.mode}) → ${outputPath}`,
  );
}
process.exit(0);
