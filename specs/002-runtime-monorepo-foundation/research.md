# Research Notes — Runtime Monorepo Foundation

## Goal

Capture the version-sensitive and architecture-sensitive findings that materially shaped the runtime monorepo foundation.

## Questions

- How should local auth work when Auth.js credentials and the API both need server-side trust in the same actor identity?
- Can Prisma runtime setup rely only on `prisma.config.ts`, or must the schema still carry a datasource URL?
- What local observability path keeps traces visibly inspectable during MVP work?
- Should the repository depend on external Spec Kit tooling for feature planning and bootstrap?

## Inputs consulted

- docs: Auth.js, Prisma, OpenTelemetry, and repository runtime docs
- repo files: `stack.md`, `package.json`, Prisma schema files, runtime packages, and root workflow assets
- experiments: local auth flow, Prisma generate behavior, and trace inspection through the local stack

## Findings

- Auth.js credentials in this runtime must use encrypted JWT session cookies, and both the Next.js web app and Fastify API must share `AUTH_SECRET` to validate actor identity server-side.
- Prisma runtime setup in this repository still requires `url = env("DATABASE_URL")` inside the Prisma schema even with `prisma.config.ts`.
- Local Jaeger plus OTLP HTTP gives a visible MVP trace path without requiring a hosted observability backend.
- The repository already has enough root prompts, instructions, and maintained docs to run an internal spec-first workflow without external Spec Kit tooling.

## Decisions

- Use server-validated local credentials auth with a shared `AUTH_SECRET` across web and API runtimes.
- Keep committed Prisma migrations and deterministic seeds as the runtime bootstrap path.
- Expose local Jaeger and OTLP endpoints in the local stack for sign-in, evaluation, persistence, and history traces.
- Treat external Spec Kit tooling as optional and non-blocking; the root workflow artifacts remain the supported path for this repository.

## Open blockers

- The broader Phase 3 relational decomposition for materials, components, benchmarks, metrics, ingestion, extraction, normalization, and review entities remains future work.
- Supplier persistence still needs a planning-only mapping note so the relational delta stays explicit before implementation.

## Impact on plan

- The runtime quickstart and tooling docs must document shared auth setup, Prisma bootstrap expectations, and the local trace path.
- The feature pack should carry planning-only notes for unresolved supplier relational mapping instead of hiding the delta in runtime code.
