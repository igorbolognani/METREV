# Research Notes — Authority Runtime Hardening

## Goal

Validate the current executed authority split and determine the repository-safe Prisma posture for the pinned runtime stack.

## Questions

- Which canonical files are actually loaded in runtime execution today?
- Does the current Prisma 7 posture in this repository keep datasource URLs in `prisma.config.ts` while `schema.prisma` stays provider-only?

## Inputs consulted

- docs: Prisma 7 documentation via Context7, root README, runtime-tooling docs, ADR 0002
- repo files: `packages/domain-contracts/src/loaders.ts`, `packages/domain-contracts/src/reconciliation.ts`, `packages/database/prisma/schema.prisma`, `packages/database/prisma.config.ts`, `packages/database/scripts/run-prisma-with-direct-url.mjs`
- experiments: repository test and build baselines, editor diagnostics review

## Findings

- The runtime executes defaults, compatibility, diagnostics, improvements, scoring, sensitivity, and output-section shape from `bioelectro-copilot-contracts/contracts/`, while the domain case template still comes from `bioelectrochem_agent_kit/domain/`.
- Prisma 7 documentation supports datasource URL configuration in `prisma.config.ts`; the current repository follows that posture by keeping `schema.prisma` provider-only, generating the TypeScript client into `packages/database/generated/prisma/`, and using the generated client plus `PrismaPg` adapter for runtime access.
- The migration wrapper still matters in Prisma 7 because repository commands intentionally prefer `DIRECT_URL` for migrations while runtime access continues to use `DATABASE_URL` semantics.

## Decisions

- Keep the executed rule path contract-first and document that choice explicitly.
- Demote `stack.md`, relation notes, and report templates to reference-only or future-facing status until a validated runtime consumer exists.

## Open blockers

- Editor diagnostics or stale internal docs for Prisma can still disagree with the validated repository command path.
- Authority metadata will become noise if it is not covered by regression tests.

## Impact on plan

- The workstream must add executable authority guards instead of relying on prose alone.
- Prisma docs and ADRs must privilege command-backed validation for the pinned Prisma 7 repository version.
