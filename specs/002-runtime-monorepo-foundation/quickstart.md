# Quickstart — Runtime Monorepo Foundation

## Goals

- bootstrap the root workflow assets
- install workspace dependencies with `pnpm`
- run the API and web app locally
- run validation and test commands

## Expected commands

1. copy `.env.example` to `.env`
2. create `apps/web-ui/.env.local` when Next.js needs browser-exposed env values
3. `pnpm install`
4. `pnpm prisma:generate`
5. `pnpm run db:migrate:deploy`
6. `pnpm run db:seed`
7. `pnpm run test:db`
8. `pnpm run lint`
9. `pnpm run test`
10. `pnpm run build`
11. `pnpm run dev:api`
12. `pnpm run dev:web`
13. `pnpm run dev`
14. `docker compose up --build`

## Fast local open

For this Linux workstation, the fastest repeatable flow is:

1. `cd /path/to/METREV`
2. `pnpm install`
3. `pnpm run local:view:start`

That command family uses the validated alternate ports from the earlier local smoke run, avoiding host conflicts on the default PostgreSQL port.

- `pnpm run local:view:up`
- `pnpm run local:view:open`
- `pnpm run local:view:status`
- `pnpm run local:view:down`

## Prerequisites

- Node.js 24+
- pnpm 10+
- Python 3.12+ for existing contract checks
- Docker for PostgreSQL and containerized local services

## Tooling notes

- GitHub MCP should be configured at the root workspace layer.
- The committed `.vscode/mcp.json` activates only GitHub MCP by default.
- The committed `.vscode/mcp.template.jsonc` contains verified launcher examples for Context7 and Serena only.
- Context7 and Serena require local machine setup beyond repo files.
- The Context7 template entry uses a dedicated `context7-api-key` prompt input for local MCP setups that require an API key.
- Keep one authority per MCP server across `Workspace`, `User`, and `Extensions`.
- For this repository, keep `github` only in the workspace-owned `.vscode/mcp.json` and do not duplicate it in the VS Code user profile.
- If Context7 is already being provided by a VS Code extension, do not also copy the `context7` template entry into user or workspace MCP config.
- Use GitHub MCP for repository-native workflow context and Context7 for current external library or framework docs.
- The root internal spec-first workflow is self-contained; no Spec Kit MCP server or extension is required for planning or delivery.
- Use `docs/internal-feature-workflow.md` and `specs/_templates/` when you need to start or extend a maintained feature pack.
- Use `.github/prompts/clarify-feature.prompt.md` before planning when the request is still underspecified and `.github/prompts/start-feature.prompt.md` when you need a root-owned feature scaffold.
- Use `.github/prompts/ship-change.prompt.md` when you want one root prompt to drive understanding, planning, implementation, validation, review, and final verification in one pass.
- Do not rely on the original executive PDF or DOCX once `stack.md`, ADRs, and specs are in place.

## VS Code MCP verification

1. Open the command palette and run `MCP: List Servers`.
2. Confirm that `github` appears once and is tied to the workspace configuration.
3. Confirm that `context7` appears once from its chosen local authority, such as an extension provider or a user-level MCP entry.
4. Open Copilot Chat, switch to `Agent`, and inspect `Configure tools`.
5. Run one GitHub-only task such as listing repository or pull request context.
6. Run one Context7-only task that asks for current framework or library documentation.
7. Run one hybrid task that needs both local repository context and current external documentation.

## Environment notes

- Use `.env.example` as the baseline variable set for local runtime work.
- For Supabase-hosted PostgreSQL, use `DATABASE_URL` for pooled runtime traffic and `DIRECT_URL` for Prisma migrations.
- The committed `db:migrate:*` scripts automatically prefer `DIRECT_URL` when it is defined.
- Keep `.env.example` local-safe and put live Supabase values in the ignored `.env` file.
- Create `apps/web-ui/.env.local` when the Next.js app needs `NEXT_PUBLIC_API_BASE_URL` or `AUTH_URL` overrides at build and dev time.
- If you change `POSTGRES_PORT`, update `DATABASE_URL` to match the host port.
- If you change `WEB_PORT` or expose the web app through another origin, update `AUTH_URL` to that same browser-facing origin.
- `METREV_STORAGE_MODE=postgres` is the only supported runtime mode outside explicit unit-test paths.
- `pnpm run db:seed` creates idempotent local users for `ADMIN`, `ANALYST`, and `VIEWER` roles using the `METREV_LOCAL_*` variables.
- `pnpm run test:db` is the separate PostgreSQL-backed persistence suite and expects a reachable database plus completed `db:bootstrap`.
- The web and API runtimes require the same `AUTH_SECRET` because Auth.js credentials issue encrypted session cookies that both services validate server-side.
- `docker compose up --build` now also exposes Jaeger on `http://localhost:16686`, and the local OTLP HTTP endpoint defaults to `http://localhost:4318`.

## Recommended Supabase sequence

1. Copy `.env.example` to `.env` and replace `DATABASE_URL` plus `DIRECT_URL` with the Supabase connection strings.
2. Create `apps/web-ui/.env.local` for browser-exposed `NEXT_PUBLIC_*` values.
3. Run `pnpm install`.
4. Run `pnpm prisma:generate`.
5. Run `pnpm run db:migrate:deploy`.
6. Run `pnpm run db:seed`.
7. Run `pnpm run dev:api`.
8. Run `pnpm run dev:web`.

For the Supabase-hosted path, prefer the direct `pnpm` workflow instead of `docker compose up --build`.

## Telemetry note

- The API runtime still initializes the shared custom OpenTelemetry bootstrap.
- The web runtime keeps `src/instrumentation.ts` as a no-op for now so `next dev` does not try to bundle the Node-only telemetry stack.

## Current status

- Completed gates: server-side auth and RBAC on protected API routes, analyst-facing login and logout flow, browser route guards on protected pages, PostgreSQL fail-fast startup, committed migrations plus deterministic seeds, PostgreSQL-backed persistence coverage, and local OpenTelemetry traces through Jaeger.
- Current data-layer boundary: lifecycle, provenance, defaults, missing data, confidence, audit payloads, and supplier relations are persisted explicitly enough for the audited local MVP, but the broader Phase 3 expansion into fully relational materials/components/benchmark ingestion entities remains future work.

## Analyst browser flow

1. Start the stack with a shared `AUTH_SECRET` and an `AUTH_URL` that matches the web origin.
2. Open `/login` and sign in with one of the seeded credentials from the bootstrap data.
3. Requesting `/`, `/cases/new`, or `/evaluations/:id` without a session redirects to `/login` with the original path encoded as `callbackUrl`.
4. After authentication, analysts can open `/cases/new`, submit a run, and review the persisted evaluation and case history with the same session cookie.
5. The header sign-out action invalidates the session and protected routes redirect back to `/login` again.
