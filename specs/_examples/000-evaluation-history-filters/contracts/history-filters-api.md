# Planning Contract Note — Evaluation History Filters API

> Planning-only artifact. This note captures feature-scoped examples, mappings, and proposed deltas for review. It is not a canonical schema source.

## Purpose

Make the proposed filter request and filtered response semantics explicit before deciding whether the history view needs a hardened contract update.

## Current state

- canonical owner files: `bioelectro-copilot-contracts/contracts/output_contract.yaml` if the filtered history response becomes part of the hardened boundary
- current status: `no canonical change`

## Proposed request, response, or shape examples

Example request:

```text
GET /evaluations?state=completed&actorId=analyst-001&from=2026-04-01T00:00:00Z&to=2026-04-14T23:59:59Z
```

Example response note:

- reuse the existing history response envelope
- apply filters before pagination metadata is returned
- include a validation error body when `from > to`

## Mapping or adapter notes

- Browser-local date input should normalize to UTC before the request is sent.
- The runtime history route may stay adapter-local unless this view becomes part of the hardened contract boundary.

## Validation notes

- invalid date ranges must fail with a controlled validation response
- filtered zero-result responses must still return a valid history envelope

## Open questions

- Does the existing history response envelope already expose enough metadata for filtered totals?
- If reviewers need to share filtered URLs externally, should the query shape move into the hardened contracts layer?

## Promotion steps

1. If the filtered response or query shape must become canonical, update `bioelectro-copilot-contracts/contracts/output_contract.yaml` and aligned runtime validation.
2. Re-run the aligned contract and runtime tests before treating the change as complete.
