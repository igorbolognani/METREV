# Tasks — Analyst UX System

## Workstream 1 — Artifacts and design

- [ ] T1 Record the analyst UX goals, route priorities, and non-goals in a maintained feature pack.
- [ ] T2 Capture the workbench design decisions and route-order reasoning in research notes.

## Workstream 2 — Implementation

- [ ] T3 Add reusable workbench primitives, comparison helpers, and CSS tokens on the current stack.
- [ ] T4 Apply the workbench language to evaluation detail, history comparison, and evidence-review surfaces.

## Workstream 3 — Validation and follow-through

- [ ] T5 Extend and stabilize SSR-safe web tests for summary, modeling, and compare flows.
- [ ] T6 Run local validation for authenticated analyst flow, responsive layout, and runtime parity.

## Dependencies

- The evaluation and history runtime responses must remain stable.
- Simulation enrichment must stay explicit and secondary to deterministic decisions.

## Parallelizable

- [ ] P1 Workbench CSS and route-composition updates can proceed in parallel with test hardening.
- [ ] P2 Evidence-review visual alignment can proceed independently from comparison-dock refinement.

## Validation gates

- [ ] docs updated or marked not needed
- [ ] contract owner files updated or marked not needed
- [ ] tests run or explicit reason recorded
- [ ] acceptance criteria checked

## Definition of done

- [ ] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [ ] `research.md` findings are reflected or marked not needed
- [ ] planning-only contract notes are promoted, retired, or marked not needed
