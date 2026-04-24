# 017 Full Big Data Workspace

## Objective

Implement the full METREV analytical workspace as a big-data-ready local-first product by expanding the current runtime into a document-and-claim-centric evidence platform with backend-owned workspace payloads, large seeded datasets, resumable external acquisition, explicit review gates, and audit-grade provenance.

## Why

The current repository already has the core runtime spine for deterministic evaluation, audit generation, workspace presenters, evidence review, and local-first product routes. What it lacks is the scale and structure needed for a very large evidence base, supplier and market intelligence, claim-level review, immutable replayable workspaces, and a fully consolidated workspace UI that remains transparent about defaults, missing data, provenance, and uncertainty.

## Primary users

- analysts operating the METREV workspace across evaluation, comparison, evidence review, and report generation
- engineering reviewers validating provenance, defaults, missing data, confidence posture, and decision traceability across large evidence corpora

## Affected layers

- domain semantics: preserve canonical vocabulary and evidence meaning in `bioelectrochem_agent_kit/domain/`
- contract boundary: expand the hardened and TypeScript-facing boundaries for large evidence, suppliers, snapshots, and presenter payloads without inventing a second vocabulary
- runtime adapters: extend ingestion, persistence, presenters, routes, exports, and evaluation linkage in `apps/` and `packages/`
- UI: reorganize and densify the workspace around backend-owned payloads and large data surfaces
- infrastructure: add reproducible bootstrap, backfill, snapshot refresh, and large local dataset workflows
- docs and workflow: create a new maintained feature pack and update quickstarts, ADRs, and operator guidance as the new evidence model lands

## Scope

### In

- first-class storage for source documents, source artifacts, evidence claims, claim reviews, ontology mappings, supplier profiles and products, evaluation-to-evidence links, and immutable workspace snapshots
- repository-versioned dataset snapshots plus resumable backfill acquisition from OpenAlex, Crossref, Europe PMC, curated manifests, and other provenance-explicit sources
- backend-owned workspace payloads and server-side pagination/filtering/sorting for dashboard, evaluation, comparison, case history, evidence review, printable report, and evaluation registry
- a reorganized METREV workspace UI with a single CSS-first design system, dense data tables, tabs, disclosures, print-safe routes, and decision-first framing
- automated validation across contracts, runtime, Postgres, UI, and end-to-end analyst flows using the large seeded corpus

### Out

- replacing the domain kit or hardened contract layer as sources of truth
- introducing a chat-first or browser-owned decision engine
- silently ingesting external evidence into evaluations without review or explicit provenance

## Functional requirements

1. The runtime must store and query evidence as first-class documents, claims, reviews, and mappings rather than as small catalog items with opaque JSON payloads.
2. The product must ship with both a repository-versioned large dataset snapshot and resumable backfill commands so a fresh local environment can be populated reproducibly and expanded further.
3. The backend must own workspace-ready payloads for all major product routes, including server-side filtering, pagination, bulk review, and lineage disclosure suitable for large data volumes.
4. The evaluation pipeline must preserve the ordered runtime stages of idempotency, accepted-evidence sanitization, normalization, simulation or enrichment, deterministic rules, contract validation, narrative generation, runtime versioning, audit, and persistence.
5. The UI must surface decision posture, provenance, defaults, missing data, uncertainty, versioning, and evidence lineage without inventing new business semantics in the browser.

## Acceptance criteria

- [x] Prisma, repository, and runtime contracts support large-scale documents, claims, suppliers, mappings, review state, usage links, and immutable workspace snapshots.
- [x] A repository-versioned big-data snapshot can bootstrap a fresh local database with at least 200 source documents, 1000 claims, 50 evaluations, and 30 suppliers.
- [x] Acquisition and backfill commands support OpenAlex, Crossref, Europe PMC, and curated manifests with dedupe, checkpoints, provenance, and bounded validation runs.
- [x] Dashboard, evaluations registry, evaluation workspace, comparison, case history, evidence review, and printable report operate on backend-owned payloads that remain explicit about defaults, missing data, provenance, and uncertainty.
- [x] Full validation passes across contracts, runtime, database, build, and end-to-end local workspace flows.

## Clarifications and open questions

- The first implementation must deliver both the snapshot and the backfill pipeline; neither is optional.
- The initial corpus should go beyond BES papers alone and include adjacent literature, supplier and product technical material, market artifacts, patents, and curated internal evidence where provenance can be made explicit.
- Raw copyrighted full text is not automatically safe to version in the repository; normalized metadata, structured claims, provenance, and explicitly redistributable artifacts are the default in-repo posture.

## Risks / unknowns

- The current evidence storage and presenter model are small-catalog oriented; if schema and contract changes do not land first, UI and ingestion work will scale poorly.
- Large evidence volumes will force server-side review, pagination, and bulk operations; client-side list handling is not sufficient.
- Corpus breadth increases provenance and licensing complexity, so ingestion contracts and snapshot composition must stay explicit about what is stored, what is linked externally, and what is review-accepted.
