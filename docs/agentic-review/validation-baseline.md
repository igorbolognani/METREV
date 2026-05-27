# Validation Baseline

## Purpose

This report summarizes the validation state around the agentic-review baseline
and the minimal Phase 2B test fix. It is factual and explanatory. It does not
replace `package.json`, CI configuration, or the maintained workflow docs.

## Current State

- Phase 1 baseline commit: `cd53e13 docs: add agentic audit baseline`.
- Phase 2B test fix commit:
  `44d9a63 test: pass searchParams props to legacy route tests`.
- The baseline initially found `pnpm run validate:fast` failing during
  `pnpm run test:js`.
- The failure was in `tests/web-ui/advanced-route-pages.test.tsx`, where the
  test called legacy route page functions without the `searchParams` props those
  wrappers expect.
- The Phase 2B fix changed the test invocation only. Runtime route code was not
  changed.
- After the fix, `pnpm run test:js` passed with 61 test files and 248 tests, and
  `pnpm run validate:fast` exited with code 0.

## What Each Validation Command Proves

### `pnpm run test:workflow-assets`

Runs `vitest run tests/runtime/workflow-assets.test.ts`.

This checks that important workflow and automation assets remain present and
aligned with the root workflow contract. It is a focused governance guard, not a
full runtime test suite.

### `pnpm run lint:workflow-semantics`

Runs `node scripts/run-workflow-semantic-lint.mjs`.

This validates GitHub workflow semantics through the repository-owned lint
script. In the Phase 1 baseline, it completed without a Docker or actionlint
environment failure.

### `pnpm run test:js`

Runs the Vitest JavaScript/TypeScript test suite.

This checks runtime and UI behavior covered by the TypeScript tests, including
web UI route behavior, runtime services, research logic, bootstrap behavior, and
workflow asset tests. It does not run the Python contract checker or production
build by itself.

### `pnpm run test:python`

Runs `python3 tests/contracts/run_contract_check.py`.

This checks contract and vocabulary expectations from the Python contract test
path. It is part of `test:fast` after the JavaScript tests pass.

### `pnpm run build`

Runs `turbo run build`.

This checks TypeScript build/typecheck behavior across the monorepo packages and
apps according to the workspace build graph. It is the final part of
`validate:fast`.

### `pnpm run validate:fast`

Runs `pnpm run lint && pnpm run test:fast && pnpm run build`.

This is the promoted fast repository matrix. It proves that linting, fast tests,
Python contract checks, and build/typecheck all pass in sequence. It is the
first broad gate after focused checks.

## Baseline Failure and Resolution

The Phase 1 baseline failure was useful because it identified a real mismatch
between the test call shape and the legacy route wrapper contract. The failure
was not hidden or reclassified as environment noise.

The minimal Phase 2B fix passed explicit empty `searchParams` props when the
test directly called legacy route page functions. That matched the already
passing query-preservation test pattern and avoided runtime behavior changes.

## What Is Not Proven by This Baseline

- `validate:local` was not part of Phase 2B and is not reasserted by this
  report.
- `validate:advanced` was not part of Phase 2B and is not reasserted by this
  report.
- Live provider ingestion, full local Docker acceptance, browser E2E, and
  provider-backed LLM extraction are outside this Phase 3 documentation pass.
- The AI Engineer Coach findings are observational signals from local session
  analysis, not validation gates.

## Practical Reading

Use `validate:fast` as the immediate confidence gate for small runtime/test
changes. Use `validate:advanced` and `validate:local` when the change touches
research/big-data behavior, local services, Postgres, or browser-level runtime
flows.
