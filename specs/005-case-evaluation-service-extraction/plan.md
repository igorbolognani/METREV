# Implementation Plan — Case Evaluation Service Extraction

## Summary

Move the case evaluation orchestration from the API route into a dedicated service, keep the current behavior intact, and add focused regression coverage so future changes can extend the runtime without rebuilding route-level orchestration.

## Source-of-truth files

- `apps/api-server/src/routes/cases.ts`
- `apps/api-server/src/services/case-evaluation.ts`
- `packages/domain-contracts/src/schemas.ts`
- `packages/domain-contracts/src/validator.ts`
- `packages/rule-engine/src/index.ts`
- `packages/audit/src/index.ts`
- `packages/database/src/index.ts`
- `tests/runtime/api.test.ts`
- `tests/runtime/case-evaluation-service.test.ts`

## Affected layers and areas

- API route orchestration in the Fastify app
- runtime validation and persistence delegation
- workflow artifacts under `specs/`

## Required durable artifacts

- `spec.md`: define the refactor scope and non-goals
- `plan.md`: anchor the extraction to the current runtime behavior
- `tasks.md`: sequence code and validation work
- `quickstart.md`: document validation and manual follow-through
- `research.md`: not required because the refactor is local and uses existing runtime behavior
- `contracts/`: not required because no boundary change is intended

## Research inputs

- current route behavior in `apps/api-server/src/routes/cases.ts`
- repository and audit APIs in `packages/database/src/index.ts` and `packages/audit/src/index.ts`
- current runtime tests under `tests/runtime/`

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `packages/domain-contracts/src/schemas.ts`, `packages/domain-contracts/src/validator.ts`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No data model, API contract, auth boundary, or persistence shape change is intended. The service extraction must remain behavior-preserving.

## Implementation steps

1. Add a dedicated service that owns normalization, deterministic evaluation, contract validation, narrative generation, audit creation, and persistence.
2. Update the route to keep only auth, input validation, service delegation, and reply handling.
3. Add regression coverage for the service and re-run the existing JavaScript validation checks.

## Validation strategy

- unit: add focused service-level regression coverage
- integration: keep the existing API runtime tests intact
- e2e/manual: start the local-view stack and open the login page for the existing authenticated flow
- docs/contracts: confirm no canonical contract files changed

## Critique summary

The main risk is extracting too much and turning a simple route into a service maze. The refactor should stay narrow: one service file, one route update, one regression test, and no new abstractions beyond the current runtime flow.

## Refined final plan

Keep the service inside `apps/api-server/src/services/`, preserve the current spans and logging shape, and prove behavior with both the existing API flow tests and one new service-level regression test.

## Rollback / safety

If the extraction introduces unexpected regressions, revert the service file and the route handler only. No schema, UI, or persistence rollback should be needed.
