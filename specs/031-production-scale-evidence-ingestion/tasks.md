# Tasks - Production-Scale Evidence Ingestion

## Workstream 1 - Artifacts and Design

- [x] T1 Audit the requested 500,000-record plan against implemented repository code.
- [x] T2 Update canonical domain and contract surfaces for acceptance policy, dedupe, audit, facts, and benchmark layers.
- [x] T3 Create durable feature pack with status, validation, critique, and quickstart.

## Workstream 2 - Implementation

- [x] T4 Add database schema and migration for production-scale evidence persistence, dedupe, audit, facts, and benchmarks.
- [x] T5 Add bulk ingestion CLI with OpenAlex, Crossref, Europe PMC, target-total, batch size, resume checkpoint, and auto-accept options.
- [x] T6 Add validation, normalization, dedupe, auto-accept, audit, duplicate decisions, scientific fact placeholders, and benchmark records.
- [x] T7 Add repository DB counts, server pagination, aggregate facets, ingestion counters, and technical filters.
- [x] T8 Patch API routes, presenters, export links, API client calls, Explorer controls, and accepted evidence selector controls.

## Workstream 3 - Validation and Follow-Through

- [x] T9 Add regression tests for ingestion helpers and dry-run command planning.
- [x] T10 Add API route and API-client tests for technical filters.
- [x] T11 Add UI tests for Evidence Explorer technical controls and accepted selector paged server query state.
- [x] T12 Run focused validation suite and record results.
- [x] T13 Run non-dry-run ingestion against local PostgreSQL and query live catalog counts.
- [ ] T14 Run broader full validation after local database ingestion if provider access is available.
- [ ] T15 Continue the authoritative active run to 500,000 catalog rows or a documented real-provider exhaustion state.

## Dependencies

- PostgreSQL with Prisma migration deployed.
- Real provider network access for OpenAlex, Crossref, and Europe PMC.
- Configured corpus queries in `packages/database/data/bigdata-bootstrap.config.json`.
- Optional provider identity values such as `OPENALEX_MAILTO`, `CROSSREF_MAILTO`, and `EUROPE_PMC_EMAIL`.

## Parallelizable

- [x] P1 UI/API filter tests can run independently of live provider ingestion.
- [x] P2 Documentation and spec pack creation can run independently after implementation audit.
- [ ] P3 Non-dry-run ingestion and broad UI/E2E validation can run after PostgreSQL is available.

## Validation Gates

- [x] Docs updated or marked not needed.
- [x] Contract owner files updated or marked not needed.
- [x] Tests run or explicit reason recorded.
- [x] Acceptance criteria checked.
- [x] Live 500,000-target ingestion executed and catalog counts queried.
- [ ] Live catalog count reached 500,000 or real-provider exhaustion is documented on the authoritative run.

## Definition of Done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent.
- [x] `research.md` findings are reflected in the plan.
- [x] Planning-only contract notes are not needed because canonical owner files were updated.
- [x] Focused validation passes.
- [ ] Operational database contains the expected 500,000-record corpus or a documented provider exhaustion warning.
