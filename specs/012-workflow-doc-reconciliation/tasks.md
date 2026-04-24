# Tasks — Workflow And Documentation Reconciliation

Execution note: 015 is the umbrella consolidation pack. Keep this task list for the detailed doc-and-tooling reconciliation sub-slice only.

## Workstream 1 — Artifacts and design

- [x] T1 Record the documentation and workflow reconciliation scope in a maintained feature pack.
- [x] T2 Capture the active versus optional tooling decisions in research notes.

## Workstream 2 — Implementation

- [x] T3 Update `README.md`, `stack.md`, and runtime-tooling docs to reflect the current shipped runtime.
- [x] T4 Mark optional MCP setup and future-facing contract reference assets clearly.

## Workstream 3 — Validation and follow-through

- [x] T5 Re-run root validation and confirm the documented local-view commands still match the product surface.
- [x] T6 Review the updated root docs, ADRs, and specs for a single consistent runtime story.

## Dependencies

- ADR 0003 and the authority hardening slice must define the active authority split.
- Optional local tooling should remain machine-safe by default.

## Parallelizable

- [x] P1 Root doc cleanup can proceed in parallel with report-template labeling and lint cleanup.
- [x] P2 README and runtime-tooling updates can be reviewed independently from `stack.md` demotion.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
