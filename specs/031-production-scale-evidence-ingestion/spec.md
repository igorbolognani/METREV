# Feature Specification - Production-Scale Evidence Ingestion

## Objective

Upgrade METREV so the external evidence system can ingest, persist, validate, deduplicate, index, review, and use a real trusted scientific corpus with a 500,000-record target. The implementation must make valid trusted scientific records automatically available for decision support and keep only exception records in the analyst review queue.

## Why

The previous intake model treated imported evidence as a manual review queue first. That does not scale to a scientific corpus target and risks turning dashboard counts, review queues, and stack-cockpit evidence selection into bottlenecks. The new model treats manual review as an exception-handling path while preserving provenance, audit events, duplicate decisions, and server-side warehouse slices.

## Primary users

- Analysts who need accepted evidence available for stack diagnosis and case intake.
- Engineering reviewers who need auditable ingestion, validation, dedupe, and persistence behavior.
- Future reporting flows that need accepted catalog evidence without loading a full corpus into browser or LLM context.

## Affected layers

- domain semantics: `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`
- contract boundary: `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml` and `packages/domain-contracts/src/schemas.ts`
- runtime adapters: `packages/database/prisma/schema.prisma`, `packages/database/scripts/`, `packages/database/src/index.ts`
- API: `apps/api-server/src/routes/` and `apps/api-server/src/presenters/workspace-presenters.ts`
- UI: evidence review, evidence explorer, dashboard, and stack-cockpit accepted evidence selector components
- infrastructure: Prisma migration `packages/database/prisma/migrations/20260503120000_production_scale_evidence/migration.sql`
- docs and workflow: `README.md` plus this spec pack

## Scope

### In

- Real corpus ingestion from OpenAlex, Crossref, and Europe PMC using resumable batch checkpoints.
- PostgreSQL persistence for raw source records, catalog acceptance state, ingestion runs, audit events, duplicate decisions, scientific fact placeholders, and benchmark records.
- Schema validation, normalization, deduplication, quality checks, and automatic system acceptance for trusted valid records.
- Exception queue behavior for malformed, low-provenance, low-confidence, untrusted, or duplicate-conflict records.
- Server-side pagination, filtering, counts, facets, CSV export links, and accepted-evidence stack cockpit selection.

### Out

- Claiming that 500,000 records have already been ingested in this local session.
- Synthetic article inflation or fake dashboard counts.
- Full-text PDF/XML hydration for every record in the bulk path.
- Loading the full corpus into the browser, a route response, or an LLM prompt.
- Replacing domain semantics or contract vocabulary with runtime-only names.

## Functional Requirements

1. The ingestion command MUST target 500,000 total catalog records without fabricating rows when real providers return fewer records.
2. The ingestion process MUST preserve provenance, original payloads, normalized fields, acceptance state, and audit decisions in PostgreSQL.
3. Valid trusted scientific corpus records MUST be system-accepted after validation, normalization, dedupe, quality checks, and audit logging.
4. Problematic records MUST remain in the evidence review queue with explicit review-required state.
5. Duplicate detection MUST consider DOI, normalized title plus year plus first author, source URL, content hash, and metadata hash.
6. Evidence Explorer, Evidence Review, exports, dashboard, and Stack Cockpit MUST use server-backed counts, pagination, and filters.
7. Accepted catalog evidence MUST be queryable by technical dimensions such as system type, component, material, and metric.
8. Decision-support flows MUST attach accepted catalog evidence explicitly and avoid using pending or rejected records.

## Acceptance Criteria

- [x] Additive Prisma migration exists for production-scale evidence tables, fields, indexes, and backfills.
- [x] `pnpm run evidence:ingest -- --target-total=500000 --batch-size=1000 --auto-accept=true` exists and dry-run planning is covered by tests.
- [x] Trusted valid scientific records can be auto-accepted with `accepted_by=system` and `acceptance_policy=auto_accept_trusted_scientific_corpus_v1`.
- [x] Invalid or untrusted records remain review exceptions.
- [x] Deduplication covers DOI and title/year/first-author fallback.
- [x] API and memory repository paths support technical evidence filters.
- [x] Evidence Explorer and accepted-evidence selector expose server-backed technical filters and pagination.
- [x] Focused regression suite passed: 44 tests across ingestion, API, client, explorer, and selector coverage.
- [x] A live local PostgreSQL corpus count has been checked after running the non-dry-run ingestion command.
- [ ] The local PostgreSQL corpus has reached the 500,000-record target.

## Implementation Status Checked

- Implemented: ingestion command, database schema, migration, repository counts, server pagination, dashboard summary, review exception copy, explorer filters, CSV filter propagation, accepted evidence selector search/filter/page controls, domain and contract evidence vocabulary updates.
- Newly fixed during audit: technical filter propagation across API client, workspace presenter export links, export route, workspace route, Evidence Explorer UI, accepted evidence selector, memory repository, explicit run-id resume, resumable page-limit pauses, active-run provider failure bookkeeping, recoverable stale Crossref cursor handling, and regression tests.
- Executed during this audit: live non-dry-run ingestion against local PostgreSQL, using explicit local `DATABASE_URL` and `DIRECT_URL` to avoid the Supabase-targeting ambient `.env`.
- Verified latest local corpus status: `118389` catalog rows, `117549` accepted rows, `840` pending exception rows, `0` rejected rows.
- Authoritative active run: `cmopywaft0000fqi0lyochpjg`, status `STARTED`, target `500000`, records fetched `258046`, records stored `111165`, records accepted `112601`, records failed `39`, duplicates skipped `43285`.
- A monitored 100-page chunk reached page `69/100` before a stale Crossref cursor returned `404`; a bounded 1-page recovery run then exited cleanly, marked the cursor path exhausted, and advanced the checkpoint to source index `4`, query index `153`.
- A follow-up monitored 100-page chunk completed successfully after stale Crossref cursor handling was patched, paused at the configured page limit, and advanced the checkpoint to source index `6`, query index `263`.
- The latest approved monitored 100-page chunk completed successfully with exit code `0`, added `13936` catalog rows from `104453` to `118389`, left the review queue contained at `840` pending exceptions, and advanced the checkpoint to source index `27`, query index `1061`.
- Remaining gap: `381611` catalog rows before the 500,000 target.

## Clarifications and Open Questions

- Real provider volume depends on provider availability, query configuration, rate limits, and API responses at ingestion time.
- The target is total catalog size, not new records unconditionally added on every run.
- Scientific fact extraction currently uses ingestion-claim placeholders and heuristic structured fields; deeper extraction remains a future enrichment layer.

## Risks / Unknowns

- Provider APIs may exhaust configured queries before the 500,000 target; the CLI must warn rather than fabricate records.
- High-volume ingestion needs operational monitoring for transaction time, connection limits, and API throttling.
- Structured scientific fact precision depends on later extractor upgrades beyond heuristic claim placeholders.
