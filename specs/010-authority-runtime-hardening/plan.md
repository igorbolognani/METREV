# Implementation Plan — Authority Runtime Hardening

Execution note: use `../015-repository-authority-and-structure-consolidation/plan.md` for umbrella coordination. This file remains the detailed hardening plan for the authority-runtime sub-slice.

## Summary

Harden the live authority model by documenting the current contract-first executed rule path, adding runtime assertions around canonical file loading and output sections, and aligning Prisma docs and command behavior with the validated Prisma 7 repository posture.

## Source-of-truth files

- `bioelectrochem_agent_kit/domain/`
- `bioelectro-copilot-contracts/contracts/`
- `packages/domain-contracts/src/loaders.ts`
- `packages/domain-contracts/src/reconciliation.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma.config.ts`
- `packages/database/scripts/run-prisma-with-direct-url.mjs`

## Affected layers and areas

- runtime authority metadata and tests
- Prisma runtime and migration invariants
- root architecture and tooling documentation

## Required durable artifacts

- `spec.md`: define the authority problem and scope boundaries
- `plan.md`: tie docs, code, and tests back to the current runtime truth
- `tasks.md`: sequence authority metadata, tests, docs, and Prisma follow-through
- `quickstart.md`: document how to validate the authority and Prisma posture locally
- `research.md`: capture the Prisma version-sensitive finding and the explicit demotion of ambiguous assets
- `contracts/`: `contracts/authority-boundaries.md` to keep the semantic-contract-runtime mapping reviewable without creating a new schema authority

## Research inputs

- Prisma 7 docs for `prisma.config.ts`, datasource behavior, and generated-client posture
- current runtime loaders and reconciliation metadata
- root docs and workflow assets that still implied multiple authorities

## Contracts and canonical owner files

- contracts affected: no hardened YAML schema rewrite intended
- canonical owner files: `bioelectrochem_agent_kit/domain/**/*`, `bioelectro-copilot-contracts/contracts/**/*`, `packages/domain-contracts/src/loaders.ts`
- planning-only notes under `specs/<feature>/contracts/`: `contracts/authority-boundaries.md`

## Data model or boundary changes

No product data-model rewrite is required. This slice adds authority metadata, regression tests, and documentation around the current executed boundary.

## Implementation steps

1. Extend the shared runtime contracts package with explicit authority metadata for executed, semantic, and reference-only assets.
2. Add runtime tests that assert the executed output sections, runtime-loaded canonical files, and intentionally non-executed references.
3. Update ADRs and runtime-tooling docs to codify the current Prisma posture and the non-authoritative status of `stack.md`.

## Validation strategy

- unit: assert runtime authority metadata and output-section alignment in the Vitest suite
- integration: run `pnpm run test`, `pnpm run prisma:generate`, and `pnpm run build`
- e2e/manual: verify the documented local flow still uses `DIRECT_URL` for migrations and `DATABASE_URL` for runtime
- docs/contracts: ensure the planning-only boundary note cites canonical owner files and the ADR matches the code path

## Critique summary

The biggest risk is documenting authority without testing it. The authority note must be executable enough to fail when runtime behavior drifts.

## Refined final plan

Keep the slice narrow and non-disruptive: do not move rule ownership, do not redesign the contract boundary, and do not overfit to editor diagnostics. Make the current truth explicit, test it, and document the exceptions.

## Rollback / safety

If the authority metadata proves noisy, revert only the metadata surface and keep the ADR plus validation tests for output sections and Prisma posture.
