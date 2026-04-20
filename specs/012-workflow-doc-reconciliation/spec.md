# Feature Specification — Workflow And Documentation Reconciliation

## Objective

Align the maintained docs, prompts, tooling notes, and reference surfaces with the current shipped runtime so the repository stops signaling multiple competing stories about how METREV actually works.

## Why

The runtime is ahead of some of its documentation and legacy reference surfaces. Without an explicit cleanup pass, contributors can still read outdated architecture assumptions, overestimate inactive tooling, or mistake reference assets for active product behavior.

## Primary users

- maintainers onboarding to the runtime monorepo and workflow surface
- contributors using prompts, specs, ADRs, or tooling docs to drive medium and large changes

## Affected layers

- domain semantics: no semantic rewrite intended
- contract boundary: document active versus future-facing assets clearly
- runtime adapters: no direct behavior change intended
- UI: no direct product feature change intended
- infrastructure: clarify local tooling defaults and optional integrations
- docs and workflow: update root docs, feature packs, and reference notes

## Scope

### In

- demote `stack.md` to non-authoritative reference status
- clarify active versus optional MCP setup and current runtime tooling invariants
- mark ambiguous contract report and relation assets as future-facing until runtime consumers exist

### Out

- rewriting the internal prompt and agent system into a new workflow model
- activating optional local tooling by default when machine-local prerequisites are not guaranteed

## Functional requirements

1. Root docs must point contributors to the active runtime, authority, and workflow surfaces.
2. Tooling setup must distinguish repository-managed defaults from optional local-machine integrations.
3. Future-facing reference assets must stop looking like validated product behavior.

## Acceptance criteria

- [ ] `README.md`, `stack.md`, and runtime-tooling docs no longer imply contradictory runtime truths.
- [ ] Optional MCP integrations are documented as optional and not silently presented as active-by-default.
- [ ] Future-facing relation and report assets are labeled clearly enough that reviewers do not mistake them for runtime behavior.

## Clarifications and open questions

- This slice prefers explicit demotion over forced premature integration.
- The root internal workflow remains the supported path; this is a reconciliation pass, not a workflow replacement.

## Risks / unknowns

- If the docs are too terse, contributors can lose useful design context that still belongs in reference material.
- If future-facing assets are not clearly labeled, the repository will keep signaling behavior it does not actually execute.
