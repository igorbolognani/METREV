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

1. Run contract checks.
   `pnpm run test:python`
2. Run JavaScript and TypeScript runtime checks.
   `pnpm run test:js`
3. Run Postgres-backed persistence checks.
   `pnpm run test:db`
4. Run the build.
   `pnpm run build`
5. Run end-to-end local workspace checks.
   `pnpm run test:e2e`

## Notes

- Domain semantics stay in `bioelectrochem_agent_kit/domain/`.
- Hardened contract boundaries stay in `bioelectro-copilot-contracts/contracts/`.
- The runtime adapts those layers through `apps/` and `packages/`.
- Repository-versioned dataset assets now include a committed query plan in `packages/database/data/bigdata-bootstrap.config.json` and a curated supplier/market manifest in `packages/database/data/curated-bigdata-manifest.json`.
- Repository-versioned dataset assets should contain normalized metadata, structured claims, provenance, and explicitly redistributable artifacts by default.
