# Implementation Plan — Evaluation History Filters

## Summary

Add optional history filters to the analyst evaluation history flow using the existing runtime stack and preserve the current source-of-truth split by keeping any contract exploration planning-only until a real hardened boundary change is approved.

## Source-of-truth files

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `bioelectro-copilot-contracts/contracts/output_contract.yaml`
- `specs/_templates/contracts/planning-contract-template.md`

## Affected layers and areas

- runtime adapters in the API and web app
- feature-level planning contract review
- quickstart and validation guidance

## Required durable artifacts

- `spec.md`: required to define the analyst-facing behavior and scope
- `plan.md`: required to record runtime design and source-of-truth constraints
- `tasks.md`: required to sequence API, UI, and validation work
- `quickstart.md`: required to verify happy path, failure path, and edge behavior
- `research.md`: required because date semantics and filter persistence decisions affect implementation details
- `contracts/`: required because request and response examples need explicit review before any hardened contract promotion

## Research inputs

- `research.md` for date, URL state, and query-key decisions
- existing runtime history routes and web UI history flow

## Contracts and canonical owner files

- contracts affected: filtered history request and response examples only
- canonical owner files: `bioelectro-copilot-contracts/contracts/output_contract.yaml` if the filtered history response becomes part of the hardened boundary
- planning-only notes under `specs/<feature>/contracts/`: capture query examples, validation notes, and promotion rules without becoming an executable schema

## Data model or boundary changes

No immediate database schema change is expected. The initial implementation should filter against existing persisted fields and reuse current lifecycle and actor metadata.

## Implementation steps

1. Confirm filter semantics and date normalization in `research.md`.
2. Add runtime query validation and repository filtering for lifecycle state, actor, and date range.
3. Add UI filter controls, URL synchronization, and empty-state messaging.

## Validation strategy

- unit: query normalization and invalid range handling
- integration: API filtering against seeded history data
- e2e/manual: filter history in the browser, refresh, and verify preserved state
- docs/contracts: update quickstart, tasks, and planning contract notes

## Critique summary

The main risk is drifting date semantics between browser and API layers. A second risk is treating the planning contract note as if it were already a canonical schema.

## Refined final plan

Normalize dates in one runtime path, document the decision in `research.md`, and keep the filter contract note explicitly planning-only unless a hardened boundary update is approved.

## Rollback / safety

If URL synchronization or filter parsing proves unstable, keep server-side filtering and remove URL persistence first while preserving the validation behavior.
