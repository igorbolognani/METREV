# Feature Specification — External Evidence Review And Intake Gate

## Objective

Expose the imported external-evidence catalog to authenticated analysts through a review surface, let analysts explicitly accept or reject catalog items, and allow only accepted catalog evidence to be attached to case evaluations through the existing intake flow.

## Why

The repository already stores imported literature metadata in additive catalog tables, but that catalog is still operationally isolated. Analysts cannot review those records in the runtime, and the evaluation flow cannot safely consume them behind an explicit acceptance gate.

## Primary users

- analysts reviewing imported literature records before they influence a decision run
- reviewers validating that external evidence remains traceable, review-gated, and explicit in the final evaluation package

## Affected layers

- domain semantics: no ontology rewrite intended
- contract boundary: add runtime TypeScript API contracts for catalog listing, detail, and review actions without changing the hardened bioelectrochemical boundary files
- runtime adapters: database repository methods and Fastify routes for catalog review
- UI: analyst review screens, dashboard linkouts, and intake evidence selection
- infrastructure: no new external service or scheduler required
- docs and workflow: add a maintained feature pack and planning-only API note

## Scope

### In

- list and inspect imported external-evidence catalog records in the authenticated runtime
- accept or reject catalog records with an auditable review action
- expose accepted catalog evidence as an explicit selectable input in the case-intake flow
- preserve provenance and prevent pending or rejected catalog evidence from entering evaluations

### Out

- automatic retrieval-to-decision matching without analyst selection
- supplier and market-data adapters beyond the current literature-focused ingestion foundation

## Functional requirements

1. Authenticated users with viewer access must be able to browse the external-evidence catalog and inspect record detail.
2. Only analysts must be able to change review status from pending to accepted or rejected.
3. The case-intake flow must allow explicit selection of accepted catalog evidence and include it as typed evidence in the submitted evaluation payload.

## Acceptance criteria

- [x] The runtime exposes catalog list and detail endpoints that return validated runtime contracts.
- [x] The runtime records analyst review actions without allowing pending or rejected records into the intake selection flow.
- [x] The intake page can attach accepted catalog evidence to a submitted case without breaking the existing preset or manual typed-evidence behavior.

## Clarifications and open questions

- The review gate is explicit analyst selection in the intake flow, not silent automatic evidence attachment.
- This slice keeps the hardened YAML contract boundary unchanged because the new API surface remains an internal runtime contract for now.

## Risks / unknowns

- If the review surface is too thin, accepted evidence could still look opaque to analysts.
- If accepted catalog evidence is merged carelessly, the intake form could become a hidden second evidence source instead of an explicit choice.
