# Feature Specification — Runtime Monorepo Foundation

## Objective

Create the first runnable METREV runtime monorepo aligned with the repository's domain-kit and contract-boundary model.

## MVP target

The current delivery target is an audited local MVP.

This MVP must:

- run fully locally without external identity, database, or observability providers
- enforce real authentication through Auth.js v5 with a local Credentials provider
- require PostgreSQL 15+ through Docker Compose for runtime persistence
- apply committed Prisma migrations at startup with `prisma migrate deploy`
- use deterministic seeds for local bootstrap and smoke validation
- emit visible local OpenTelemetry traces through an OTLP-compatible local endpoint
- preserve the existing deterministic normalization, rule-evaluation, and audit core rather than redesigning it

## Why

The repository has strong domain and contract assets but no executable runtime stack. `stack.md` now defines the runtime architecture, yet those decisions need maintained specs and code.

## Scope

### In

- root workflow assets for planning, debugging, critique, and learning
- runtime architecture docs and setup docs
- `pnpm + turbo` monorepo scaffold
- shared runtime packages for contracts, rules, audit, telemetry, and LLM integration
- Next.js web app scaffold
- Fastify API scaffold
- Prisma and PostgreSQL integration baseline
- Docker and GitHub Actions baseline
- MCP and tooling setup docs for GitHub, Context7, Serena, and the internal spec-first workflow
- audited local-only authentication, persistence, observability, and UI gates for the MVP

### Out

- external identity providers
- hosted databases or paid infrastructure
- hosted observability backends
- production-grade LLM orchestration
- final supplier integration
- final evidence ingestion pipelines

## Functional requirements

1. The runtime monorepo must not replace the existing domain or contract source-of-truth layers.
2. The API must validate runtime input and output against shared schemas.
3. The rule engine must preserve defaults, missing-data handling, and confidence framing.
4. The UI must render structured decision outputs without embedding business rules.
5. The repository must actively teach agents and developers how to plan, verify, critique, refine, and learn from errors.
6. Protected runtime routes must derive actor identity and role from validated server-side session state, never from client-controlled headers.
7. Runtime persistence must fail fast if PostgreSQL is unavailable; silent fallback to in-memory storage is not acceptable outside explicit unit-test paths.
8. Persisted records must keep lifecycle state, provenance, confidence, defaults, missing-data handling, and transformation lineage explicit.

## Runtime requirements

- Monorepo: `pnpm` workspaces and `turbo`
- Web runtime: Next.js with React and TypeScript
- API runtime: Fastify with TypeScript
- Auth runtime: Auth.js v5 with a local Credentials provider and explicit RBAC
- Persistence: Prisma ORM with PostgreSQL 15+ via Docker Compose
- Startup policy: committed migrations applied with `prisma migrate deploy`; `db push` is not allowed in runtime startup
- Bootstrap policy: deterministic seeds for local users and smoke-test fixtures
- Observability: OpenTelemetry Node SDK with a visible local OTLP export path
- Validation: Vitest for unit and integration coverage, plus a separate PostgreSQL-backed persistence suite

## [MVP-GATE] Acceptance criteria

- [MVP-GATE] Auth gate
  - Protected requests without a validated session return `401`.
  - A `viewer` cannot execute case evaluation and receives `403`.
  - Audit records contain verified `actor_id` and session-derived role information without trusting client-supplied headers.
- [MVP-GATE] Database gate
  - Docker Compose starts PostgreSQL cleanly with health checks.
  - Prisma migrations apply from zero through committed migration files.
  - Deterministic seeds load idempotently for local users and smoke fixtures.
  - Runtime startup exits with a clear error if PostgreSQL is unavailable.
- [MVP-GATE] Persistence gate
  - A `create -> process -> retrieve -> history` flow passes through Prisma repositories against a real PostgreSQL instance.
- [MVP-GATE] Governance gate
  - Persisted records retain explicit lifecycle state, provenance, evidence scoring, defaults used, missing-data handling, and transformation lineage.
- [MVP-GATE] Observability gate
  - Local traces are visible for sign-in, evaluation, persistence, and history flows through the configured OTLP path.
- [MVP-GATE] UI gate
  - One authenticated analyst flow completes end-to-end without embedding business logic in the frontend.
- [MVP-GATE] Regression gate
  - Normalization, contract-drift, and deterministic rule tests remain green after each phase.
