# Feature Specification — Authority Runtime Hardening

## Objective

Make METREV's executed authority, local Prisma posture, and runtime-loaded canonical files explicit, validated, and reviewable without changing the deterministic decision behavior.

## Why

The repository already runs a real product path, but the authority model is still too easy to misread. Domain semantics, hardened contracts, runtime adapters, specs, and reference-only assets all coexist, and the current ambiguity raises regression risk every time rules, docs, or tooling shift.

## Primary users

- maintainers changing normalization, rules, contracts, persistence, or audit behavior
- reviewers validating whether a runtime change preserved the intended source-of-truth split

## Affected layers

- domain semantics: clarify semantic ownership only
- contract boundary: keep current hardened rule ownership explicit
- runtime adapters: add executable authority metadata and tests
- UI: no intentional product behavior change
- infrastructure: keep Prisma and migration invariants aligned
- docs and workflow: add durable authority records and architecture decisions

## Scope

### In

- codify the current authority split as an accepted repository decision
- add executable guards for runtime-loaded canonical files and required output sections
- reconcile Prisma runtime, migration, and documentation posture for the current repository version

### Out

- moving executed rule ownership from contract files to domain files
- redesigning the deterministic output contract or domain vocabulary in this slice

## Functional requirements

1. The repository must expose one explicit statement of runtime authority that matches the actual executed code path.
2. The runtime test suite must prove which canonical files are loaded in execution and which assets remain intentionally non-executed.
3. Prisma runtime and migration setup must stay aligned across schema, config, wrapper scripts, docs, and CI for the current pinned version.

## Acceptance criteria

- [ ] The repository contains an accepted ADR and maintained feature pack documenting the authority split and tooling invariants.
- [ ] Runtime tests fail if the executed contract output sections or runtime-loaded canonical file list drift.
- [ ] The Prisma posture is documented and validated through repo commands rather than editor assumptions.

## Clarifications and open questions

- This slice preserves contract-first executed rules because that is the current runtime truth.
- Ambiguous assets can be explicitly demoted to future-facing reference status instead of being forced into runtime prematurely.

## Risks / unknowns

- Editor diagnostics for Prisma can still disagree with command-backed validation for the current repository version.
- If authority metadata becomes stale, it can turn into a second source of truth unless it is covered by tests.
