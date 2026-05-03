# Implementation Plan - Production-Scale Evidence Ingestion

## Summary

Implement and verify a production-scale evidence spine where real scientific records enter a batch ingestion pipeline, pass through validation, normalization, deduplication, quality checks, and audit logging, then become accepted catalog evidence automatically when trusted and valid. Manual review becomes an exception path. Server-side APIs and UI surfaces expose paged, filtered evidence slices for review, export, dashboard summaries, and stack-cockpit intake.

## Source-of-Truth Files

- Domain semantics: `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`
- Contract boundary: `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- Runtime contracts: `packages/domain-contracts/src/schemas.ts`
- Persistence model: `packages/database/prisma/schema.prisma`
- Runtime repository: `packages/database/src/index.ts`
- Ingestion shared logic: `packages/database/scripts/external-ingestion-shared.mjs`
- Bulk CLI: `packages/database/scripts/ingest-scientific-evidence.ts`

## Affected Layers and Areas

- Database schema and migration for production-scale persistence and indexes.
- Bulk ingestion CLI and provider adapters for OpenAlex, Crossref, and Europe PMC.
- Repository list path with DB counts, facets, technical filters, and aggregation.
- API routes and workspace presenters for review, explorer, dashboard, assistant, and CSV export slices.
- UI controls for Evidence Explorer and accepted evidence selection in Stack Cockpit.
- Tests for deterministic helper behavior, API filters, API client URLs, and UI rendering.

## Required Durable Artifacts

- `spec.md`: records user-facing requirements, scope, acceptance criteria, and implementation status.
- `plan.md`: records source-of-truth files, implementation steps, validation, critique, and refined plan.
- `tasks.md`: tracks checked and remaining workstreams.
- `quickstart.md`: gives reproducible operator steps.
- `research.md`: records repo audit findings and validation observations.
- `contracts/`: not needed for this feature pack because canonical contract changes were promoted directly into contract owner files.

## Research Inputs

- Repository authority map and root agent rules.
- Existing Prisma schema, migration, ingestion scripts, repository implementation, API routes, presenters, UI components, and tests.
- Focused Vitest runs for ingestion helpers, API routes, API client, Evidence Explorer, and accepted evidence selector.

## Contracts and Canonical Owner Files

- Contracts affected: external evidence catalog summary, dashboard evidence catalog summary, acceptance metadata, ingestion fields, and evidence ontology fields.
- Canonical owner files: `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`, `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`, `packages/domain-contracts/src/schemas.ts`.
- Planning-only contract notes: not created. Runtime and contract changes are represented in canonical files instead.

## Data Model or Boundary Changes

- `ExternalSourceRecord` gains normalized title, publication year, first author, source identifier, content hash, and metadata hash indexes for dedupe.
- `ExternalEvidenceCatalogItem` gains accepted-by, acceptance policy, accepted-at, review-required, ingestion mode, ingestion batch, extraction status, normalization status, evidence quality, duplicate decision, and decision-support metadata.
- `IngestionRun` gains target, batch, auto-accept, accepted, pending, rejected, failed, and duplicate counters.
- New tables: `EvidenceIngestionAudit`, `EvidenceDuplicateDecision`, `ScientificEvidenceFact`, and `EvidenceBenchmarkRecord`.
- API list responses expose catalog totals, pending review, failed ingestion, duplicate skipped, last batch, and active ingestion progress.

## Implementation Steps

1. Audit the existing implementation against the requested 500,000-record production-scale plan.
2. Verify the database schema, migration, ingestion CLI, auto-accept policy, dedupe logic, and audit records.
3. Verify repository paths use database counts, pagination, aggregate facets, and scientific fact filters.
4. Patch missing technical filter propagation across API client, API routes, presenters, exports, memory repository, Explorer UI, and accepted-evidence selector.
5. Add regression coverage for technical filters, accepted selector controls, explorer controls, and API route behavior.
6. Run focused validation and record honest operational status.

## Validation Strategy

- Unit: ingestion helper tests for option parsing, normalization, dedupe, auto-accept, exception queue, and dry-run command planning.
- Integration: API route tests for external evidence pagination, source filtering, and technical filters.
- UI: SSR component tests for Evidence Explorer controls/export chips and accepted-evidence selector controls/paged query key.
- API client: fetch URL serialization tests for catalog and workspace technical filters.
- Docs/contracts: spec pack plus canonical domain and contract owner files already updated.

## Critique Summary

- Initial implementation coverage was broad but product wiring had gaps: technical filters existed in the repository but were not consistently exposed through client calls, export links, workspace routes, UI controls, or memory tests.
- Review queue copy still implied every imported record needed manual review; this was updated to exception-review framing.
- Dashboard counts needed to come from repository summary data rather than static UI assumptions.
- Live ingestion was run against local PostgreSQL and verified through database counts, but the local corpus has not reached the 500,000-record target.
- A Crossref-only source pivot exposed unsafe run selection and provider-error bookkeeping; the CLI now supports explicit run-id resume, preserves the active run when bounded page limits pause before target, and advances past stale existing Crossref cursors without aborting the whole run.

## Refined Final Plan

The feature is implemented as a production-scale ingestion and evidence-use foundation, with operational completion dependent on continuing the original live run until the configured real providers either reach the target or exhaust their result space. Continue to treat 500,000 as a target_total for real catalog rows. The latest verified local count is 118,389 catalog rows, not 500,000.

## Rollback / Safety

- The migration is additive and preserves existing evidence records and analyst decisions.
- If bulk ingestion misbehaves, stop the active command, inspect `IngestionRun`, `EvidenceIngestionAudit`, and `EvidenceDuplicateDecision`, then resume the authoritative active run by explicit run id.
- Use bounded `--max-provider-pages` probes for operational verification; bounded probes should leave the run `STARTED` so it remains resumable.
- UI and API changes are server-paged and do not require browser full-corpus loading.
