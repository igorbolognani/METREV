# Tasks — External Evidence Review And Intake Gate

## Workstream 1 — Artifacts and boundary design

- [x] T1 Capture the explicit review-gated workflow and non-goals in the feature pack.
- [x] T2 Define the planning-only internal API shapes for catalog listing, detail, and review actions.

## Workstream 2 — Runtime implementation

- [x] T3 Add repository methods and authenticated API routes for catalog list, detail, and review actions.
- [x] T4 Extend the intake flow so accepted catalog evidence can be selected explicitly and merged into the submitted typed-evidence bundle.

## Workstream 3 — UI and validation

- [x] T5 Add the authenticated analyst review UI and intake selection surface.
- [x] T6 Run automated validation, live ingestion verification follow-through, and record residual checks.

T6 status: automated validation passed with `pnpm run lint`, `pnpm run test:js`, and `pnpm run build`, including regression coverage for the authoritative server-side accepted-only gate on catalog evidence submission. Live OpenAlex follow-through also completed successfully with a small query, fetching 2 records and storing 2 records. On 2026-04-15, authenticated runtime smoke also completed against the live hosted-Supabase plus split `pnpm` path via issued Auth.js JWT session cookies: a viewer review mutation was rejected with `403`, an analyst accepted a pending imported record into the catalog, accepted evidence became selectable for intake, and a wastewater evaluation persisted mixed manual plus catalog evidence through the deterministic evaluation path. Residual limitation: interactive browser click-through was not available in this chat session, so the check used live HTTP route and API assertions rather than DOM-level review actions.

## Dependencies

- T2 depends on T1.
- T3 depends on T2.
- T4 depends on T3.
- T5 depends on T3 and T4.
- T6 depends on T3 through T5.

## Parallelizable

- [x] P1 Draft the feature pack while mapping the existing catalog persistence and intake helper.
- [x] P2 Prepare API regression coverage while building the web review and intake surfaces.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
