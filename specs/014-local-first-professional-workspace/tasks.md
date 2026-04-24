# Tasks — Local-First Professional Workspace

## Workstream 1 — Canonical artifacts and route model

- [x] T1 Create `specs/014-local-first-professional-workspace/` as the canonical execution pack and keep 013 as the antecedent UI reference.
- [x] T2 Document the official route topology, local-first assumptions, and report-template alignment for this phase.

## Workstream 2 — Contracts and backend authority

- [x] T3 Add workspace/export schemas, runtime version metadata, traceability summaries, and idempotent evaluation persistence.
- [x] T4 Expose dashboard, evaluation, history, comparison, evidence review, report, JSON export, and CSV export routes backed by presenters instead of frontend heuristics.

## Workstream 3 — Web workspace surfaces

- [x] T5 Migrate dashboard, input deck, submitting, evaluation workspace, history, comparison, evidence review, and printable report surfaces to workspace responses.
- [x] T6 Close the remaining chart-wrapper and visual-polish residue for this pack by confirming it is no longer blocking the shipped local-first product phase; keep any further visual-only tuning in a future slice.

## Workstream 4 — Validation and follow-through

- [x] T7 Extend runtime and SSR web coverage for dedicated workspace surfaces, report/export behavior, and version traceability.
- [x] T8 Add Playwright local E2E for login, dashboard, input, submitting, result, history, comparison, evidence review, exports, print mode, and duplicate-submit idempotency.

## Dependencies

- The canonical domain and hardened contracts must stay aligned with the workspace responses.
- Local Auth.js seeded users remain the baseline for this phase.
- The printable report continues to use browser-native print/PDF rather than an external pipeline.

## Parallelizable

- [x] P1 Playwright setup and local E2E authoring can proceed after the current route contracts and SSR tests are stable.
- [x] P2 Recharts wrappers and later visual polish are explicitly deferred to future slices now that the contract-backed route topology and validation posture for 014 are closed.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
- [x] Playwright closes the automated acceptance gap; a brief manual print/export smoke remains the only optional follow-through
