#!/usr/bin/env node
/**
 * Spec 037 / Phase 8 — corpus-score CLI scaffold.
 *
 * Emits a JSON summary describing the deterministic quality posture of the
 * research / evidence corpus. v1 ships as a dry-run scaffold so the surface
 * is wired and discoverable. Live mode (queries Prisma directly) is added in
 * a follow-up once the doctor aggregator (Phase 9) is consumed downstream.
 *
 * Exit codes (per ADR 0009):
 *   0  PASS
 *   1  FAIL (unexpected runtime error)
 *   2  WARN (incomplete data, e.g. DB unavailable in live mode)
 *
 * Usage:
 *   pnpm run corpus:score
 *   pnpm run corpus:score -- --dry-run --json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run') || !argv.has('--live');
const asJson = argv.has('--json');

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const summary = {
  tool: 'corpus-score',
  version: 'corpus-score-v1',
  mode: dryRun ? 'dry-run' : 'live',
  generated_at: new Date().toISOString(),
  status: dryRun ? 'scaffold' : 'unsupported',
  totals: {
    research_papers: null,
    extracted_cells: null,
    cells_filled_with_trace: null,
    cells_missing_reason: null,
  },
  notes: dryRun
    ? 'Dry-run scaffold. Live Prisma queries land in a follow-up.'
    : 'Live mode not implemented yet; see spec 037 Phase 8.',
};

const outputPath = resolve(repoRoot, 'test-results', 'corpus-score.json');
try {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(summary, null, 2));
} catch (err) {
  console.error('[corpus:score] FAIL writing summary:', err.message);
  process.exit(1);
}

if (asJson) {
  console.log(JSON.stringify(summary));
} else {
  console.log(
    `[corpus:score] ${summary.status} (${summary.mode}) → ${outputPath}`,
  );
}
process.exit(0);
