# Feature Specification — Case Evaluation Service Extraction

## Objective

Extract the case evaluation orchestration out of the API route and into a dedicated service so the runtime keeps identical behavior while making the route handler thin, explicit, and easier to extend safely.

## Why

The current `POST /api/cases/evaluate` flow already works, but the route handler still owns normalization, deterministic evaluation, contract validation, narrative generation, audit creation, and persistence in one place. That makes the behavior harder to reuse and harder to evolve without coupling route concerns to runtime orchestration.

## Primary users

- maintainers extending the evaluation pipeline
- reviewers checking that runtime orchestration remains deterministic and auditable

## Affected layers

- domain semantics: no change
- contract boundary: no change
- runtime adapters: API orchestration extraction only
- UI: no change
- infrastructure: no change
- docs and workflow: add a maintained feature pack for this refactor

## Scope

### In

- extract the evaluation orchestration into a dedicated API service
- keep the route focused on auth, request validation, delegation, and response
- preserve the current telemetry spans, validation logging, audit creation, and persistence behavior
- add regression coverage for the extracted service

### Out

- changing the public API shape
- changing the rule engine, database schema, auth model, or UI behavior
- adding browser automation or changing seeded local credentials

## Functional requirements

1. The `POST /api/cases/evaluate` route must preserve its current request and response behavior.
2. The extracted service must keep the existing runtime order: normalization, deterministic evaluation, contract validation, narrative generation, audit creation, and persistence.
3. Validation warnings must continue to be logged with the same message and structured fields.
4. The route must remain thin after the extraction.

## Acceptance criteria

- [x] The route delegates case evaluation orchestration to a dedicated service.
- [x] Existing API tests continue to pass without API contract changes.
- [x] A service-level regression test covers happy-path orchestration and persistence.
- [x] No contract, schema, UI, or auth files require changes.

## Clarifications and open questions

- The service remains inside the API app for now because there is no second runtime caller yet.
- If a second caller appears later, the service can be promoted into a shared package with the same external behavior.

## Risks / unknowns

- Moving orchestration could accidentally weaken logging or span boundaries if the extraction is too aggressive.
- A service abstraction that is too generic would add indirection without real reuse.
