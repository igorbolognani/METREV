# Quickstart - Production-Scale Evidence Ingestion

## Goals

- Run the real trusted scientific corpus ingestion path with a 500,000 total catalog target.
- Verify that accepted, failed, duplicate, and pending-review counts come from PostgreSQL rather than static UI data.

## Preconditions

- Dependencies installed with `pnpm install`.
- PostgreSQL is available and `DATABASE_URL` plus `DIRECT_URL` point to the intended local database.
- When the ambient `.env` points to Supabase or any shared database, override both `DATABASE_URL` and `DIRECT_URL` explicitly for local ingestion.
- Prisma migration `20260503120000_production_scale_evidence` has been deployed.
- Corpus queries exist in `packages/database/data/bigdata-bootstrap.config.json`.
- Real provider access is available for OpenAlex, Crossref, and Europe PMC.

## Setup

1. Apply migrations:

```bash
pnpm run db:migrate:deploy
```

1. Regenerate Prisma client if schema changes were not generated yet:

```bash
pnpm prisma:generate
```

1. Confirm the dry-run plan:

```bash
pnpm run evidence:ingest -- --dryRun=true --target-total=500000 --batch-size=1000 --auto-accept=true --queryLimit=1
```

## Happy Path

1. Run ingestion:

```bash
pnpm run evidence:ingest -- --target-total=500000 --batch-size=1000 --auto-accept=true
```

For a resumable bounded probe against an existing active run, use the active run id and a page limit:

```bash
LOCAL_DB='postgresql://metrev:metrev@localhost:5436/metrev?schema=public'
env DATABASE_URL="$LOCAL_DB" DIRECT_URL="$LOCAL_DB" \
	EVIDENCE_TARGET_TOTAL=500000 \
	EVIDENCE_BATCH_SIZE=1000 \
	EVIDENCE_AUTO_ACCEPT_TRUSTED_CORPUS=true \
	EVIDENCE_REVIEW_ONLY_EXCEPTIONS=true \
	EVIDENCE_MAX_RECORDS=500000 \
	EVIDENCE_INGESTION_MODE=bulk \
	pnpm run evidence:ingest -- \
	--run-id=cmopywaft0000fqi0lyochpjg \
	--target-total=500000 \
	--batch-size=1000 \
	--auto-accept=true \
	--max-provider-pages=1
```

The bounded probe should leave the run `STARTED` if the target is not reached, so the same run id can be resumed.

1. Open Evidence Explorer and use server filters for review status, source type, system type, component, metric, material, and search.
1. Open Stack Cockpit and attach accepted catalog evidence through the accepted evidence selector.

## Failure Path

1. If provider access fails, inspect the latest run:

```bash
pnpm --filter @metrev/database prisma studio
```

1. Check `IngestionRun.failureDetail`, `EvidenceIngestionAudit`, and `EvidenceDuplicateDecision`.
1. Resume with the same command after provider access or query configuration is fixed.

## Edge Case

1. If real sources are exhausted before 500,000 records, the command records a warning instead of fabricating rows.
2. Treat `target_total`, `catalog_total`, `recordsStored`, `recordsAccepted`, `recordsFailed`, and `duplicatesSkipped` as the source of truth.
3. Expand or adjust real corpus queries, then rerun with resume enabled.

## Verification Commands and Checks

```bash
pnpm exec vitest run tests/runtime/external-ingestion-shared.test.ts tests/runtime/api.test.ts tests/web-ui/api-client.test.ts tests/web-ui/external-evidence-explorer.test.tsx tests/web-ui/accepted-evidence-selector.test.tsx
```

Expected focused result from this audit:

- 5 test files passed.
- 44 tests passed.
- Focused ingestion recovery regression: `pnpm exec vitest run tests/runtime/external-ingestion-shared.test.ts` passes with 20 tests.

Live count checks should be run against the configured PostgreSQL database after non-dry-run ingestion. Do not report 500,000 records unless the database count confirms it.

## Latest Verified Local Snapshot

- Database: local PostgreSQL on port `5436`.
- Active run id: `cmopywaft0000fqi0lyochpjg`.
- Run status: `STARTED`.
- Target total: `500000` catalog rows.
- Catalog total: `118389`.
- Accepted: `117549`.
- Pending exceptions: `840`.
- Rejected: `0`.
- Records fetched by the authoritative run: `258046`.
- Records stored by the authoritative run: `111165`.
- Records accepted by the authoritative run: `112601`.
- Records failed by the authoritative run: `39`.
- Duplicates skipped by the authoritative run: `43285`.
- Checkpoint after latest monitored chunk: source index `27`, query index `1061`, page limit counter `100`.
- Latest monitored chunk result: exit code `0`, catalog `104453` to `118389`, accepted `103613` to `117549`, pending exceptions contained at `840`.
- Remaining gap: `381611` catalog rows.
