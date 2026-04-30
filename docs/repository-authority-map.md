# Repository Authority Map

## Purpose

This document is the maintained index for deciding which repository surfaces are active, which are reference-only, and which remain local-optional.

Use it before editing governance, workflow, tooling, domain, contract, or large documentation assets.

## Active authority surfaces

| Concern                              | Active owner files                                                                                                                                                    | Notes                                                                                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root governance                      | `AGENTS.md`, `.github/copilot-instructions.md`                                                                                                                        | Root policy wins over nested starter or kit workflow assets.                                                                                            |
| Internal feature workflow            | `WORKFLOW.md`, `docs/internal-feature-workflow.md`, `specs/_templates/`, root `.github/prompts/`, root `.github/agents/`, root `.github/skills/`                      | Use the root-owned workflow surface for maintained feature work. `WORKFLOW.md` is the operational contract for agentic execution.                       |
| Repository CI and validation gates   | root `.github/workflows/ci.yml`, root `package.json`, `tests/runtime/workflow-assets.test.ts`                                                                         | Treat the CI workflow, promoted scripts, and workflow-asset regression test as one maintained gate surface.                                             |
| Semantic domain meaning              | `bioelectrochem_agent_kit/domain/`                                                                                                                                    | Canonical vocabulary, evidence semantics, defaults, uncertainty, compatibility intent, and scoring intent live here.                                    |
| Hardened contract boundary           | `bioelectro-copilot-contracts/contracts/`                                                                                                                             | Validation-facing, serialization-facing, storage-facing, and future API boundary shapes live here.                                                      |
| Executed runtime loading             | `packages/domain-contracts/src/loaders.ts`, `packages/domain-contracts/src/reconciliation.ts`                                                                         | These files define which domain and contract assets are actually loaded or treated as validation anchors.                                               |
| Runtime implementation               | `apps/`, `packages/`                                                                                                                                                  | Runtime code adapts the domain and contract layers; it does not replace them.                                                                           |
| Top-level runtime ownership          | `apps/`, `packages/`, `tests/`, root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `vitest*.ts`, `playwright.config.ts`, `docker-compose.yml` | Keep deployables in `apps/`, reusable runtime libraries in `packages/`, verification in `tests/`, and shared orchestration in the root config surfaces. |
| Authority regression checks          | `tests/runtime/domain-contracts.test.ts`, `tests/runtime/output-validator.test.ts`, `tests/contracts/test_canonical_vocabulary.py`                                    | These are the first guards against drift across semantics, contracts, and runtime behavior.                                                             |
| Workspace MCP default                | `.vscode/mcp.json`                                                                                                                                                    | `github` is the only committed live-by-default MCP server in this repository.                                                                           |
| Optional local MCP templates         | `.vscode/mcp.template.jsonc`                                                                                                                                          | Keep only optional local servers here. Do not duplicate workspace-owned defaults.                                                                       |
| Optional local Serena project config | `.serena/project.yml`                                                                                                                                                 | Repo-local helper config for contributors who install Serena locally. It is not a mandatory runtime dependency.                                         |
| Repository-wide cleanup umbrella     | `specs/015-repository-authority-and-structure-consolidation/`                                                                                                         | Use this feature pack to coordinate the remaining consolidation work across docs, workflow, reference assets, and structure.                            |
| Active product roadmap               | `specs/020-metrev-three-phase-product-plan/`                                                                                                                          | Current owner for public landing, scientific instrument workspace, internal intelligence grouping, and report-grounded conversation.                    |
| Active public-route execution slice  | `specs/021-public-infographic-pages/`                                                                                                                                 | Current public infographic-route execution pack under 020 for the code-built overview hub and topic pages.                                              |

## Reference-only or future-facing surfaces

- `stack.md` is a legacy architecture brief retained for background context only.
- `copilot_project_starter_detailed/` is reusable starter scaffolding. Its nested `.github/` and `.vscode/` assets are not active METREV workflow authority.
- `bioelectrochem_agent_kit/.github/` and `bioelectrochem_agent_kit/docs/mcp-integration-guidance.md` are antecedent domain-kit workflow references. In this repository, the active workflow surface is the root one.
- `bioelectrochem_agent_kit/ALL_FILES_CODE.md` is a generated export artifact and should not be edited as live source.
- `bioelectro-copilot-contracts/contracts/ontology/relations.yaml` and the contract report templates remain future-facing until a validated runtime consumer is added.
- `specs/013-metrev-ui-ux-parity/` remains an antecedent UI/workspace pack.
- `specs/014-local-first-professional-workspace/` remains local-first workspace background context.
- `specs/016-metrev-ui-refactor/` is superseded as active execution and should be used only as historical design-system context.
- `specs/017-full-big-data-workspace/` remains the completed big-data/cockpit baseline.
- `specs/018-evidence-intelligence-workspace/` remains the internal/advanced evidence instrument under the 020 product roadmap.
- `specs/019-research-intelligence-review-table-engine/` is the active research-integration execution pack under 020 for live literature search, staged warehouse import, review tables, queued/runtime extraction, and evidence-pack propagation into case intake and evaluation lineage.
- `specs/021-public-infographic-pages/` is the active public-route execution pack under 020 for the infographic overview hub and public topic pages.
- `specs/_examples/` remains example-only workflow material; use `specs/_templates/` and maintained numbered packs for live work.
- `docs/historical-cleanup-notes.md` is the consolidated historical note for earlier cleanup waves. It provides background context only.
- Historical duplicate copies previously kept under `archive/legacy-root-duplicates/` have been retired where equivalent module-local source copies still exist.

## Editing rules

1. If a change affects semantics, start in `bioelectrochem_agent_kit/domain/` and then align the hardened contracts, loaders, and tests.
2. If a change affects validation, serialization, persistence, or output shape, update `bioelectro-copilot-contracts/contracts/` and keep runtime adapters plus tests aligned.
3. If a change affects workflow, prompts, agents, skills, instructions, or tooling guidance, update the root-owned surfaces first rather than nested starter or domain-kit copies.
4. Do not define the same MCP server in more than one authority location at the same time.
5. Treat Serena as local-optional tooling unless a future repository decision explicitly promotes it to a committed default.

## Target physical normalization

1. Keep deployable runtime entrypoints and route-level integration in `apps/` only.
2. Keep reusable runtime libraries, adapters, and shared business logic in `packages/` only.
3. Keep cross-cutting verification, fixtures, and test support in `tests/` unless a tool requires colocated tests for a specific reason.
4. Keep shared workspace orchestration in the root config surfaces instead of duplicating build, lint, test, or MCP defaults inside package-local copies.
5. Keep reference-only, historical, and starter surfaces in their current locations with explicit labels until a later mechanical cleanup wave is planned after the active runtime worktree stabilizes.

## Consolidation status

- `specs/010-authority-runtime-hardening/` remains the detailed hardening sub-slice for authority metadata and runtime guards.
- `specs/012-workflow-doc-reconciliation/` remains the detailed sub-slice for root doc and tooling reconciliation.
- `specs/015-repository-authority-and-structure-consolidation/` is the umbrella pack for finishing the remaining repository-wide consolidation work without creating another competing cleanup narrative.
