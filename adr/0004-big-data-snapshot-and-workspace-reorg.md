# ADR 0004: Big Data Snapshot And Workspace Reorganization

## Status

Accepted

## Context

Feature pack 017 extends the existing audited local-first runtime into a big-data-ready analyst workspace. That work introduced three related decisions that were explicit in the maintained feature pack but not yet ratified as repository-level architecture guidance:

- the evidence base must ship through both a repository-versioned bootstrap path and a resumable backfill path
- the initial corpus is intentionally broad and includes literature, supplier and product materials, market artifacts, patents, and curated internal evidence where provenance remains explicit
- the web UI is allowed to reorganize around product areas and shared dense-data primitives as long as business semantics stay in the backend and canonical layers

Without an ADR, those choices remain implementation facts rather than an authoritative runtime decision.

## Decision

The runtime adopts a dual-path big-data posture.

- repository-versioned snapshot assets provide reproducible local bootstrap for analyst and validation workflows
- resumable backfill commands remain available to widen or refresh the local evidence base without requiring a full reseed

The committed repository snapshot posture is intentionally narrow.

- default in-repo assets must be normalized metadata, structured claims, provenance records, manifest or index files, and only explicitly redistributable artifacts
- non-redistributable or license-uncertain full text must remain out of the committed snapshot by default

The initial big-data corpus is intentionally broad.

- BES and adjacent literature remain in scope
- supplier and product technical documents remain in scope
- market artifacts, patents, and curated internal evidence remain in scope when provenance and review posture are explicit

The runtime web UI may reorganize around product areas and shared dense-data primitives.

- route-level surfaces such as dashboard, intake, evaluation workspace, evidence review, case history, comparison, and printable report may move under clearer product-area component groupings
- shared dense-table and disclosure primitives may be consolidated
- the browser must keep consuming backend-owned payloads and must not invent business rules, defaults, uncertainty posture, or provenance semantics

## Validation Snapshot

At the time this ADR is accepted, the validated closeout baseline is:

- PASS `pnpm run test:python`
- PASS `pnpm run test:js`
- PASS `pnpm run test:db`
- PASS `pnpm run build`
- PASS `pnpm run test:e2e`
- PASS bounded dry-run bootstrap via `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`
- PASS full bootstrap via `pnpm run db:bootstrap:bigdata` with 31 executed runs and persisted inventory of 686 source records, 698 catalog items, 2,128 claims, 5 supplier documents, 14 suppliers, 5 products, and 64 recorded runs

## Consequences

### Positive

- Local environments can be bootstrapped reproducibly while still supporting corpus growth.
- Large-data UI work can consolidate around product areas and dense-data primitives without re-opening domain semantics.
- The corpus scope is explicit enough to include supplier and market intelligence without pretending those sources are validated fact.

### Negative

- Repository asset curation becomes stricter because redistributability and provenance must be reviewed before committing new snapshot shards.
- The UI structure may change more often while the product areas settle.
- Snapshot and backfill paths must stay aligned to avoid drift in local bootstrap behavior.

## Guardrails

- Do not commit raw copyrighted or license-uncertain corpora by default.
- Do not treat broad corpus scope as permission to bypass review gates or provenance disclosure.
- Do not move decision logic, defaults, uncertainty framing, or provenance semantics into the frontend during workspace reorganization.
- Do not let snapshot seeding replace the resumable backfill path; both remain part of the supported operating model.
