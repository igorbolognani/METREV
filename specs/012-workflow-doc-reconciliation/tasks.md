# Tasks — Workflow And Documentation Reconciliation

Execution note: 015 is the umbrella consolidation pack. Keep this task list for the detailed doc-and-tooling reconciliation sub-slice only.

## Workstream 1 — Artifacts and design

- [ ] T1 Record the documentation and workflow reconciliation scope in a maintained feature pack.
- [ ] T2 Capture the active versus optional tooling decisions in research notes.

## Workstream 2 — Implementation

- [ ] T3 Update `README.md`, `stack.md`, and runtime-tooling docs to reflect the current shipped runtime.
- [ ] T4 Mark optional MCP setup and future-facing contract reference assets clearly.

## Workstream 3 — Validation and follow-through

- [ ] T5 Re-run root validation and confirm the documented local-view commands still match the product surface.
- [ ] T6 Review the updated root docs, ADRs, and specs for a single consistent runtime story.

## Dependencies

- ADR 0003 and the authority hardening slice must define the active authority split.
- Optional local tooling should remain machine-safe by default.

## Parallelizable

- [ ] P1 Root doc cleanup can proceed in parallel with report-template labeling and lint cleanup.
- [ ] P2 README and runtime-tooling updates can be reviewed independently from `stack.md` demotion.

## Validation gates

- [ ] docs updated or marked not needed
- [ ] contract owner files updated or marked not needed
- [ ] tests run or explicit reason recorded
- [ ] acceptance criteria checked

## Definition of done

- [ ] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [ ] `research.md` findings are reflected or marked not needed
- [ ] planning-only contract notes are promoted, retired, or marked not needed
