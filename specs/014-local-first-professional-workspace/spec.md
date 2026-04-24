# Feature Specification — Local-First Professional Workspace

## Objective

Implement the next METREV product phase as a local-first, professional workspace with backend-owned workspace view models, dedicated product routes, synchronous but stage-visible evaluation submission, browser-native exports, and explicit audit-grade traceability across the full analyst flow.

## Why

The current runtime already has deterministic evaluation, evidence review, and persistence. The missing layer is product architecture: too much decision framing lived in the frontend, too many surfaces competed on the same page, and the report/export flow was not yet a first-class local product capability.

## Primary users

- analysts running, reopening, comparing, and exporting local evaluations
- engineering reviewers checking that defaults, missing data, evidence posture, and uncertainty remain explicit while the UI becomes more product-grade

## Affected layers

- domain semantics: preserve the canonical vocabulary from `bioelectrochem_agent_kit/domain/`
- contract boundary: add workspace and export schemas in `packages/domain-contracts` without inventing a second runtime vocabulary
- runtime adapters: build backend presenters, exports, traceability metadata, and idempotent evaluation persistence in `apps/api-server` and `packages/*`
- UI: migrate dashboard, input deck, submitting, evaluation, history, comparison, evidence review, and printable report surfaces to backend-owned workspace payloads
- infrastructure: keep the product local-first with no new production cloud dependency or external async job runner
- docs and workflow: make `specs/014-local-first-professional-workspace/` the canonical execution pack while keeping 013 as the antecedent UI reference

## Scope

### In

- backend-owned workspace responses for dashboard, evaluation, case history, comparison, evidence review, printable report, and exports
- dedicated route topology for `/`, `/cases/new`, `/cases/new/submitting`, `/evaluations/[id]`, `/cases/[caseId]/history`, `/evaluations/[id]/compare/[baselineId]`, `/evaluations/[id]/report`, `/evidence/review`, and `/evidence/review/[id]`
- synchronous submission with deterministic progress stages, draft preservation, and backend idempotency keyed by `Idempotency-Key`
- browser-native local export flow for Print/PDF, JSON, and CSV
- explicit runtime version traceability in audit records, workspace responses, printable report payloads, and exports
- focused test coverage for contracts, presenters, routes, exports, and workspace surfaces

### Out

- new deploy scope, cloud services, OAuth rollout, or external background job infrastructure
- moving decision posture, readiness, gaps, or uncertainty heuristics back into the browser
- hiding defaults, missing data, or supplier-claim posture to make the UI look cleaner

## Functional requirements

1. The backend must own workspace-ready summaries for dashboard, evaluation, history, comparison, evidence review, printable report, and exports.
2. The web UI must stop calculating decision posture, readiness, critical gaps, uncertainty framing, trends, and operational summaries locally.
3. The submission flow must remain synchronous for this phase, but the user must see explicit deterministic progress stages and keep form data on failure.
4. The result page must stay centered on the current evaluation, while history and comparison become dedicated routes instead of embedded primary surfaces.
5. The printable report must mirror the consulting-report contract structure with browser-native print/PDF support.
6. Audit, defaults, missing data, evidence posture, and runtime versions must remain explicit in every workspace and export surface.

## Acceptance criteria

- [x] The product works locally end to end without introducing a new production dependency.
- [x] The frontend no longer decides posture, readiness, gaps, uncertainty framing, or primary trend summaries on its own.
- [x] Dashboard, input deck, submitting, evaluation, history, comparison, evidence review, and printable report behave as dedicated surfaces with consistent visual language.
- [x] Print/PDF, JSON, and CSV exports work as local-first product capabilities.
- [x] Audit, defaults, missing data, uncertainty, evidence posture, and runtime versions remain explicit across the workspace and export flows.

## Clarifications and open questions

- 013 remains the antecedent UI/parity pack, but 014 is now the canonical execution pack for this local-first product phase.
- English is the official UI language for this phase.
- Recharts remains an allowed incremental enhancement, but only if chart quality clearly improves without pulling domain heuristics back into the client.
- Playwright-backed local E2E is now part of the validated posture for this phase.
- A brief manual browser print or export smoke remains optional follow-through, not a blocker for 014 closure.

## Risks / unknowns

- The route split increases product clarity, but it also increases the number of surfaces that must stay semantically aligned with the same contracts.
- It is easy to over-index on visual polish and miss the stricter requirement that backend payloads, exports, and traceability remain the real source of truth.
- Playwright and final print validation will require stable local environment conventions before the final acceptance pass is complete.
