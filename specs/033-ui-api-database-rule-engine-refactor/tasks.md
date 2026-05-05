# Tasks - UI, API, Database, and Rule Engine Refactor

## Workstream 1 - Artifacts and design

- [x] T1 Create the `033` feature pack and record the product direction, scope, and safety boundaries.
- [x] T2 Record the initial repository findings and validated runtime slice in `research.md`.
- [ ] T3 Add and retire planning-only contract notes as owner-file promotion decisions are made.

## Workstream 2 - Runtime implementation

- [x] T4 Introduce runtime `EvidenceDecisionContext` schemas and export the new type.
- [x] T5 Build and return an initial decision context from `createPersistedCaseEvaluation` using the existing benchmark-slice query.
- [x] T6 Persist the decision context in `EvaluationResponse` and `AuditRecord`.
- [x] T7 Pass the decision context into `runCaseEvaluation` and consume it for uncertainty/provenance guidance.
- [ ] T8 Promote `EvidenceDecisionContext` and admissibility semantics into hardened YAML/domain owner files.
- [ ] T9 Expand rule-engine usage so context changes recommendation priority and score under focused tests.
- [ ] T10 Harden persistence and replay/debug support for the context beyond audit snapshots if justified.

## Workstream 3 - Client and admin UX refactor

- [ ] T11 Remove evidence-operation metrics from the client dashboard and client-facing workspace hierarchy.
- [ ] T12 Re-house Evidence Explorer, Evidence Review, and Research Tables into explicit internal/admin navigation and routes.
- [ ] T13 Simplify Configure Stack, Evaluations, Result, and Reports so the client sees decision-first surfaces only.

## Workstream 4 - Validation and follow-through

- [x] T14 Add focused tests for the runtime context slice and run them.
- [ ] T15 Add regression tests proving non-decision-ready evidence cannot influence benchmark-backed recommendations.
- [ ] T16 Add UI/RBAC tests proving viewer/client users do not see internal evidence tooling as product workflow.
- [ ] T17 Run lint, JS tests, Python contract checks, build, and any DB-specific validation required by later slices.

## Dependencies

- Owner-file promotion depends on aligning `bioelectrochem_agent_kit/domain/` and `bioelectro-copilot-contracts/contracts/` with the new runtime contract.
- UI cleanup depends on the navigation/route authority staying centralized in `apps/web-ui/src/lib/navigation.ts` and related signed-in shell components.

## Parallelizable

- [ ] P1 Hardened contract/domain promotion can proceed while UI/admin route refactors are being prepared.
- [ ] P2 UI cleanup can proceed in parallel with deeper rule-engine recommendation/scoring work once the runtime contract is stable.

## Validation gates

- [x] docs updated or marked not needed
- [ ] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [ ] acceptance criteria checked

## Definition of done

- [ ] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [ ] planning-only contract notes are promoted, retired, or marked not needed
