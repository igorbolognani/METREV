# Feature Specification — Repository Authority And Structure Consolidation

## Objective

Consolidate METREV around one active workflow surface, one explicit authority map, lower-noise reference assets, and a safer structural normalization path without collapsing the intentional split between domain semantics and the hardened contract boundary.

## Why

The repository already defines its source-of-truth model clearly in prose, but multiple visible copies of similar workflow, tooling, starter, and reference assets still compete for attention. That increases onboarding friction, search noise, and regression risk during large changes.

## Primary users

- maintainers changing workflow, docs, contracts, or runtime structure across the monorepo
- reviewers who need to distinguish active authority from starter, reference, generated, or local-only surfaces quickly

## Affected layers

- domain semantics: preserve the canonical `bioelectrochem_agent_kit/domain/` ownership
- contract boundary: preserve the canonical `bioelectro-copilot-contracts/contracts/` ownership
- runtime adapters: clarify the executed authority anchors and prepare safer structural normalization
- UI: no intentional product-behavior rewrite in this cleanup slice
- infrastructure: reduce tooling ambiguity around MCP and local-only integrations
- docs and workflow: consolidate root authority, demarcate references, and retire redundant duplicate archives

## Scope

### In

- create a single maintained umbrella pack for repository-wide consolidation
- publish one explicit authority map for active, reference-only, and local-optional surfaces
- converge root governance and tooling docs on that authority map
- demarcate starter, domain-kit workflow references, generated exports, and other non-authoritative assets more strongly
- remove safe duplicate archive copies when equivalent source copies remain elsewhere in the repository

### Out

- flattening `bioelectrochem_agent_kit/domain/` and `bioelectro-copilot-contracts/contracts/` into one tree
- broad runtime/package/test folder moves before the current runtime worktree is stable enough for safer structural migration
- changing product behavior, `.env` files, CI settings, or secrets as part of this slice

## Functional requirements

1. The repository must expose one maintained authority map that tells contributors where to edit and where not to edit.
2. Root governance, workflow, and tooling docs must stop signaling multiple competing active surfaces.
3. Starter, generated, antecedent, and local-only surfaces must be labeled clearly enough that they do not masquerade as live authority.
4. Safe duplicate archive copies should be removed once an equivalent owning source remains in place.
5. The consolidation work must preserve the current domain-versus-contract split and the executed loader anchors.

## Acceptance criteria

- [x] `docs/repository-authority-map.md` is present and linked from the root authority surfaces.
- [x] `README.md`, `AGENTS.md`, `stack.md`, and `docs/runtime-tooling-setup.md` point to one coherent authority story.
- [x] `.vscode/mcp.template.jsonc` contains only optional local integrations and no duplicate workspace-owned MCP defaults.
- [x] The starter and domain-kit workflow references are explicitly marked as non-root authority surfaces for this repository.
- [x] Safe duplicate archive copies are retired without deleting the remaining owning sources.
- [x] The target physical normalization map for `apps/`, `packages/`, `tests/`, and root config surfaces is documented without broad directory moves in the active worktree.
- [x] Intentional reference-only, historical, and local-optional surfaces that must remain are recorded in the maintained authority artifacts.

## Clarifications and open questions

- `specs/010-authority-runtime-hardening/` and `specs/012-workflow-doc-reconciliation/` remain useful detailed slices, but 015 becomes the umbrella coordination surface for repository-wide cleanup.
- Runtime/package/test physical normalization closes in this slice as a documentation-first ownership map. Any later mechanical moves should follow this authority cleanup rather than compete with active runtime work.

## Risks / unknowns

- The current runtime worktree already contains substantial product changes; structural normalization must avoid colliding with that active work.
- Some duplicated files are not exact copies but historical or future-facing references, so deletion must stay narrowly scoped to clearly redundant archive material.
