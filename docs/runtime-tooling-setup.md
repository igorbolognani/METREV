# Runtime Tooling Setup

## Scope

This document separates repository-managed integration from local-machine setup for AI-assisted development and runtime delivery.

## Repository-managed assets

- root `AGENTS.md`
- root `.github/copilot-instructions.md`
- root `.github/instructions/`
- root `.github/prompts/`
- root `.github/agents/`
- root `.github/skills/`
- root `.vscode/extensions.json`
- root `.vscode/mcp.json` and `.vscode/mcp.template.jsonc`

## Local-machine setup

### GitHub MCP

- Supported as the default root MCP integration.
- Activated in `.vscode/mcp.json` as the only live-by-default server.

### Context7

- Supported via the root `.vscode/mcp.template.jsonc` using the official local launcher `npx -y @upstash/context7-mcp@latest`.
- The template maps `context7-api-key` to `CONTEXT7_API_KEY` because Upstash documents API-key-backed local MCP usage.
- Recommended local setup is `npx ctx7 setup --mcp` before copying the template entry into a live user or workspace MCP config.

### Serena

- Supported via the root `.vscode/mcp.template.jsonc` using the official VS Code-oriented launcher `serena start-mcp-server --context=vscode --project ${workspaceFolder}`.
- Recommended local install is `uv tool install -p 3.13 serena-agent@latest --prerelease=allow`, followed by `serena init` in the repository root.
- If `serena` is not on `PATH`, that is a machine-local prerequisite blocker rather than a repository configuration problem.

### Internal Spec-First Workflow

- This repository does not require Spec Kit, a Spec Kit MCP server, or a Spec Kit VS Code extension.
- The supported workflow is the root internal surface: `AGENTS.md`, `.github/copilot-instructions.md`, `docs/internal-feature-workflow.md`, `specs/_templates/`, the root agents, the root prompts, and the root `spec-workflow` skill.
- Use `.github/prompts/clarify-feature.prompt.md` to close blocking questions, `.github/prompts/start-feature.prompt.md` to bootstrap a durable feature pack, `.github/prompts/plan-feature.prompt.md` for planning, and `.github/prompts/ship-change.prompt.md` for end-to-end delivery from understanding through validation.
- If `specify` or `specify init` is not installed locally, that is expected in this repository. The root internal workflow replaces external Spec Kit tooling here.

## Validation rule

- A tool is not considered integrated until its repo config, setup steps, and success criteria are all documented.
