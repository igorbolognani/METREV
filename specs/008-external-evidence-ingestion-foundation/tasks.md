# Tasks — External Evidence Ingestion Foundation

## Workstream 1 — Additive storage foundation

- [x] T1 Add additive Prisma models for external source records, catalog evidence items, and ingestion runs.
- [x] T2 Add developer-facing ingestion commands to the root and database package scripts.

## Workstream 2 — Literature-first source adapters

- [x] T3 Add shared normalization helpers for OpenAlex and Crossref literature metadata.
- [x] T4 Add manual ingestion scripts for OpenAlex and Crossref that upsert catalog records and run logs.

## Workstream 3 — Validation and follow-through

- [x] T5 Add automated tests for the first source normalization helpers.
- [x] T6 Run migration, generate, lint, test, and build validation and record any residual blockers.

## Dependencies

- T2 depends on T1.
- T3 depends on T1.
- T4 depends on T2 and T3.
- T5 depends on T3.
- T6 depends on T4 and T5.

## Parallelizable

- [x] P1 Draft the feature pack while shaping the additive catalog models.
- [x] P2 Build the source normalization helpers while preparing the manual ingestion commands.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
