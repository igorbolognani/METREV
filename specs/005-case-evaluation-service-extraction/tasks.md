# Tasks — Case Evaluation Service Extraction

## Workstream 1 — Artifacts and scope control

- [x] T1 Capture the refactor scope, non-goals, and acceptance criteria in the feature pack.
- [x] T2 Confirm the current runtime flow and source-of-truth files before editing route behavior.

## Workstream 2 — Implementation

- [x] T3 Add a dedicated case evaluation service that preserves normalization, rule execution, validation, audit, narrative, and persistence behavior.
- [x] T4 Reduce the route handler to auth, parsing, service delegation, and response handling.

## Workstream 3 — Validation and follow-through

- [x] T5 Add focused regression coverage for the extracted service.
- [x] T6 Run lint, JavaScript tests, and build checks.
- [x] T7 Start the validated local-view stack and open the login page for manual follow-through.

## Dependencies

- T3 depends on T1 and T2.
- T4 depends on T3.
- T5 depends on T3.
- T6 depends on T4 and T5.
- T7 depends on T6.

## Parallelizable

- [x] P1 Draft the feature pack while reviewing the route and repository boundaries.
- [x] P2 Add service regression coverage while the route stays API-contract stable.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] local-view flow started or explicit blocker recorded

## Definition of done

- [x] route behavior remains contract-compatible
- [x] service extraction is localized and readable
- [x] validation results are recorded explicitly
