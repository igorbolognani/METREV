# Quickstart — CI Security Automation

## Goals

- verify that root security automation is visible in the repository
- confirm the focused workflow-assets regression protects the new automation files
- confirm the focused formatting gate includes the new workflow and Dependabot config

## Preconditions

- repository dependencies are installed
- the repository root is available locally

## Setup

1. Read `.github/workflows/codeql.yml`.
2. Read `.github/dependabot.yml`.
3. Read `docs/repository-authority-map.md`.
4. Inspect `tests/runtime/workflow-assets.test.ts`.

## Happy path

1. Run `pnpm run test:workflow-assets`.
2. Run `pnpm run format:workflow-assets`.
3. Confirm the root automation surface now includes CI, CodeQL, and Dependabot.

## Failure path

1. Remove one of the new root automation files.
2. Re-run `pnpm run test:workflow-assets`.
3. Confirm the focused regression test fails on the missing file or drifted content.

## Edge case

1. Add another root automation file under `.github/`.
2. Update `tests/runtime/workflow-assets.test.ts` and `format:workflow-assets` in the same patch.
3. Update the authority map if the maintained automation surface changes.

## Verification commands and checks

- `pnpm run test:workflow-assets`
- `pnpm run format:workflow-assets`
