# Implementation Plan — Local-First Professional Workspace

## Summary

Use 014 as the antecedent local-first workspace reference for the shipped METREV baseline. The repository now contains the main contract, presenter, route, workspace, export, idempotency, focused regression, and Playwright local E2E slices, but the active execution path has moved to `specs/020-metrev-three-phase-product-plan/` plus `specs/021-public-infographic-pages/`. This plan records that earlier shipped posture, keeps the backend-owned workspace architecture explicit, and limits remaining follow-through to optional manual browser print or export checks or future polish outside this historical pack.

## Source-of-truth files

- `bioelectrochem_agent_kit/domain/`
- `bioelectro-copilot-contracts/contracts/reports/consulting_report_template.md`
- `bioelectro-copilot-contracts/contracts/reports/diagnostic_summary_template.md`
- `packages/domain-contracts/src/schemas.ts`
- `apps/api-server/src/presenters/workspace-presenters.ts`
- `apps/api-server/src/routes/workspace.ts`
- `apps/api-server/src/routes/exports.ts`
- `apps/api-server/src/services/case-evaluation.ts`
- `apps/web-ui/src/components/**/*.tsx`
- `apps/web-ui/src/app/**/*.tsx`

## Affected layers and areas

- workspace and export contract boundary
- audit traceability and idempotent evaluation persistence
- backend presenter layer and dedicated workspace/export routes
- web route topology, reusable workspace chrome, and local export UX
- quickstart, wireframes, and validation workflow under `specs/014-local-first-professional-workspace/`

## Required durable artifacts

- `spec.md`: define the local-first professional workspace target, guardrails, and acceptance criteria
- `plan.md`: map the execution order across contracts, backend, UI, exports, and validation
- `tasks.md`: record the shipped workstreams, the optional manual smoke residue, and any explicit future-slice deferrals
- `quickstart.md`: document route topology, wireframes, local validation flow, and print/export checks
- `research.md`: capture the architectural decisions behind backend-owned view models, route separation, and report-template alignment
- `contracts/`: not required right now because the canonical owners remain the runtime contract package and the report templates

## Research inputs

- the 013 antecedent pack and the current runtime diff already landed in the workspace
- the consulting and diagnostic report templates under `bioelectro-copilot-contracts/contracts/reports/`
- the live workspace presenters, dedicated routes, and export serialization path in the API server
- the local-first runtime assumptions around Auth.js seeded users, browser-native print, and synchronous submission

## Contracts and canonical owner files

- contracts affected: `packages/domain-contracts/src/schemas.ts` plus the report template references under `bioelectro-copilot-contracts/contracts/reports/`
- canonical owner files: `apps/api-server/src/presenters/workspace-presenters.ts`, `apps/api-server/src/routes/workspace.ts`, `apps/api-server/src/routes/exports.ts`, `apps/web-ui/src/components/**/*`
- planning-only notes under `specs/<feature>/contracts/`: not required unless a later phase needs an explicit contract review memo for report/export boundary promotion

## Data model or boundary changes

The current slice adds explicit workspace response schemas, printable report and CSV export metadata, runtime version metadata, traceability summaries, and persisted `idempotencyKey` storage on `EvaluationRecord`. These are additive boundary changes that preserve the canonical evaluation endpoints while promoting workspace endpoints as the primary web-facing source.

## Implementation steps

1. Keep the domain vocabulary and hardened contracts authoritative, then expose additive workspace/export schemas instead of frontend heuristics.
2. Build and harden the presenter layer that converts evaluation, history, evidence, and export data into workspace-ready payloads.
3. Route the web UI through dedicated operational surfaces backed by those payloads and remove overlapping decision logic from the browser.
4. Keep local exports, report sections, defaults, missing data, evidence posture, and runtime versions explicit across every surface.
5. Extend runtime and SSR validation so dashboard, submitting, evaluation, history, comparison, evidence review, and report routes are covered by automated checks.
6. Keep Playwright local E2E as part of the validated closure for this pack and treat any additional browser print/export smoke as optional follow-through rather than a blocked acceptance item.

## Validation strategy

- unit: presenter mappers, report/export serialization, workspace view composition, and deterministic progress rendering
- integration: Fastify route coverage for workspace/export endpoints, idempotency, and version traceability
- e2e/manual: seeded local login, dashboard to intake to result to history/compare/evidence/review/report/export flow, duplicate-submit check by idempotency key, plus optional browser print/export smoke when needed
- docs/contracts: keep 014 aligned with the implemented route topology, report structure, and local-only assumptions

## Critique summary

The main risk is reopening the pack for indefinite polish after the architectural and validation goals have already landed. The real bar is backend-owned decision framing, export/report trustworthiness, and repeatable local validation; further visual tuning belongs in a later slice unless it exposes a real regression in those guarantees.

## Refined final plan

Treat 014 as the maintained execution source for the shipped local-first product phase. Preserve the additive backend workspace architecture already landed, keep the validation net green around the dedicated routes, and move any later visual-only follow-through into a future slice instead of leaving this pack half-open.

## Rollback / safety

The workspace and export routes are additive. If a specific route or presenter regresses, rollback can happen at the route or component level without removing the canonical evaluation endpoints or weakening the core deterministic pipeline.
