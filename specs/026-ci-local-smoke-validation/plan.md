# Implementation Plan — CI Local Smoke Validation

## Summary

Add a named Docker-backed smoke phase for the Playwright local-view path, wire
it into the canonical local validation orchestrator, and expose it separately in
CI so local runtime startup failures are easier to localize.

## Source-of-truth files

- `package.json`
- `scripts/run-local-validation.mjs`
- `tests/e2e/global.setup.ts`
- `tests/e2e/local-view-smoke.spec.ts`
- `.github/workflows/ci.yml`
- `tests/runtime/workflow-assets.test.ts`
- `docs/runtime-tooling-setup.md`

## Affected layers and areas

- repository automation
- Playwright local validation
- durable CI/workflow documentation under `specs/`

## Required durable artifacts

- `spec.md`: define the bounded smoke-validation scope and acceptance criteria
- `plan.md`: sequence the script, CI, and regression-coverage updates
- `tasks.md`: track implementation and focused validation explicitly
- `quickstart.md`: document the narrow smoke run and the full acceptance run
- `research.md`: not needed
- `contracts/`: not needed

## Research inputs

- current `validate:local` orchestration in `scripts/run-local-validation.mjs`
- existing Playwright E2E setup and local-view support files
- current CI local-validation job in `.github/workflows/ci.yml`

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `package.json`, `scripts/run-local-validation.mjs`, `tests/e2e/global.setup.ts`, `tests/e2e/local-view-smoke.spec.ts`, `.github/workflows/ci.yml`, `tests/runtime/workflow-assets.test.ts`, `docs/runtime-tooling-setup.md`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No domain, contract, API, or runtime payload change is intended. This slice is
limited to local validation orchestration, CI signaling, and durable docs.

## Implementation steps

1. Add a dedicated Playwright smoke spec for the public landing, login, and API
   health path.
2. Allow the Playwright global setup to skip the seeded DB bootstrap for the
   smoke-only path.
3. Extend `scripts/run-local-validation.mjs` with an explicit smoke phase and a
   smoke-only mode.
4. Add `test:e2e:smoke` and `validate:local:smoke` scripts in `package.json`.
5. Split the CI local-validation job into a named smoke step plus the existing
   full acceptance step.
6. Extend workflow-assets regression coverage and update runtime tooling docs.

## Validation strategy

- narrow executable check: `pnpm run validate:local:smoke`
- workflow regression: `pnpm run test:workflow-assets`
- focused formatting: `pnpm run format:workflow-assets`

## Critique summary

The main risk is duplicating too much of the full E2E path and paying CI cost
without gaining much signal. The plan keeps smoke coverage narrow, skips seeded
bootstrap for the smoke-only path, and preserves `validate:local` as the single
full-matrix orchestrator.

## Refined final plan

Keep the smoke slice explicit and minimal: one smoke Playwright spec, one
orchestrator enhancement, one CI step split, and one workflow-assets regression
extension that keeps the promoted local-validation posture honest.

## Rollback / safety

If the smoke path becomes noisy, keep the dedicated script surface but narrow
the assertions instead of collapsing back to a single opaque local-validation
step.
