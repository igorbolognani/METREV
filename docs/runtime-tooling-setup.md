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

For the broader active-versus-reference classification across the repository, use `docs/repository-authority-map.md`.

## Local-machine setup

### MCP authority model

- Keep one authority per MCP server across `Workspace`, `User`, and `Extensions` to avoid duplicate entries and ambiguous behavior in the VS Code MCP UI.
- `Workspace` owns repository-shared MCP servers. In this repository, `github` belongs in the root `.vscode/mcp.json`.
- `User` owns personal MCP servers that are not already defined by the workspace.
- `Extensions` may provide local MCP servers directly in the editor. If an extension already exposes a server such as Context7, keep that extension-provided server as the only authority for that server name.
- Do not define the same MCP server in more than one place at the same time. For example, do not keep `github` in both `.vscode/mcp.json` and `~/.config/Code/User/mcp.json`.

### GitHub MCP

- Supported as the default root MCP integration.
- Activated in `.vscode/mcp.json` as the only live-by-default server.
- It should not be duplicated inside `.vscode/mcp.template.jsonc`, user-level MCP config, or extension-provided config for this workspace at the same time.
- If the VS Code user profile also defines `github`, remove the user-level duplicate and keep the workspace entry as the single source of truth for this repository.

### Prisma runtime and migration posture

- The current repository is pinned to a Prisma 7 posture that keeps datasource URL configuration in `packages/database/prisma.config.ts` instead of embedding `url = env("DATABASE_URL")` inside `packages/database/prisma/schema.prisma`.
- `packages/database/prisma/schema.prisma` keeps a provider-only `datasource db` block and a repository-owned `generator client` configuration that emits the TypeScript client into `packages/database/generated/prisma/`.
- `packages/database/src/prisma-client.ts` remains the repository-owned runtime entrypoint for the generated Prisma client plus the `PrismaPg` adapter-backed connection path.
- `packages/database/scripts/run-prisma-with-direct-url.mjs` remains the required wrapper for migration commands so hosted PostgreSQL deployments can prefer `DIRECT_URL` safely while runtime code continues to use `DATABASE_URL` semantics.
- If stale docs or editor diagnostics imply the older URL-in-schema posture or suggest bypassing the wrapper/config split, prefer the command-backed repository posture validated by `pnpm prisma:generate`, `pnpm run db:migrate:deploy`, `pnpm run validate:fast`, and `pnpm run validate:full` when local Docker-backed acceptance is in scope.

### Context7

- Supported via the root `.vscode/mcp.template.jsonc` using the official local launcher `npx -y @upstash/context7-mcp@latest`.
- The template maps `context7-api-key` to `CONTEXT7_API_KEY` because Upstash documents API-key-backed local MCP usage.
- Recommended local setup is `npx ctx7 setup --mcp` before copying the template entry into a live user or workspace MCP config.
- If VS Code already exposes Context7 through an installed extension provider, keep that extension-provided server as the only Context7 authority instead of duplicating the same server through `User` or `Workspace` MCP config.

### Serena

- Supported via the root `.vscode/mcp.template.jsonc` using the official VS Code-oriented launcher `serena start-mcp-server --context=vscode --project ${workspaceFolder}`.
- Recommended local install is `uv tool install -p 3.13 serena-agent@latest --prerelease=allow`, followed by `serena init` in the repository root.
- If `serena` is not on `PATH`, that is a machine-local prerequisite blocker rather than a repository configuration problem.
- A repo-local `.serena/project.yml` may exist for contributors who use Serena, but that file alone does not make Serena a committed runtime dependency for the repository.

### Internal Spec-First Workflow

- This repository does not require Spec Kit, a Spec Kit MCP server, or a Spec Kit VS Code extension.
- The supported workflow is the root internal surface: `AGENTS.md`, `.github/copilot-instructions.md`, `docs/internal-feature-workflow.md`, `specs/_templates/`, the root agents, the root prompts, and the root `spec-workflow` skill.
- Use `.github/prompts/clarify-feature.prompt.md` to close blocking questions, `.github/prompts/start-feature.prompt.md` to bootstrap a durable feature pack, `.github/prompts/plan-feature.prompt.md` for staged planning, and `.github/prompts/ship-change.prompt.md` as the autonomous one-shot entrypoint.
- The autonomous one-shot path is backed by the root `workflow-orchestrator` agent and should preserve the current runtime invariants around Supabase, Prisma, Auth.js, telemetry, and quickstart flows unless a task explicitly changes them.
- If `specify` or `specify init` is not installed locally, that is expected in this repository. The root internal workflow replaces external Spec Kit tooling here.

## Coordinated MCP use

- Use GitHub MCP for repository-native context and actions such as repositories, issues, pull requests, and other GitHub workflow surfaces.
- Use Context7 when the task depends on current external library or framework documentation, setup, configuration, or version-specific APIs.
- Use both together when a task needs repository context plus current external docs. For example, inspect the local implementation with GitHub MCP or workspace tools first, then fetch the current library behavior with Context7 before changing code.
- In this repository, GitHub MCP is the root default. Context7 remains a local, optional complement rather than a second default server in the committed workspace config.

## Validation rule

- A tool is not considered integrated until its repo config, setup steps, and success criteria are all documented.
- `pnpm run validate:fast` is the promoted fast repository matrix and the current CI contract.
- `pnpm run validate:local` is the promoted local Docker-backed acceptance matrix for PostgreSQL-backed persistence plus Playwright E2E; it will start `local:view` if needed and resolve the active published Postgres port before running.
- `pnpm run validate:full` combines the promoted fast and local matrices.

## VS Code verification

1. Run `MCP: List Servers` from the VS Code command palette.
2. Confirm that `github` appears once and is sourced from the workspace for this repository.
3. Confirm that `context7` appears once from its chosen local authority, such as an extension provider or a user-level MCP entry.
4. Open Copilot Chat, switch to `Agent`, and inspect `Configure tools`.
5. Validate one GitHub-only task, one Context7-only task, and one hybrid task before treating the setup as complete.
