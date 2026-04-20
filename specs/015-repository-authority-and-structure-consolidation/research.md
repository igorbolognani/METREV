# Research Notes — Repository Authority And Structure Consolidation

## Goal

Identify the repository surfaces most likely to create authority confusion, determine which archive files are truly redundant, and define a safe first implementation wave that reduces ambiguity without colliding with active runtime feature work.

## Questions

- Which files are the real root-owned authority surfaces for workflow, tooling, and repository governance?
- Which starter, nested, generated, or archived files still look active enough to confuse contributors or search-driven tooling?

## Inputs consulted

- docs: `README.md`, `AGENTS.md`, `stack.md`, `docs/internal-feature-workflow.md`, `docs/runtime-tooling-setup.md`, `adr/0003-runtime-authority-and-tooling-invariants.md`
- repo files: root `.github/`, root `.vscode/`, `.serena/project.yml`, `bioelectrochem_agent_kit/README.md`, `bioelectrochem_agent_kit/docs/mcp-integration-guidance.md`, `copilot_project_starter_detailed/README.md`, archive duplicates
- experiments: search and file-inventory passes over duplicated workflow, MCP, archive, and reference surfaces

## Findings

- The root governance model is internally coherent, but multiple visible copies of similar workflow assets still create search and onboarding noise.
- The top-level runtime structure is already coherent around `apps/`, `packages/`, `tests/`, and shared root config surfaces; the remaining structural gap is explicit ownership documentation, not broad folder movement.
- The most confusing overlaps are root workflow assets versus the starter copies, plus root tooling guidance versus older domain-kit MCP guidance.
- `archive/legacy-root-duplicates/` held only clearly redundant copies whose owning source files still exist under `bioelectrochem_agent_kit/`.
- `.serena/project.yml` is a real repo-local helper config, but it remains local-optional rather than a committed runtime dependency.
- The remaining retained-reference surfaces are intentional: starter scaffolding, antecedent kit workflow material, generated exports, example-only spec packs, antecedent UI packs, and historical cleanup notes.
- The root runtime story briefly drifted behind the code after the repository moved to Prisma 7, so the final follow-through wave has to align README, tooling docs, ADRs, and sub-slice notes with the current config-first datasource posture.
- The current runtime worktree already contains substantial feature changes, so the safest first wave is documentation, authority classification, reference demarcation, and archive retirement rather than physical package moves.

## Decisions

- Create one umbrella pack, 015, instead of starting another independent cleanup narrative.
- Publish a maintained authority map and link it from the root authority surfaces.
- Remove `github` from `.vscode/mcp.template.jsonc` so the optional template stops duplicating the workspace-owned default.
- Retire only the redundant duplicate archive files in this first implementation wave.
- Close structural follow-through in this slice with a documentation-first target ownership map rather than risky directory moves while the active runtime worktree is still moving.
- Keep historical notes, starter scaffolding, antecedent kit workflow assets, and example packs in place with explicit labels instead of creating a new archive or duplicate authority tree.

## Open blockers

- The active runtime worktree still makes broad physical moves riskier than the current documentation-first closure.
- Some future-facing contract/report/reference surfaces still need later policy decisions about whether they stay as references, move, or become runtime-backed.

## Impact on plan

- Phase 1 of the umbrella plan is implemented by the new authority map plus root doc convergence.
- T5 closes by documenting the target physical normalization across `apps/`, `packages/`, `tests/`, and root config surfaces without broad directory moves.
- T6 closes by recording the intentional retained-reference surfaces, aligning the Prisma runtime story with the current repository code, and running the final validation wave.
