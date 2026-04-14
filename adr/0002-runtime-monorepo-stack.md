# ADR 0002: Runtime Monorepo Stack

## Status

Accepted

## Context

`stack.md` defines a runtime architecture for the next phase of METREV: a TypeScript monorepo with a Next.js web application, a Fastify API, shared runtime packages, PostgreSQL via Prisma, Zod validation, TanStack Query, Auth.js RBAC, OpenTelemetry, Docker, and GitHub Actions. The repository already contains two authoritative non-runtime layers: `bioelectrochem_agent_kit/domain/` for semantic truth and `bioelectro-copilot-contracts/contracts/` for the hardened contract boundary.

On 2026-04-12, the runtime target was narrowed to an audited local MVP. During that decision, the existing Fastify API was explicitly reaffirmed to avoid an unapproved framework migration while the repository hardens authentication, PostgreSQL persistence, auditability, and observability.

## Decision

Implement the runtime as a `pnpm + turbo` monorepo under `apps/` and `packages/`.

The runtime layer must:

- adapt existing domain and contract files rather than replacing them
- keep deterministic validation, rules, scoring, and uncertainty framing ahead of any LLM narrative
- expose typed REST APIs through Fastify
- provide a Next.js UI that consumes those APIs without embedding business rules
- persist decision runs, audit records, and supporting metadata in PostgreSQL via Prisma
- emit observability signals through OpenTelemetry

## [MVP-GATE] Audited local MVP commitments

The audited local MVP is ratified with the following constraints:

- authentication uses Auth.js v5 with a local Credentials provider; external identity providers are out of scope
- Auth.js credentials use encrypted JWT session cookies, and both Next.js and Fastify validate them server-side with the shared `AUTH_SECRET`
- protected routes derive actor identity and role from validated server-side session state, never from client-controlled headers
- PostgreSQL 15+ runs locally through Docker Compose and is required for runtime persistence
- committed Prisma migrations are applied with `prisma migrate deploy`; runtime `db push` is prohibited
- deterministic seeds provide repeatable local bootstrap data for users and smoke validation
- OpenTelemetry emits visible local traces through an OTLP-compatible local export path
- the existing deterministic normalization, rule-engine, `agent-pipeline.ts`, and audit core are preserved and integrated rather than redesigned

## [MVP-GATE] Acceptance gates

- Auth gate: unauthenticated protected requests return `401`, insufficient role returns `403`, and audit records persist verified actor identity.
- Database gate: PostgreSQL boots cleanly in Docker Compose, migrations apply from zero, deterministic seeds are idempotent, and runtime exits clearly when the database is unavailable.
- Persistence gate: a real PostgreSQL-backed `create -> process -> retrieve -> history` flow passes through Prisma repositories.
- Governance gate: lifecycle state, provenance, evidence scoring, defaults, missing data, and transformation lineage remain explicit in persisted records.
- Observability gate: local traces are visible for sign-in, evaluation, persistence, and history flows.
- UI gate: one authenticated analyst flow works end-to-end without moving business logic into the frontend.
- Regression gate: normalization, contract-drift, and deterministic rule suites remain green after each phase.

## Consequences

### Positive

- Shared packages can enforce consistent runtime validation and decision logic.
- The monorepo model matches the stack brief and improves developer ergonomics.
- Root workflow files, specs, ADRs, prompts, and tests can govern both apps and shared packages coherently.
- The audited local MVP keeps control, provenance, and validation local while still exercising the real runtime architecture.

### Negative

- Domain-contract drift becomes more expensive once runtime adapters depend on both layers.
- The repository gains more tooling and setup surface area.
- Startup becomes stricter because protected routes, database availability, and observability setup can fail closed instead of silently degrading.

## Guardrails

- Do not create a third vocabulary in runtime packages.
- Reconcile or explicitly map domain-contract mismatches before exposing runtime APIs.
- Keep LLM usage optional and downstream of structured outputs.
- Do not trust client-controlled headers for authentication or role derivation.
- Do not allow silent runtime fallback to in-memory persistence when PostgreSQL is required.
- Do not use runtime `db push`; commit migrations and apply them with deployment-safe commands.
