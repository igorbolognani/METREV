# Research Notes - Production-Scale Evidence Ingestion

## Goal

Determine what was truly implemented for production-scale scientific evidence ingestion and close missing gaps needed for a complete working implementation path.

## Questions

- Does the repository already contain real persistence, migration, ingestion, dedupe, audit, and auto-accept behavior?
- Are accepted evidence records usable by dashboard, Explorer, exports, and Stack Cockpit without loading the full corpus into the browser?
- Which gaps remain after checking the implementation against the requested plan?

## Inputs Consulted

- Docs: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/docs.instructions.md`, and `README.md`.
- Repo files: Prisma schema and migration, database scripts, repository implementation, API routes, presenters, UI components, domain ontology, contract ontology, and regression tests.
- Experiments: focused Vitest suite for ingestion helpers, API routes, API client, Explorer UI, and accepted evidence selector.

## Findings

- The core production-scale evidence spine was already broadly implemented in the dirty worktree: additive schema, migration, bulk CLI, provider adapters, auto-accept policy, dedupe keys, audit tables, duplicate decisions, fact placeholders, benchmark records, and DB-backed repository summaries.
- The main missing product wiring was technical filter propagation through API client helpers, workspace/export routes, presenter export hrefs, Explorer UI controls, accepted-evidence selector controls, and memory repository behavior.
- Focused validation initially exposed a stale Explorer callback and an incorrect test mock response contract. Both were fixed before the final focused pass.
- The focused validation passed after the latest run-state hardening and Crossref stale-cursor recovery: `pnpm exec vitest run tests/runtime/external-ingestion-shared.test.ts` with 20 tests passing.
- A non-dry-run live provider ingestion was executed against local PostgreSQL. It proved OpenAlex, Crossref, and Europe PMC write real rows through the production-scale path.
- Latest verified local status: 118,389 catalog rows, 117,549 accepted rows, 840 pending exception rows, and 0 rejected rows.
- The authoritative active run remains `cmopywaft0000fqi0lyochpjg` with status `STARTED`, target `500000`, records fetched `258046`, records stored `111165`, records accepted `112601`, records failed `39`, and duplicates skipped `43285`.
- A monitored 100-page explicit resume reached page `69/100` before Crossref returned `404` for an existing cursor. The CLI now treats that stale cursor as recoverable cursor exhaustion, and a bounded 1-page recovery resume exited cleanly while preserving the run as resumable.
- A later monitored 100-page explicit resume completed with exit code `0`, reached the page cap with a resumable warning, and proved the stale Crossref cursor path no longer aborts the live ingestion run.
- The latest approved monitored 100-page explicit resume completed with exit code `0`, advanced the catalog from 104,453 to 118,389 rows, kept the exception queue contained at 840 pending rows, and left the authoritative run resumable at source index 27 and query index 1061.

## Decisions

- Preserve the repo source-of-truth model: domain semantics stay in the domain kit, hardened contract shape stays in contracts and Zod schemas, runtime adapts both.
- Treat `auto_accept_trusted_scientific_corpus_v1` as the policy for valid trusted scientific corpus records.
- Keep review queue semantics focused on exceptions, not every imported record.
- Keep evidence retrieval server-paged and technically filterable.

## Open Blockers

- Reaching 500,000 records requires continuing the active live run or expanding provider/query coverage if configured sources exhaust before the target.
- Provider exhaustion, rate limiting, or query limits may prevent reaching 500,000 records in one run; warnings must remain explicit.
- Crossref-only source pivoting should not be used blindly because changing source selection can interact badly with checkpoint cursor shape.
- Existing Crossref cursor `404/410` responses are treated as exhausted cursor paths; first-page Crossref failures remain hard failures so query or provider bugs are not hidden.
- Heuristic scientific fact placeholders are not a replacement for future high-fidelity extraction and normalization.

## Impact on Plan

- Implementation should be considered structurally complete for the audited path and operationally proven for bounded local live ingestion.
- Remaining validation should focus on continuing the active run toward 500,000, provider exhaustion behavior, and broad local/e2e validation once the corpus grows further.
