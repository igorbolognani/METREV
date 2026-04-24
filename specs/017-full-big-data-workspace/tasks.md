# 017 Full Big Data Workspace Tasks

## Stage 0

- [x] Step 0-A create `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, and `research.md`
- [x] Step 0-B record the authoritative design decision for snapshot plus backfill, wide corpus scope, and broad reorganization

## Stage 1

- [x] Step 1-A add first-class Prisma models for source documents, evidence claims, claim reviews, ontology mappings, supplier assets, evaluation usage links, and immutable snapshots
- [x] Step 1-B expand runtime schemas for the new persistence and presenter entities
- [x] Step 1-C align hardened contract files where validation-facing shapes change
- [x] Step 1-D update repository methods and Postgres tests for the new entities

## Stage 2

- [x] Step 2-A refactor shared ingestion normalization around canonical documents and claims
- [x] Step 2-B upgrade OpenAlex ingestion to checkpointed backfill
- [x] Step 2-C upgrade Crossref ingestion to checkpointed enrichment and dedupe
- [x] Step 2-D add Europe PMC ingestion
- [x] Step 2-E add curated manifest ingestion for supplier, patent, market, and internal evidence assets
- [x] Step 2-F add ingestion tests for normalization, dedupe, and provenance behavior

## Stage 3

- [x] Step 3-A add repository-safe sharded big-data seed assets
- [x] Step 3-B add bootstrap and refresh commands for the large dataset snapshot
- [x] Step 3-C add bounded smoke validation for snapshot seeding and backfill commands

## Stage 4

- [x] Step 4-A update evaluation persistence to keep explicit document, claim, and supplier lineage
- [x] Step 4-B persist immutable workspace and printable report snapshots
- [x] Step 4-C preserve accepted-evidence sanitization and pipeline order in the case evaluation service
- [x] Step 4-D add regression coverage for lineage and snapshot persistence

## Stage 5

- [x] Step 5-A add server-side pagination and filtering for evidence review
- [x] Step 5-B add bulk review endpoints and repository support
- [x] Step 5-C add server-side filtering and sorting for the evaluations registry and related workspace routes
- [x] Step 5-D expand presenter payloads for lineage, claims, suppliers, and snapshot-backed report/export surfaces

## Stage 6

- [x] Step 6-A reorganize the web UI components by product area while preserving the current runtime app
- [x] Step 6-B consolidate shared workspace primitives and dense-table helpers
- [x] Step 6-C normalize `globals.css` into a single METREV token and surface system

## Stage 7

- [x] Step 7-A finish the dashboard against big-data-ready backend payloads
- [x] Step 7-B finish the evaluations registry with server-driven filters and pagination
- [x] Step 7-C finish the five-tab evaluation workspace with lineage and audit disclosure
- [x] Step 7-D finish the evidence review board and detail view for large data volumes
- [x] Step 7-E finish the case history workspace with linked evidence and audit disclosure
- [x] Step 7-F finish the input deck workflow with accepted catalog evidence selection preserved
- [x] Step 7-G finish the side-by-side comparison workspace
- [x] Step 7-H finish the printable report surface and print-safe behavior

## Stage 8

- [x] Step 8-A run `pnpm run test:python`
- [x] Step 8-B run `pnpm run test:js`
- [x] Step 8-C run `pnpm run test:db`
- [x] Step 8-D run `pnpm run build`
- [x] Step 8-E run the big-data bootstrap and bounded ingestion smoke checks
- [x] Step 8-F run `pnpm run test:e2e`
- [x] Step 8-G update quickstarts, docs, and ADRs with PASS or FAIL outcomes

## Current Execution Snapshot

- Repository-safe sharded snapshot assets now live under `packages/database/data/curated-bigdata-shards/` and are loaded through the committed index `packages/database/data/curated-bigdata-manifest.json`
- Full bootstrap completed with 31 executed runs from `packages/database/data/bigdata-bootstrap.config.json`
- Final inventory: 686 source records, 698 catalog items, 2,128 claims, 5 supplier documents, 14 suppliers, 5 products, 64 ingestion runs
- Evidence review and evaluations registry now both use backend-owned filtering and pagination semantics in the web UI
- Dashboard, evaluation workspace, evidence review, input deck, comparison, and printable report routes are live against backend-owned big-data payloads and covered by focused UI or runtime regression tests
- Validated slices so far: `tests/runtime/external-ingestion-shared.test.ts`, `tests/runtime/api.test.ts`, `tests/postgres/persistence.test.ts --config vitest.postgres.config.ts`, `tests/web-ui/external-evidence-review-board.test.tsx`, and `tests/web-ui/evaluations-list-view.test.tsx`
- Full validation now green for `pnpm run test:python`, `pnpm run test:js`, `pnpm run test:db`, `pnpm run build`, and `pnpm run test:e2e`
