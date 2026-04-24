# Quickstart — Workflow And Documentation Reconciliation

Execution note: use `../015-repository-authority-and-structure-consolidation/quickstart.md` for repository-wide cleanup validation. This quickstart remains specific to the doc and tooling reconciliation sub-slice.

## Goals

- validate that the root docs now describe one coherent runtime and workflow surface
- confirm that optional tooling remains optional and the live local-view flow stays executable

## Preconditions

- the repository root is available locally
- the standard runtime dependencies are installed

## Setup

1. Read `README.md`.
2. Read `docs/runtime-tooling-setup.md`.
3. Inspect `.vscode/mcp.json` and `.vscode/mcp.template.jsonc`.

## Happy path

1. Follow the documented local-view or split `pnpm` flow.
2. Confirm the commands and ports match the repository scripts.
3. Confirm the docs clearly separate active defaults from optional local tooling.

## Failure path

1. Compare the updated docs against an outdated assumption from `stack.md`.
2. Identify the authoritative replacement surface.
3. Confirm the root docs make that replacement explicit.

## Edge case

1. Inspect the contract report templates and relation notes.
2. Confirm they are labeled as future-facing reference assets.
3. Verify they are not described as current runtime behavior.

## Verification commands and checks

- `pnpm run validate:fast`
- `pnpm run local:view:status`
