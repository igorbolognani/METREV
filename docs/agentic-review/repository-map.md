# Repository Map

## Purpose

This report explains the main parts of the METREV repository in simple technical
language. It is explanatory only. It does not replace `AGENTS.md`, `WORKFLOW.md`,
`.github/copilot-instructions.md`, or `docs/repository-authority-map.md`.

METREV is organized around a deliberate split:

- domain meaning starts in `bioelectrochem_agent_kit/domain/`
- validation and serialization contracts start in
  `bioelectro-copilot-contracts/contracts/`
- runnable software lives in `apps/` and `packages/`
- tests and workflow assets prove that the pieces still line up

## Major Areas

### `apps/`

`apps/` contains deployable runtime entrypoints.

- `apps/web-ui/` is the Next.js user interface. It contains public pages,
  signed-in workspaces, internal/admin pages, route wrappers, and UI-side data
  orchestration.
- `apps/api-server/` is the Fastify API. It is the backend entrypoint for
  evaluation, health, auth-aware API behavior, and runtime integration.
- `apps/research-worker/` is the worker process for queued research and
  extraction jobs.

This area is runtime code. It should adapt the domain and contract layers. It
should not invent a separate product vocabulary.

### `packages/`

`packages/` contains reusable runtime libraries shared by the apps.

Examples include:

- `packages/domain-contracts/` for loading and reconciling domain and contract
  assets into the TypeScript runtime.
- `packages/rule-engine/` for deterministic evaluation behavior.
- `packages/database/` for Prisma, persistence, ingestion, and database-backed
  workflows.
- `packages/audit/` and `packages/evidence-audit/` for traceability and audit
  support.
- `packages/auth/`, `packages/telemetry/`, `packages/utils/`, and related
  support packages.

This area is also runtime code. Business rules should live here or in shared
domain services when they are reused by apps.

### `bioelectrochem_agent_kit/`

`bioelectrochem_agent_kit/` is the product-specific domain kit. The active
semantic source of truth is `bioelectrochem_agent_kit/domain/`.

It owns the meaning of the bioelectrochemical system concepts, including:

- domain vocabulary
- stack decomposition
- evidence semantics
- defaults and missing-data behavior
- uncertainty handling
- compatibility and scoring intent

Some nested workflow assets and generated exports inside this tree are reference
material only. The root authority map says which surfaces are active.

### `bioelectro-copilot-contracts/`

`bioelectro-copilot-contracts/contracts/` is the hardened contract boundary.

It owns validation-facing, serialization-facing, storage-facing, and future API
or database-facing shapes. In simple terms: the domain kit explains what things
mean; the contract layer says what shape those things must have when code,
storage, APIs, or validators handle them.

Runtime code should not bypass this boundary when producing API responses or
persisted decision artifacts.

### `specs/`

`specs/` contains feature packs, plans, tasks, quickstarts, and sometimes
research notes. It is the repo's durable planning layer for medium and large
changes.

Important active or current surfaces include:

- `specs/020-metrev-three-phase-product-plan/` as the active product roadmap.
- `specs/021-public-infographic-pages/` as the active public-route execution
  slice under that roadmap.
- `specs/033-ui-api-database-rule-engine-refactor/` as the current signed-in
  client/admin and `EvidenceDecisionContext` refactor owner.

Older specs can be useful background. They should not be treated as active
instructions unless the authority map says they are active.

### `docs/`

`docs/` contains maintained documentation, historical notes, internal workflow
guidance, tooling setup, and this agentic-review report set.

The most important file for understanding active versus reference material is
`docs/repository-authority-map.md`. This report set summarizes that file for a
founder or reviewer, but does not replace it.

### `tests/`

`tests/` contains verification across runtime, contracts, web UI behavior,
database behavior, e2e flows, and workflow assets.

Important test categories include:

- `tests/runtime/` for TypeScript runtime and workflow checks.
- `tests/web-ui/` for Next.js and UI behavior checks.
- `tests/contracts/` for Python contract and vocabulary checks.
- `tests/e2e/` for Playwright browser flows.

Tests are a safety net against drift between domain meaning, contract shapes,
runtime behavior, and user-facing workflows.

### `.github/`

`.github/` contains root-owned workflow customization and automation.

Relevant categories include:

- `.github/workflows/` for CI and security automation.
- `.github/instructions/` for path-scoped agent guidance.
- `.github/prompts/` for reusable prompt workflows.
- `.github/agents/` and `.github/skills/` for root-owned agentic workflows.
- `.github/copilot-instructions.md` as the detailed Copilot companion to
  `AGENTS.md`.

Nested `.github/` folders inside reference kits are not active METREV workflow
authority unless they are intentionally promoted.

## Runtime, Domain, Contracts, Workflow, Tests, Reference

| Category           | Main location                                                                            | Meaning                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Runtime code       | `apps/`, `packages/`                                                                     | Code that runs the web UI, API, worker, persistence, rules, audit, auth, and telemetry.      |
| Domain knowledge   | `bioelectrochem_agent_kit/domain/`                                                       | Canonical meaning for bioelectrochemical concepts and decision semantics.                    |
| Contracts          | `bioelectro-copilot-contracts/contracts/`                                                | Canonical shapes for validation, serialization, storage, and future API boundaries.          |
| Workflow assets    | `WORKFLOW.md`, root `.github/`, `docs/internal-feature-workflow.md`, `specs/_templates/` | How agentic work should be planned, executed, reviewed, and validated.                       |
| Tests              | `tests/`, package-local checks where required                                            | Objective checks for runtime behavior, contracts, UI, local acceptance, and workflow assets. |
| Reference material | `copilot_project_starter_detailed/`, historical specs, generated exports, legacy briefs  | Useful background that should not override active authority surfaces.                        |

## Practical Reading Order

For a technical founder or senior reviewer, start here:

1. `docs/repository-authority-map.md` for active versus reference surfaces.
2. `AGENTS.md` for source-of-truth and domain/contract rules.
3. `README.md` for runtime setup, validation matrices, and current MVP status.
4. `WORKFLOW.md` for how changes should move from request to verified change.
5. `docs/agentic-review/baseline.md` for the audit baseline and Coach findings.
6. The rest of this `docs/agentic-review/` report set for founder-readable
   summaries.
