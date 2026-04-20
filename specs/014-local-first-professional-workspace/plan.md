# Implementation Plan — Local-First Professional Workspace

## Summary

Use 014 as the canonical execution pack for the current METREV local-first product phase. The repository already contains the main contract, presenter, route, workspace, export, and idempotency slice. This plan consolidates that slice into the durable workflow, expands validation across the dedicated surfaces, and keeps Playwright plus final local manual validation as the last follow-through step.

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
- `tasks.md`: record completed versus remaining workstreams, especially Playwright follow-through
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
6. Follow through with Playwright local E2E and final manual print/export validation once the runtime and SSR layer are stable.

## Validation strategy

- unit: presenter mappers, report/export serialization, workspace view composition, and deterministic progress rendering
- integration: Fastify route coverage for workspace/export endpoints, idempotency, and version traceability
- e2e/manual: seeded local login, dashboard to intake to result to history/compare/evidence/review/report/export flow, plus duplicate-submit check by idempotency key
- docs/contracts: keep 014 aligned with the implemented route topology, report structure, and local-only assumptions

## Critique summary

The current slice can look "done" because the new routes and screens already exist, but that would be a false finish if 014 is not the canonical pack and if the new surfaces are not backed by stronger validation. The real bar is not just route count or page polish; it is backend-owned decision framing, export/report trustworthiness, and repeatable local validation.

## Refined final plan

Treat 014 as the maintained execution source. Preserve the additive backend workspace architecture already landed, complete the validation net around the new routes, and only then add the heavier Playwright/manual follow-through. This keeps momentum high without reopening the core architectural decision to move product summaries out of the frontend.

## Rollback / safety

The workspace and export routes are additive. If a specific route or presenter regresses, rollback can happen at the route or component level without removing the canonical evaluation endpoints or weakening the core deterministic pipeline.
