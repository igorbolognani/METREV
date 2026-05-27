#!/usr/bin/env node
/**
 * Spec 037 / Phase 9 — METREV doctor.
 *
 * Aggregates the four Phase 8 scaffolds plus the Phase 2 layout audit (if a
 * recent summary is present) into one human + machine readable health report.
 *
 * Exit codes (per ADR 0009):
 *   0  PASS — all sub-checks PASS or scaffold.
 *   1  FAIL — at least one sub-check FAIL.
 *   2  WARN — sub-checks all scaffold/dry-run (i.e. nothing exercised live yet).
 *
 * Usage:
 *   pnpm run metrev:doctor
 *   pnpm run metrev:doctor -- --json
 *   pnpm run metrev:doctor -- --full --json
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = new Set(process.argv.slice(2));
const asJson = argv.has('--json');
const full = argv.has('--full');

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

function runScaffold(label, scriptRelPath) {
  const scriptPath = resolve(repoRoot, scriptRelPath);
  const out = spawnSync(process.execPath, [scriptPath, '--dry-run', '--json'], {
    encoding: 'utf-8',
  });
  if (out.status !== 0) {
    return {
      label,
      status: 'FAIL',
      exit_code: out.status,
      stderr: (out.stderr || '').trim().slice(0, 500),
    };
  }
  try {
    return { label, status: 'PASS', payload: JSON.parse(out.stdout) };
  } catch {
    return { label, status: 'WARN', stdout: out.stdout.trim().slice(0, 500) };
  }
}

const checks = [
  runScaffold('corpus-score', 'scripts/run-corpus-score.mjs'),
  runScaffold('research-coverage', 'scripts/run-research-coverage.mjs'),
  runScaffold('audit-explain', 'scripts/run-audit-explain.mjs'),
];

// Layout audit prior summary (Phase 2 artifact), if present.
const layoutSummaryPath = resolve(
  repoRoot,
  'test-results',
  'layout-audit',
  'summary.json',
);
if (existsSync(layoutSummaryPath)) {
  try {
    const parsed = JSON.parse(readFileSync(layoutSummaryPath, 'utf-8'));
    checks.push({
      label: 'ui-layout-audit',
      status: parsed.totals && parsed.totals.failed === 0 ? 'PASS' : 'FAIL',
      payload: { totals: parsed.totals, generatedAt: parsed.generatedAt },
    });
  } catch (err) {
    checks.push({
      label: 'ui-layout-audit',
      status: 'WARN',
      error: err.message,
    });
  }
} else if (full) {
  checks.push({
    label: 'ui-layout-audit',
    status: 'WARN',
    error: 'summary.json not present (run pnpm ui:layout-audit first)',
  });
}

const allPass = checks.every((c) => c.status === 'PASS');
const anyFail = checks.some((c) => c.status === 'FAIL');
const report = {
  tool: 'metrev-doctor',
  version: 'metrev-doctor-v1',
  generated_at: new Date().toISOString(),
  status: anyFail ? 'FAIL' : allPass ? 'PASS' : 'WARN',
  checks,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`[metrev:doctor] overall=${report.status}`);
  for (const c of checks) {
    console.log(`  - ${c.label}: ${c.status}`);
  }
}

process.exit(anyFail ? 1 : allPass ? 0 : 2);
