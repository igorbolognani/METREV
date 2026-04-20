# Implementation Plan — Workflow And Documentation Reconciliation

Execution note: use `../015-repository-authority-and-structure-consolidation/plan.md` for umbrella coordination. This file remains the detailed plan for the doc and tooling reconciliation sub-slice.

## Summary

Reconcile the root documentation and workflow surfaces with the shipped runtime by making authority explicit, demoting stale or future-facing references, and documenting local tooling defaults versus optional machine-local integrations.

## Source-of-truth files

- `README.md`
- `stack.md`
- `docs/runtime-tooling-setup.md`
- `docs/internal-feature-workflow.md`
- `.vscode/mcp.json`
- `.vscode/mcp.template.jsonc`
- `bioelectro-copilot-contracts/contracts/reports/*.md`

## Affected layers and areas

- root runtime documentation
- workflow and tooling guidance
- reference-only contract assets

## Required durable artifacts

- `spec.md`: define the reconciliation scope and non-goals
- `plan.md`: map the root docs and tooling surfaces that must agree
- `tasks.md`: sequence doc, workflow, and reference-asset cleanup
- `quickstart.md`: document how to validate the root doc surface locally
- `research.md`: capture the current active MCP defaults, stack-brief drift, and future-facing asset decisions
- `contracts/`: not needed because no new boundary mapping is introduced here

## Research inputs

- root README, stack brief, and tooling setup docs
- workspace MCP files and workflow prompts
- contract report templates and relation notes that still signal future work

## Contracts and canonical owner files

- contracts affected: contract report templates remain reference-only in this slice
- canonical owner files: `README.md`, `docs/runtime-tooling-setup.md`, `stack.md`, `.vscode/mcp.json`, `.vscode/mcp.template.jsonc`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No runtime or persistence boundary change is intended. This slice is documentation and workflow reconciliation only.

## Implementation steps

1. Update root docs to point contributors to the active authority, runtime, and workflow surfaces.
2. Clarify default versus optional MCP setup and record the current Prisma tooling invariant in runtime-tooling docs.
3. Mark future-facing report and relation assets clearly enough that they no longer masquerade as live product behavior.

## Validation strategy

- unit: no dedicated unit test required beyond doc-facing runtime authority tests
- integration: run `pnpm run test`, `pnpm run lint`, and `pnpm run build`
- e2e/manual: inspect the updated root docs and confirm the local-view workflow remains executable from the documented commands
- docs/contracts: ensure the new ADR, feature packs, and README agree on the same active surfaces

## Critique summary

The risk is replacing one form of ambiguity with another. The docs should stay precise, but they also need to preserve enough operational detail for contributors to bootstrap the runtime locally.

## Refined final plan

Keep the root docs concise and explicit: document the live path, mark the reference path, and stop implying that optional tooling or future-facing contract assets are already integrated.

## Rollback / safety

If any wording change confuses the live bootstrap flow, revert the doc-only changes while keeping the ADR and feature packs as the durable correction path.
