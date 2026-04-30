# Quickstart — CI Local Smoke Validation

## Goals

- verify that the Docker-backed local-view runtime exposes an explicit smoke
  phase before the full Playwright acceptance matrix
- confirm CI surfaces the smoke phase separately from the full local acceptance
  step
- confirm workflow-assets regression coverage protects the promoted smoke posture

## Preconditions

- repository dependencies are installed
- Playwright Chromium is installed locally
- Docker is available for the local-view stack

## Setup

1. Read `package.json` for `test:e2e:smoke`, `validate:local:smoke`, and `validate:local`.
2. Read `scripts/run-local-validation.mjs`.
3. Read `.github/workflows/ci.yml`.
4. Inspect `tests/e2e/local-view-smoke.spec.ts` and `tests/runtime/workflow-assets.test.ts`.

## Happy path

1. Run `pnpm run validate:local:smoke`.
2. Run `pnpm run validate:local`.
3. Run `pnpm run test:workflow-assets`.
4. Run `pnpm run format:workflow-assets`.
5. Confirm the CI local job now exposes a smoke step before the full acceptance step.

## Failure path

1. Break the local-view login route, public landing route, or API `/health`.
2. Re-run `pnpm run validate:local:smoke`.
3. Confirm the smoke phase fails before the full seeded E2E path starts.

## Edge case

1. Run `pnpm run validate:local:smoke` first.
2. Re-run the full local matrix with `METREV_SKIP_LOCAL_SMOKE=1 pnpm run validate:local`.
3. Confirm the full acceptance path reuses the running stack without repeating the smoke step.

## Verification commands and checks

- `pnpm run validate:local:smoke`
- `pnpm run test:workflow-assets`
- `pnpm run format:workflow-assets`
