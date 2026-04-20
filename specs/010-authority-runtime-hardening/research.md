# Research Notes — Authority Runtime Hardening

## Goal

Validate the current executed authority split and determine the repository-safe Prisma posture for the pinned runtime stack.

## Questions

- Which canonical files are actually loaded in runtime execution today?
- Does the current Prisma version in this repository still require `url = env("DATABASE_URL")` in `schema.prisma`?

## Inputs consulted

- docs: Prisma 6.19.x documentation via Context7, root README, runtime-tooling docs, ADR 0002
- repo files: `packages/domain-contracts/src/loaders.ts`, `packages/domain-contracts/src/reconciliation.ts`, `packages/database/prisma/schema.prisma`, `packages/database/prisma.config.ts`, `packages/database/scripts/run-prisma-with-direct-url.mjs`
- experiments: repository test and build baselines, editor diagnostics review

## Findings

- The runtime executes defaults, compatibility, diagnostics, improvements, scoring, sensitivity, and output-section shape from `bioelectro-copilot-contracts/contracts/`, while the domain case template still comes from `bioelectrochem_agent_kit/domain/`.
- Prisma 6.19.x documentation still shows `url = env("DATABASE_URL")` inside `schema.prisma`; the current repository command path also depends on that posture even though editor diagnostics may suggest a Prisma 7-only configuration.

## Decisions

- Keep the executed rule path contract-first and document that choice explicitly.
- Demote `stack.md`, relation notes, and report templates to reference-only or future-facing status until a validated runtime consumer exists.

## Open blockers

- Editor diagnostics for Prisma can still disagree with the validated repository command path.
- Authority metadata will become noise if it is not covered by regression tests.

## Impact on plan

- The workstream must add executable authority guards instead of relying on prose alone.
- Prisma docs and ADRs must privilege command-backed validation for the pinned repository version.
