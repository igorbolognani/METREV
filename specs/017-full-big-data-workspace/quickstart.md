# 017 Full Big Data Workspace Quickstart

## Purpose

Use this workflow to build, seed, validate, and operate the full METREV big-data workspace while preserving the repository's domain and contract authority split.

## Setup

1. Install workspace dependencies.
   `pnpm install`
2. Apply database migrations.
   `pnpm run db:migrate:deploy`
3. Seed local auth users.
   `pnpm run db:seed`
4. Bootstrap the repository-versioned big-data snapshot.
   `pnpm run db:bootstrap:bigdata`

## Bounded Acquisition Checks

1. Run bounded OpenAlex ingestion.
   `pnpm run ingest:literature:openalex -- --query="microbial fuel cell wastewater treatment" --limit=25`
2. Run bounded Crossref ingestion.
   `pnpm run ingest:literature:crossref -- --query="microbial fuel cell wastewater treatment" --limit=25`
3. Run bounded Europe PMC ingestion.
   `pnpm run ingest:literature:europepmc -- --query="microbial fuel cell wastewater treatment" --limit=25`
4. Run curated manifest ingestion.
   `pnpm run ingest:manifest:curated -- --manifest=packages/database/data/curated-bigdata-manifest.json`
5. Run the bounded full bootstrap without persisting.
   `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`

## Local Run

1. Start the full local-first stack.
   `pnpm run local:view:up`
2. Check runtime status.
   `pnpm run local:view:status`
3. Open the login page.
   `pnpm run local:view:open`
4. Shut the stack down when done.
   `pnpm run local:view:down`

## Happy Path Smoke Test

1. Log in and confirm the dashboard renders against the seeded large corpus.
2. Open evidence review and verify server-driven filters, pagination, and claim-level detail.
3. Create a new evaluation with accepted catalog evidence attached.
4. Open the resulting evaluation workspace and confirm overview, recommendations, modeling, roadmap, and audit disclosures.
5. Open comparison, case history, and printable report routes.
6. Confirm export, provenance, defaults, missing data, and version disclosure remain explicit.

## Validation Sequence

1. Run the promoted fast repository matrix.
   `pnpm run validate:fast`
2. Run the promoted local Docker-backed acceptance matrix.
   `pnpm run validate:local`
3. Run the bounded full bootstrap without persisting.
   `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`
4. Run the full bootstrap.
   `pnpm run db:bootstrap:bigdata`

## Current Validated Outcomes

- PASS `pnpm run validate:fast`
- PASS `pnpm run validate:local`
- PASS `pnpm run test:python`
- PASS `pnpm run test:js`
- PASS `pnpm run test:db`
- PASS `pnpm run build`
- PASS `pnpm run test:e2e`
- PASS bounded dry-run bootstrap via `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`
- PASS full bootstrap via `pnpm run db:bootstrap:bigdata`
- Latest recorded bootstrap inventory: 686 source records, 698 catalog items, 2,128 claims, 5 supplier documents, 14 suppliers, 5 products, 64 ingestion runs

## Notes

- Domain semantics stay in `bioelectrochem_agent_kit/domain/`.
- Hardened contract boundaries stay in `bioelectro-copilot-contracts/contracts/`.
- The runtime adapts those layers through `apps/` and `packages/`.
- The repository-level operating decision for snapshot plus backfill, broad corpus scope, and workspace reorganization lives in `adr/0004-big-data-snapshot-and-workspace-reorg.md`.
- Repository-versioned dataset assets now include a committed query plan in `packages/database/data/bigdata-bootstrap.config.json`, a sharded curated snapshot index in `packages/database/data/curated-bigdata-manifest.json`, and shard files under `packages/database/data/curated-bigdata-shards/`.
- Playwright E2E bootstrap resolves the active local-view Docker Postgres port before seeding so the runtime and the test fixture stay on the same database even when an older stack is still running with a different published port.
- Repository-versioned dataset assets should contain normalized metadata, structured claims, provenance, and explicitly redistributable artifacts by default.
