# METREV Repository Baseline

This repository packages three distinct layers that should not be treated as competing sources of truth.

## Current authority index

Use `docs/repository-authority-map.md` as the maintained index for deciding which surfaces are active, which remain reference-only, and which stay local-optional.

The umbrella cleanup work now lives in `specs/015-repository-authority-and-structure-consolidation/`.

## Canonical intent

The canonical product domain for bioelectrochemical decision support lives in:

- `bioelectrochem_agent_kit/domain/`

This is the operational source of truth for:

- domain vocabulary
- stack decomposition
- evidence semantics
- defaults and uncertainty behavior
- compatibility logic
- scoring logic

## Repository layers

### 1. `bioelectrochem_agent_kit/`

Product-specific domain kit for the bioelectrochemical decision platform.

### 2. `bioelectro-copilot-contracts/contracts/`

Canonicalized contract layer aligned to the domain kit vocabulary. This directory should mirror the domain semantics and remain safe for future validation, serialization, API, and database work.

### 3. `copilot_project_starter_detailed/`

Generic AI-assisted development starter. This is reusable methodology scaffolding, not the product domain itself.

## Runtime monorepo

The runnable implementation now lives in the workspace monorepo layers:

- `apps/web-ui/` for the Next.js analyst-facing interface
- `apps/api-server/` for the Fastify evaluation API
- `packages/` for shared runtime contracts, rule evaluation, audit, auth, telemetry, database, and utility code

The runtime must continue adapting the domain and contract layers instead of introducing a parallel vocabulary.

## Runtime authority

The current runtime uses one explicit authority split:

- semantic meaning starts in `bioelectrochem_agent_kit/domain/`
- validation and serialization boundaries start in `bioelectro-copilot-contracts/contracts/`
- executed deterministic rules are currently loaded contract-first through `packages/domain-contracts/src/loaders.ts`
- the domain case template remains runtime-loaded from `bioelectrochem_agent_kit/domain/cases/templates/client-case-template.yml`

This means the live runtime does not treat every domain or contract asset as equally executed. In particular, `stack.md`, `bioelectrochem_agent_kit/domain/ontology/component-graph.yml`, `bioelectro-copilot-contracts/contracts/ontology/relations.yaml`, and the contract report templates are reference-only or future-facing until a validated runtime consumer exists.

For the maintained active-versus-reference classification, prefer `docs/repository-authority-map.md` over ad-hoc inference from file location alone.

## Internal feature workflow

For medium and large changes, use a maintained feature folder under `specs/NNN-feature-slug/`.
The default durable feature pack is:

- `spec.md`
- `plan.md`
- `tasks.md`
- `quickstart.md`

Add `research.md` only when technical uncertainty or external integration risk affects the plan.
Add notes under `specs/<feature>/contracts/` only when API, persistence, serialization, or adapter mappings need explicit review.
Those notes are planning-only artifacts and do not replace the canonical contract boundary in `bioelectro-copilot-contracts/contracts/`.

Use the maintained root workflow surface:

- `docs/internal-feature-workflow.md`
- `specs/_templates/`
- `.github/prompts/clarify-feature.prompt.md`
- `.github/prompts/start-feature.prompt.md`
- `.github/prompts/plan-feature.prompt.md`
- `.github/prompts/ship-change.prompt.md`

The default autonomous one-shot path is `.github/prompts/ship-change.prompt.md`, which now uses the root `workflow-orchestrator` agent.
The staged/manual path remains available through the clarify, start-feature, and plan prompts when tighter human control is preferable.

## Core commands

- copy `.env.example` to `.env` before running the local runtime
- `pnpm install`
- `pnpm prisma:generate`
- `pnpm run db:migrate:deploy`
- `pnpm run db:seed`
- `pnpm run test:db`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`
- `pnpm run dev:api`
- `pnpm run dev:web`
- `pnpm run dev`
- `docker compose up --build`

## Supabase-hosted Postgres

The current runtime keeps Prisma and Auth.js as the active persistence and session boundary.
Supabase is supported here as hosted PostgreSQL, not as a replacement for Auth.js.

Use this setup when you want the monorepo to run against Supabase Postgres:

- set `DATABASE_URL` to the pooled Supabase connection on port `6543`
- set `DIRECT_URL` to the direct Supabase connection on port `5432`
- keep `METREV_STORAGE_MODE=postgres`
- keep a shared `AUTH_SECRET` for both the API and the web app
- keep `AUTH_URL` aligned with the browser-facing web origin

`DATABASE_URL` is used by the runtime, while `DIRECT_URL` is used by Prisma migrations.
The committed `db:migrate:*` scripts automatically prefer `DIRECT_URL` when it is defined, so Supabase migrations do not hang on the pooled runtime URL.
The checked-in `.env.example` keeps local Postgres defaults so fresh clones still boot without Supabase.
The current repository keeps a Prisma 7 posture by centralizing datasource URL configuration in `packages/database/prisma.config.ts`, leaving `packages/database/prisma/schema.prisma` with a provider-only datasource block plus the repository-owned `prisma-client` generator configuration, generating the TypeScript client under `packages/database/generated/prisma/`, and routing migration commands through `packages/database/scripts/run-prisma-with-direct-url.mjs` so runtime and migration access remain explicit.

If you want browser-only env values available to Next.js, create `apps/web-ui/.env.local` with:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `AUTH_URL`
- `AUTH_SECRET`

## Fast Local Open

On this Linux setup, the quickest path is to use the root workspace scripts that already pin the alternate ports validated for local viewing.

- `cd /path/to/METREV`
- `pnpm install`
- `pnpm run local:view:start`

That flow starts PostgreSQL, API, Jaeger, and the web app on the stable local-view ports below, then opens the login page in Google Chrome.

- web: `http://localhost:3012/login`
- api: `http://localhost:4012/health`
- postgres host port: `5436`
- jaeger: `http://localhost:16689`

