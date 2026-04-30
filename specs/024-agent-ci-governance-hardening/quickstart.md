# Quickstart — Agent And CI Governance Hardening

## Goals

- verify that the root workflow and CI surfaces are documented as active owners
- confirm the CI workflow exposes the promoted validation gates and debug artifacts
- confirm the focused workflow-asset regression catches CI drift quickly

## Preconditions

- repository dependencies are installed
- the repository root is available locally

## Setup

1. Read `WORKFLOW.md`.
2. Read `docs/internal-feature-workflow.md` and `docs/repository-authority-map.md`.
3. Inspect `.github/workflows/ci.yml`, `package.json`, and `tests/runtime/workflow-assets.test.ts`.

## Happy path

1. Run `pnpm run test:workflow-assets`.
2. Run `pnpm run format:workflow-assets`.
3. Run `pnpm run validate:fast`.
4. Run `docker compose config`.
5. Run `pnpm run test:e2e:install`.
6. Confirm the CI workflow, scripts, and docs describe one consistent maintained surface.

## Failure path

1. Remove the format step or one artifact upload from `.github/workflows/ci.yml`.
2. Re-run `pnpm run test:workflow-assets`.
3. Confirm the test fails on the missing promoted CI expectation.

## Edge case

1. Add a new promoted validation gate or artifact path to the CI workflow.
2. Update `tests/runtime/workflow-assets.test.ts` in the same patch.
3. Update the relevant root docs if the maintained workflow surface changes.

## Verification commands and checks

- `pnpm run test:workflow-assets`
- `pnpm run format:workflow-assets`
- `pnpm run validate:fast`
- `docker compose config`
- `pnpm run test:e2e:install`

On Linux workstations, `pnpm run test:e2e:install` may request `sudo` because
Playwright installs system browser dependencies in addition to Chromium.
