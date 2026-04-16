# METREV Project AI Operating Constitution

This file is the detailed workflow companion to `AGENTS.md`.
If a rule here conflicts with `AGENTS.md` on source of truth, domain semantics, or contract layering, follow `AGENTS.md`.

## Project identity

- Project name: METREV
- Product type: Auditable bioelectrochemical decision-support platform
- Primary users: internal analysts, engineering reviewers, and future client-facing reporting flows
- Current stage: structured foundation moving into runtime monorepo implementation

## Approved runtime stack

- Frontend: Next.js with React and TypeScript
- Backend: Fastify with TypeScript
- Database: PostgreSQL via Prisma ORM
- Validation: Zod for runtime validation and type inference
- Client data fetching: TanStack Query
- Authentication: Auth.js with explicit RBAC handling
- Observability: OpenTelemetry
- Package manager: pnpm workspaces with turbo task orchestration
- Containerization: Docker
- CI/CD: GitHub Actions
- LLM integration: adapter layer for Ollama or OpenAI after deterministic outputs are trustworthy

## Repository truth model

- `bioelectrochem_agent_kit/domain/` remains the semantic source of truth.
- `bioelectro-copilot-contracts/contracts/` remains the hardened contract boundary.
- Runtime code in `apps/` and `packages/` must adapt those layers rather than replacing them with a third vocabulary.
- Any domain-contract mismatch must be reconciled, documented as a temporary adapter, or covered by explicit tests.

## Runtime architecture rules

- Build the runtime as a monorepo rooted at `apps/` and `packages/`.
- Keep business rules in shared packages, not in the UI or route handlers.
- Make normalization explicit before inference.
- Run deterministic validation, compatibility, scoring, and uncertainty framing before any narrative generation.
- Keep persistence, audit, and observability as first-class concerns for every decision run.

## Working method

- For non-trivial work, produce visible artifacts in this order: goal, assumptions, decomposition, inspection plan, implementation steps, validation checklist, critique pass, refine pass, final verification.
- Use spec-first workflow for medium and large changes: spec, plan, tasks, implementation, verification, then durable learning capture.
- For medium and large changes, maintain a durable feature pack under `specs/<NNN-feature>/`: `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`.
- Add `research.md` when technical uncertainty, version-sensitive behavior, external integration, or architecture tradeoffs materially influence the plan.
- Add planning-only notes under `specs/<feature>/contracts/` when request or response shape, serialization, persistence, or adapter mappings need explicit design review. These notes must cite canonical owner files and must not become a second source of truth.
- Prefer one focused critique pass and one focused refine pass over open-ended recursive self-analysis.
- If a repeated mistake appears, update tests, ADRs, specs, evals, or instructions instead of relying on chat memory.

## Implementation rules

- Prefer localized edits over broad rewrites.
- Reuse existing domain, contract, and report artifacts before inventing new runtime shapes.
- Avoid introducing dependencies unless they clearly support the approved stack or validation strategy.
- Keep modules small enough that responsibilities stay obvious.
- Do not bypass the contract layer in API responses.
- Do not hide defaults, missing data, evidence typing, or confidence changes.

## Validation order

For domain and runtime decision behavior, prefer this order:

1. deterministic validation
2. plausible-range checks
3. compatibility logic
4. benchmark or evidence comparison when available
5. scoring and prioritization
6. sensitivity and uncertainty framing
7. narrative synthesis

## Testing policy

- Behavior changes should come with tests or an explicit reason they do not.
- Cover happy path, failure path, and at least one edge case.
- Add regression tests for defects, drift corrections, and contract mismatches.
- Prefer shared fixtures over one-off mocks when scenarios are reused.
- Keep the existing contract drift checks green while adding the TypeScript and Vitest runtime suite.
- When runtime behavior depends on external services such as PostgreSQL, use reproducible container or service-based setup in local and CI flows.

## Documentation policy

- Record runtime architecture and irreversible stack decisions in `adr/`.
- Record feature intent, acceptance criteria, and delivery plans in `specs/`.
- Use `docs/internal-feature-workflow.md` and `specs/_templates/` as the maintained root workflow surface for feature bootstrap and durable artifact creation.
- Record repeatable evaluation rules in `evals/` or existing domain checklists.
- Update quickstart and tooling docs when setup requirements change.

## Tooling policy

- Use the root prompt, agent, and skill files before relying on nested reference assets.
- Use `.github/prompts/clarify-feature.prompt.md` to close blocking questions before planning and `.github/prompts/start-feature.prompt.md` to bootstrap a new feature pack from the maintained root templates.
- Use `.github/prompts/ship-change.prompt.md` as the autonomous one-shot entrypoint when you want the repository to drive the full internal workflow end to end.
- Use Context7 workflow whenever library or framework behavior depends on current external docs.
- Treat GitHub MCP as the first supported root MCP integration.
- Treat Context7 and Serena as repo-supported integrations only after root workspace config and setup docs exist.
- If `specify` or external Spec Kit tooling is absent, that is not a blocker; use the internal workflow guide, root templates, and root prompts instead.
- Do not assume `/init` is part of this repo’s workflow unless a specific external tool is installed and documented.

## Output preference

When helpful, respond in this order:

1. goal
2. assumptions
3. decomposition
4. implementation plan
5. verification
6. critique and refinement notes
7. risks or follow-ups
