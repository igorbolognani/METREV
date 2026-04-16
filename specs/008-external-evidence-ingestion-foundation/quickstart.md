# Quickstart — External Evidence Ingestion Foundation

## Goals

- import free scholarly metadata into the database without touching active case evaluations
- keep imported evidence review-pending until a later workflow explicitly consumes it

## Preconditions

- the database runtime is configured and reachable through `DATABASE_URL`
- Prisma migrations and client generation are up to date

## Setup

1. Run `pnpm --filter @metrev/database prisma:generate` after schema changes.
2. Run the development migration flow for the database package.
3. Set `INGEST_QUERY` and either `OPENALEX_API_KEY` or `CROSSREF_MAILTO` depending on the source command you want to run.

## Happy path

1. Run `pnpm run ingest:literature:openalex` with a small query and limit.
2. Run `pnpm run ingest:literature:crossref` with a small query and limit.
3. Confirm both commands create an ingestion run and upsert review-pending catalog evidence items.

## Failure path

1. Run an ingestion command without the required query or source-specific credential hints.
2. Confirm the command fails early with a clear configuration error.
3. Confirm the ingestion run is marked failed with a recorded error summary.

## Edge case

1. Re-run the same query twice against one source.
2. Confirm the source-record upsert stays idempotent on `sourceType + sourceKey`.
3. Confirm the catalog evidence item upsert updates existing records instead of duplicating them.

## Verification commands and checks

- `pnpm --filter @metrev/database prisma:generate`
- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run build`
