# Implementation Plan — Repository Authority And Structure Consolidation

## Summary

Execute repository-wide consolidation in a safe order: publish a canonical authority map, converge root governance and tooling docs, demarcate starter and nested reference surfaces, retire safe archive duplicates, then close the remaining structural follow-through as a documentation-first ownership map plus validation wave while the active runtime changes continue to settle.

## Source-of-truth files

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `README.md`
- `docs/repository-authority-map.md`
- `docs/internal-feature-workflow.md`
- `docs/runtime-tooling-setup.md`
- `packages/domain-contracts/src/loaders.ts`
- `packages/domain-contracts/src/reconciliation.ts`

## Affected layers and areas

- root authority and workflow guidance
- reference-surface labeling
- MCP ownership and local-tooling guidance
- umbrella cleanup planning for later structural normalization
- target ownership across `apps/`, `packages/`, `tests/`, and shared root config surfaces

## Required durable artifacts

- `spec.md`: define the repository-wide consolidation scope and guardrails
- `plan.md`: record the execution order across docs, references, archives, and later structural work
- `tasks.md`: track completed authority cleanup versus deferred structural normalization
- `quickstart.md`: document how to validate the authority map, reference labeling, and safe archive retirement
- `research.md`: capture duplication findings, authority classification, and deletion criteria
- `contracts/`: not required for this umbrella slice because it does not introduce a new boundary mapping of its own

## Research inputs

- the root governance and tooling surfaces
- `specs/010-authority-runtime-hardening/` and `specs/012-workflow-doc-reconciliation/`
- nested starter and domain-kit workflow assets
- module-local reference exports and the duplicate archive copies that can be retired safely

## Contracts and canonical owner files

- contracts affected: no canonical schema rewrite intended in this slice
- canonical owner files: root governance docs, runtime loader anchors, and the domain-versus-contract source-of-truth split
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No product boundary rewrite is intended. This slice changes the repository governance surface, reference demarcation, and archive shape only.

## Implementation steps

1. Create the umbrella feature pack and authority map so the cleanup has one explicit coordination surface.
2. Converge the root docs and tooling guidance on that map without rewriting unrelated product behavior or runtime code.
3. Demarcate nested starter and domain-kit workflow references so they stop competing with root authority.
4. Retire only the archive copies that are clearly redundant because equivalent owning sources still exist elsewhere in the repository.
5. Document the target physical normalization map explicitly: deployables in `apps/`, reusable runtime libraries in `packages/`, cross-cutting verification in `tests/`, and shared orchestration in root config surfaces.
6. Run the final validation wave, close the remaining supersession notes, and record the intentional reference-only, historical, and local-optional surfaces that still remain.

## Target physical normalization map

- `apps/`: deployable runtime entrypoints, route ownership, and app-specific integration only.
- `packages/`: reusable runtime libraries, adapters, persistence, telemetry, auth, and shared business logic only.
- `tests/`: contract checks, runtime tests, web surface tests, E2E flows, and shared fixtures/support.
- root config: shared workspace orchestration and developer-tool defaults such as package manager config, turbo, TypeScript, Vitest, Playwright, Docker, and workspace MCP defaults.
- reference/historical surfaces: keep starter, antecedent kit workflow assets, historical notes, and future-facing references in place with explicit labels until a later mechanical cleanup wave is planned.

## Validation strategy

- unit: not required for the doc-only changes in this slice
- integration: inspect search results and root doc coherence; run root validation commands after the doc wave when practical
- e2e/manual: verify the MCP ownership story, authority map links, and reference banners directly in the workspace
- docs/contracts: ensure the new umbrella pack, the existing 010/012 sub-slices, and the root docs all point to the same authority story

## Critique summary

The main risk is overreaching into runtime/package physical moves while the worktree already contains substantial product changes. The first implementation wave should therefore lower ambiguity and search noise without adding structural churn to code that is already moving.

## Refined final plan

Land the authority-map and reference-cleanup wave first, then close the remaining structural work as a documented ownership map plus retained-reference registry. Treat any later directory moves as a separate mechanical follow-through after the active runtime worktree stabilizes.

## Rollback / safety

If any wording change makes the root workflow less clear, revert the doc-only changes while keeping the new umbrella pack as the coordination surface. Do not delete any non-archive source file unless its remaining owner copy is already confirmed in the repository.
