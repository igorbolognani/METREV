# Tasks — Evaluation History Filters

## Workstream 1 — Artifacts and design

- [ ] T1 Confirm filter semantics, date handling, and query-key decisions in `research.md`.
- [ ] T2 Review the planning contract note and confirm whether a hardened contract change is needed.

## Workstream 2 — Implementation

- [ ] T3 Add API query validation and repository filtering for lifecycle state, actor, and date range.
- [ ] T4 Add web UI controls, URL synchronization, and empty-state messaging for filtered history.

## Workstream 3 — Validation and follow-through

- [ ] T5 Add or update tests for valid filtering, invalid ranges, and preserved filter state.
- [ ] T6 Update `quickstart.md` and final verification notes with the tested analyst flow.

## Dependencies

- T3 depends on T1 and T2.
- T4 depends on T3.
- T5 depends on T3 and T4.

## Parallelizable

- [ ] P1 Draft browser quickstart steps while API filtering tests are being written.
- [ ] P2 Refine empty-state copy while the planning contract note is being reviewed.

## Validation gates

- [ ] docs updated or marked not needed
- [ ] contract owner files updated or marked not needed
- [ ] tests run or explicit reason recorded
- [ ] acceptance criteria checked

## Definition of done

- [ ] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [ ] `research.md` findings are reflected or marked not needed
- [ ] planning-only contract notes are promoted, retired, or marked not needed
