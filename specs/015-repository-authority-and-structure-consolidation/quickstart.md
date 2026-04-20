# Quickstart — Repository Authority And Structure Consolidation

## Goals

- verify that the repository now exposes one explicit authority map for active, reference-only, and local-optional surfaces
- confirm that starter/reference demarcation and safe archive retirement reduce ambiguity without touching live product behavior

## Preconditions

- the repository root is available locally
- standard workspace tools such as `rg` and `pnpm` are available when running the optional checks below

## Setup

1. Read `docs/repository-authority-map.md`.
2. Read `README.md`, `AGENTS.md`, `stack.md`, and `docs/runtime-tooling-setup.md`.
3. Inspect `.vscode/mcp.json` and `.vscode/mcp.template.jsonc`.

## Happy path

1. Confirm the root docs point back to `docs/repository-authority-map.md` for repository authority classification.
2. Confirm the optional MCP template contains only local-optional servers and no duplicate `github` definition.
3. Open the starter and nested kit guidance files and confirm they now identify themselves as reference surfaces for this repository.
4. Confirm the root runtime story reflects the current Prisma 7 posture: datasource URLs live in `packages/database/prisma.config.ts`, `schema.prisma` keeps a provider-only datasource block, and migration commands still route through `packages/database/scripts/run-prisma-with-direct-url.mjs`.
5. Confirm the authority map now records the target physical normalization for `apps/`, `packages/`, `tests/`, and root config surfaces without broad directory moves.

## Failure path

1. Search for workflow or tooling files by name, such as `AGENTS.md`, `SKILL.md`, `mcp.template`, or `mcp-integration-guidance`.
2. Identify whether the result is a root-owned authority surface or a labeled reference surface.
3. If a remaining file still looks active without actually being authoritative, or if a root doc still describes the older Prisma posture, record it as follow-up under the 015 task list.

## Edge case

1. Inspect `.serena/project.yml`.
2. Confirm that it is treated as repo-local optional tooling rather than a committed runtime dependency.
3. Verify that removing the duplicate archive copies did not remove the remaining module-local owning sources.
4. Open `REPOSITORY_SANITATION_SUMMARY.md` and `MANUAL_REVIEW_COMPLEMENT.md` and confirm they read as historical notes rather than active repository-authority surfaces.

## Verification commands and checks

- `rg -n "Repository Authority Map|authority map|reference-only|reference only" README.md AGENTS.md docs/ stack.md`
- `rg -n "github|context7|serena" .vscode/mcp.json .vscode/mcp.template.jsonc docs/runtime-tooling-setup.md`
- `rg -n "Prisma 7|provider-only datasource|historical note|active repository-authority surface|target physical normalization" README.md docs/ adr/ REPOSITORY_SANITATION_SUMMARY.md MANUAL_REVIEW_COMPLEMENT.md specs/015-repository-authority-and-structure-consolidation/`
- `pnpm prisma:generate`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`
