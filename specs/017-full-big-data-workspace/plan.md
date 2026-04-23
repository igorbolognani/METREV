# 017 Full Big Data Workspace Plan

## Objective

Extend the existing METREV runtime spine into a full big-data-ready workspace by first making evidence and supplier data first-class in storage and contracts, then delivering reproducible large dataset bootstrap, then scaling API presenters and the UI around backend-owned payloads.

## Stage Order

1. Stage 0: durable feature pack, execution boundaries, dataset and provenance decisions.
2. Stage 1: schema and contract expansion for documents, claims, reviews, suppliers, mappings, usage links, and snapshots.
3. Stage 2: acquisition and backfill pipeline refactor for OpenAlex, Crossref, Europe PMC, and curated manifests.
4. Stage 3: large dataset snapshot, bootstrap commands, and repository-safe sharded seed assets.
5. Stage 4: persistence and evaluation pipeline linkage for accepted evidence, claims, suppliers, and immutable snapshots.
6. Stage 5: API and presenter expansion for server-side pagination, bulk review, lineage, and large workspace payloads.
7. Stage 6: workspace UI reorganization and shared primitive consolidation.
8. Stage 7: route-level completion for dashboard, registry, evaluation, evidence review, case history, comparison, input deck, and printable report.
9. Stage 8: regression hardening, local-view smoke checks, and final validation sequence.

## Implementation Notes

- Reuse the current Next.js app, Fastify app, rule engine, audit package, and workspace presenters instead of rebuilding the product skeleton.
- Keep the domain and contract authority split explicit in every new artifact and command.
- Treat claims, reviews, mappings, and evidence usage as the controlling data model before widening UI scope.
- Keep seed assets normalized, shardable, reproducible, and safe to redistribute.
- Move large list handling, filtering, sorting, and bulk operations to the backend.
- Preserve print-safe routing and local-first runtime behavior.

## Validation Strategy

- After each schema or contract slice, run the smallest relevant validation path first.
- Use Postgres-backed tests for persistence, dedupe, pagination, and snapshot bootstrap behavior.
- Use focused runtime tests for ingestion normalization, accepted-evidence gating, and evaluation linkage.
- Use web UI tests for dense tables, tabs, and disclosure behavior, then confirm end-to-end flows against the big-data seed.
- Keep contract and vocabulary checks green whenever canonical boundary files move.

## Current Status

- Stages 1, 2, and 4 are materially implemented in the runtime and covered by focused validation.
- Stage 3 bootstrap execution completed against the live Postgres database using the committed query plan and curated manifest.
- Stage 5 evidence review now uses backend-owned status, query, source type, page, and page size controls.
- Remaining work is concentrated in hardened contract drift reconciliation, broader route payload expansion, remaining route surfaces, and full final validation.

## Bootstrap Outcome

- Executed runs: 31
- Total records fetched: 762
- Total records stored: 757
- Total claims stored during bootstrap: 2,473
- Total supplier documents stored during bootstrap: 5
- Final persisted inventory: 682 source records, 682 catalog items, 2,094 claims, 5 supplier documents, 14 suppliers, 5 products, 33 recorded runs

## Focused Validation Completed

- `pnpm exec vitest run tests/runtime/external-ingestion-shared.test.ts`
- `pnpm exec vitest run tests/postgres/persistence.test.ts --config vitest.postgres.config.ts`
- `pnpm exec vitest run tests/web-ui/external-evidence-review-board.test.tsx`
- bounded bootstrap dry-run via `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`
- full bootstrap via `pnpm run db:bootstrap:bigdata`

## Stage Summary

### Stage 0

- Files: `specs/017-full-big-data-workspace/*`
- Dependencies: none
- Done criteria: feature pack exists, decisions are explicit, validation paths are named, and the plan is anchored to current runtime owners

### Stage 1

- Files: `packages/database/prisma/schema.prisma`, `packages/database/src/index.ts`, `packages/domain-contracts/src/schemas.ts`, hardened contract files, related tests
- Dependencies: Stage 0
- Done criteria: the runtime has typed first-class entities for documents, claims, reviews, mappings, suppliers, usage links, and snapshots; no critical drift remains across contracts, runtime schemas, and repository methods

### Stage 2

- Files: `packages/database/scripts/ingest-openalex-literature.ts`, `packages/database/scripts/ingest-crossref-literature.ts`, new Europe PMC and manifest importers, shared ingestion helpers, related tests
- Dependencies: Stage 1
- Done criteria: acquisition commands support checkpoints, dedupe, provenance, and resumable bounded backfills into the canonical registry

### Stage 3

- Files: large seed assets, bootstrap scripts, root and package scripts, related docs and tests
- Dependencies: Stages 1 and 2
- Done criteria: a fresh database can be bootstrapped into the requested minimum scale from repository-versioned assets and validated locally

### Stage 4

- Files: `apps/api-server/src/services/case-evaluation.ts`, repository and persistence slices, audit and snapshot helpers, related tests
- Dependencies: Stages 1 and 3
- Done criteria: evaluation flows preserve explicit accepted-evidence gating and persist document, claim, and supplier lineage together with immutable workspace/report snapshots

### Stage 5

- Files: `apps/api-server/src/presenters/workspace-presenters.ts`, route files, export helpers, contract schemas, related tests
- Dependencies: Stages 1 and 4
- Done criteria: major workspace routes use server-side pagination, bulk review, and lineage-ready payloads without browser-owned decision semantics

### Stage 6

- Files: `apps/web-ui/src/app/layout.tsx`, `apps/web-ui/src/app/globals.css`, component reorganization under `apps/web-ui/src/components/*`, `apps/web-ui/src/lib/api.ts`, related tests
- Dependencies: Stage 5 for stable payload contracts
- Done criteria: the UI is reorganized around a consistent METREV workspace design system and shared primitives while preserving print-safe and local-first behavior

### Stage 7

- Files: route pages and feature components for dashboard, registry, evaluation workspace, evidence review, evidence detail, case history, input deck, comparison, and report
- Dependencies: Stages 5 and 6
- Done criteria: all requested product routes are live, dense, decision-first, and driven by backend-owned payloads suitable for large datasets

### Stage 8

- Files: tests, docs, quickstarts, ADRs, cleanup targets
- Dependencies: all prior stages
- Done criteria: final validation sequence passes, operator docs match live commands, and the runtime is locally reproducible with the big-data seed
