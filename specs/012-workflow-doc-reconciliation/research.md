# Research Notes — Workflow And Documentation Reconciliation

## Goal

Remove contradictory repository signals about the live runtime, local tooling defaults, and future-facing reference assets.

## Questions

- Which root docs still implied an outdated or broader runtime than the shipped monorepo?
- Which tooling integrations should stay optional instead of being activated by default?

## Inputs consulted

- docs: `README.md`, `stack.md`, `docs/runtime-tooling-setup.md`, `docs/internal-feature-workflow.md`
- repo files: `.vscode/mcp.json`, `.vscode/mcp.template.jsonc`, contract report templates, ADRs, specs
- experiments: current local-view scripts and command-level validation status

## Findings

- `README.md` is already closer to the real runtime than `stack.md`, which had grown into a much broader design brief.
- `.vscode/mcp.json` is GitHub-only by default in this workspace; Context7 and Serena remain supported but optional through the template file and machine-local setup.

## Decisions

- Demote `stack.md` to a non-authoritative reference brief and point readers to README, ADRs, and maintained specs for the live runtime story.
- Keep optional MCP integrations documented as optional until the workspace can guarantee local prerequisites and secrets.

## Open blockers

- The repository cannot guarantee machine-local prerequisites such as a Serena install or a Context7 API key.
- Future-facing report and relation assets still need explicit labeling to avoid false product signals.

## Impact on plan

- Root docs must privilege the shipped runtime over older architecture prose.
- Reference-only assets need labeling rather than silent coexistence.
