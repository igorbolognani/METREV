# Tasks — Evaluation Detail Completion

## Workstream 1 — Artifacts and design

- [x] T1 Capture the UI-only scope and contract-aligned acceptance criteria in the feature pack.
- [x] T2 Map the omitted evaluation sections from the shared schema before editing the page.

## Workstream 2 — Implementation

- [x] T3 Extend the evaluation detail page to render the missing decision-output sections and clearer diagnosis details.
- [x] T4 Adjust styling and case-history navigation so the result remains readable on desktop and mobile.

## Workstream 3 — Validation and follow-through

- [x] T5 Run lint, JavaScript tests, and build checks for regression control.
- [x] T6 Verify the authenticated evaluation detail flow against the live runtime and record residual risks.

T6 status: 2026-04-15 authenticated runtime smoke completed against the live hosted-Supabase plus split `pnpm` path via issued Auth.js JWT session cookies. Verified viewer access to persisted evaluations and case history, repeated wastewater submissions for `SMOKE-WWT-001` produced history depth 2, and the fetched evaluation payload exposed the diagnosis, prioritized options, and typed evidence expected by the cockpit route. Residual limitation: this chat session could not drive an interactive browser, so the check used live HTTP route and API assertions rather than click-through DOM automation.

## Dependencies

- T3 depends on T1 and T2.
- T4 depends on T3.
- T5 and T6 depend on T3 and T4.

## Parallelizable

- [x] P1 Draft the feature pack while reviewing the shared output contract.
- [x] P2 Review empty-state language and layout hierarchy while implementing the new sections.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
