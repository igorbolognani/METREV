# Quickstart — CI Workflow Semantic Lint

## Goals

- verify that the root workflow surface has a semantic lint gate in addition to
  formatting and regression-string checks
- confirm the main `CI` workflow runs that gate explicitly
- confirm the workflow-assets regression test protects the new posture

## Preconditions

- repository root is available locally
- Docker is available locally for the official `actionlint` container

## Setup

1. Read `package.json` for `lint:workflow-semantics`.
2. Read `scripts/run-workflow-semantic-lint.mjs`.
3. Read `.github/workflows/ci.yml`.
4. Inspect `tests/runtime/workflow-assets.test.ts`.

## Happy path

1. Run `pnpm run lint:workflow-semantics`.
2. Run `pnpm run test:workflow-assets`.
3. Run `pnpm run format:workflow-assets`.
4. Confirm the root `CI` workflow now exposes workflow semantic lint as an
   explicit step before the broader repository matrix.

## Failure path

1. Break one workflow key, action input, or runner label under `.github/workflows/`.
2. Re-run `pnpm run lint:workflow-semantics`.
3. Confirm the semantic lint gate fails before the broader repo matrix runs.

## Edge case

1. Run the semantic lint command on a machine without a global `actionlint`
   binary.
2. Confirm the repository script still works as long as Docker is available.
3. If Docker is unavailable, confirm the script fails with a direct setup error.

## Verification commands and checks

- `pnpm run lint:workflow-semantics`
- `pnpm run test:workflow-assets`
- `pnpm run format:workflow-assets`