Useful follow-up commands:

- `pnpm run local:view:status`
- `pnpm run local:view:open`
- `pnpm run local:view:down`

Local runtime uses committed Prisma migrations plus deterministic local auth seeds.
Auth.js credentials issue encrypted session cookies that are validated server-side by both the Next.js web runtime and the Fastify API through the shared `AUTH_SECRET`.
If you expose the web app on a non-default host or port, set `AUTH_URL` to that public origin so Auth.js redirects stay aligned with the browser entrypoint.
Runtime startup requires PostgreSQL; in-memory storage remains available only through explicit unit-test injection paths.
Containerized local runtime also exposes Jaeger at `http://localhost:16686` for OpenTelemetry trace inspection.

For Supabase-hosted development, prefer the `pnpm` workflow over `docker compose up --build`.
The compose stack still starts a local PostgreSQL service for the fully local path, even when you override the database URLs.

The API keeps the custom OpenTelemetry bootstrap.
The web app currently leaves custom exporter bootstrap disabled in `src/instrumentation.ts` so `next dev` stays healthy with the current dependency set.
That means the Next.js app still runs and builds normally, but the custom web exporter path is deferred until a dedicated Next-native telemetry package is added.

## Recommended local sequence

1. Copy `.env.example` to `.env` and replace `DATABASE_URL` plus `DIRECT_URL` with your Supabase values.
2. Create `apps/web-ui/.env.local` if you need browser-exposed `NEXT_PUBLIC_*` values.
3. Run `pnpm install`.
4. Run `pnpm prisma:generate`.
5. Run `pnpm run db:migrate:deploy`.
6. Run `pnpm run db:seed`.
7. Start the API with `pnpm run dev:api`.
8. Start the web app with `pnpm run dev:web`.
9. Open `http://localhost:3000/login`.

## First GitHub publish

This workspace can be published safely after local validation.

1. Initialize Git locally with `git init`.
2. Rename the branch to `main` with `git branch -M main`.
3. Add the remote with `git remote add origin https://github.com/igorbolognani/METREV.git`.
4. Fetch the remote with `git fetch origin main`.
5. Merge the remote README-only history with `git merge origin/main --allow-unrelated-histories`.
6. Run `pnpm run lint`, `pnpm run test`, `pnpm run build`, and `docker compose config`.
7. Stage the tree with `git add -A` and verify that `.env` and `apps/web-ui/.env.local` are not staged.
8. Commit and push with `git commit -m "Initial import"` and `git push -u origin main`.

## Current MVP status

- Completed and validated: server-side session auth with Auth.js credentials, browser-enforced sign-in and sign-out flow, route guards on the dashboard, evaluation, and new-case pages, deterministic normalization plus contract-first rule execution, optional simulation enrichment persisted alongside evaluations, explicit external-evidence review gates, an analyst workbench with summary, evidence, modeling, audit, and comparison modes, PostgreSQL-backed persistence tests, and local Jaeger trace visibility for sign-in, evaluation, persistence, and history flows.
- Still intentionally staged for later platform hardening: production-grade external auth providers, deployment automation beyond the local and repository CI path, and deeper relational expansion of all materials, benchmark, extraction, and normalization entities that still live partly in structured JSON columns.

## Analyst Flow

1. Open `/login` and authenticate with a seeded analyst account.
2. After sign-in, Auth.js redirects back to the requested page through the normalized `callbackUrl`, and protected routes reject anonymous access before rendering.
3. Use `/cases/new` to submit a decision run; analyst role checks happen before the form is shown.
4. Review the generated evaluation workbench and case history while the shared session cookie authorizes both the Next.js UI and the Fastify API.
5. Use the evidence review surface to accept or reject imported catalog records before they can re-enter intake.
6. Use the header sign-out action to clear the session and return the browser to `/login`.

## Historical duplicates

The previous duplicate archive wave has been retired where equivalent owning source files still exist elsewhere in the repository.

Keep using the remaining module-local reference assets as historical context only, not as active source files.

## Practical rule

If an agent, prompt, or future implementation needs domain truth, prefer `bioelectrochem_agent_kit/domain/` first and ensure `bioelectro-copilot-contracts/contracts/` stays synchronized to it.
