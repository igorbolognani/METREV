# Quickstart — Authority Runtime Hardening

Execution note: use `../015-repository-authority-and-structure-consolidation/quickstart.md` for repository-wide cleanup validation. This quickstart remains specific to the authority-runtime hardening sub-slice.

## Goals

- verify the current authority split without changing deterministic product behavior
- prove that Prisma runtime and migration posture still matches the repository's validated command path

## Preconditions

- root dependencies are installed with `pnpm install`
- `.env` provides working `DATABASE_URL`, and `DIRECT_URL` when using hosted PostgreSQL

## Setup

1. Run `pnpm prisma:generate`.
2. Run `pnpm run test`.
3. Run `pnpm run build`.

## Happy path

1. Open the authority ADR and the feature pack.
2. Run the domain-contract runtime tests.
3. Confirm the suite reports the expected executed and reference-only assets.

## Failure path

1. Change a canonical output section or the runtime authority metadata incorrectly.
2. Re-run `pnpm run test`.
3. Confirm the runtime contract tests fail before the drift ships.

## Edge case

1. Use hosted PostgreSQL with both `DATABASE_URL` and `DIRECT_URL` defined.
2. Run `pnpm run db:migrate:deploy` through the committed wrapper.
3. Confirm migrations still prefer `DIRECT_URL` while runtime keeps `DATABASE_URL` semantics.

## Verification commands and checks

- `pnpm prisma:generate`
- `pnpm run test`
- `pnpm run build`
