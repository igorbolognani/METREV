# METREV Full Stack, Runtime Architecture, Routes, and Repository Map

This document is a detailed setup and architecture guide for the current METREV repository.

It explains:

- what the project is and what it is not
- which folders are authoritative and which are reference-only
- the full runtime stack from frontend to persistence and observability
- how the web routes, API routes, and package integrations work together
- how the UI is organized today
- how to navigate the repository quickly when onboarding or extending the runtime

## 1. What This Repository Is

METREV is an auditable bioelectrochemical decision-support workspace.

The repository is intentionally split into three major layers that must not be treated as competing sources of truth:

1. `bioelectrochem_agent_kit/domain/`: canonical domain semantics, including vocabulary, evidence semantics, defaults behavior, uncertainty framing, compatibility intent, and scoring intent.
2. `bioelectro-copilot-contracts/contracts/`: hardened contract boundary for validation-facing, serialization-facing, storage-facing, and future API boundary shapes.
3. `apps/` and `packages/`: runtime implementation that adapts the domain and contracts into a working product.

This means the runtime is not allowed to invent a second product vocabulary casually. The web UI and API are adapters over the domain and contract layers.

## 2. Authority Split and Source of Truth

Before reading the stack as a normal web app, it is important to understand the repository authority model.

### Active authority surfaces

- Root governance: `AGENTS.md`, `.github/copilot-instructions.md`
- Authority index: `docs/repository-authority-map.md`
- Semantic meaning: `bioelectrochem_agent_kit/domain/`
- Hardened contract boundary: `bioelectro-copilot-contracts/contracts/`
- Executed runtime loading: `packages/domain-contracts/src/loaders.ts`, `packages/domain-contracts/src/reconciliation.ts`
- Runtime implementation: `apps/`, `packages/`, `tests/`
- Shared runtime orchestration: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `vitest*.ts`, `playwright.config.ts`, `docker-compose.yml`

### Reference-only or future-facing surfaces

- `stack.md` is legacy background context, not the active runtime authority
- `copilot_project_starter_detailed/` is reusable scaffolding, not the live METREV runtime source
- `archive/legacy-root-duplicates/` contains historical duplicates and references, not active runtime owners
- `specs/013-metrev-ui-ux-parity/` is antecedent UI context, while `specs/014-local-first-professional-workspace/` is the active execution pack for the current local-first product phase

### Why this split exists

The repository is trying to preserve domain truth and contract truth separately from runtime implementation so that:

- the UI does not become the owner of business semantics
- the API does not silently drift away from the contract boundary
- future persistence, export, and integration work can stay traceable
- product polish does not erase defaults, uncertainty, evidence posture, or audit visibility

## 3. Full Stack at a Glance

## Product/runtime layer

| Layer                       | Current technology                                                             | Why it exists here                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Web UI                      | Next.js App Router, React 19, TypeScript                                       | Analyst-facing authenticated workspace with dedicated product routes                                 |
| API                         | Fastify 5                                                                      | Thin HTTP boundary over deterministic evaluation, workspace presenters, exports, and evidence review |
| Shared contracts            | Zod, js-yaml, TypeScript                                                       | Validated runtime schemas, normalization, contract loading, and shared workspace/export types        |
| Persistence                 | PostgreSQL, Prisma 7, `pg`                                                     | Evaluations, users, evidence catalog, seeds, migrations, and ingestion storage                       |
| Auth                        | Auth.js 5 beta with credentials provider, Prisma adapter, JWT session strategy | Shared sign-in and route protection across the web UI and API                                        |
| Deterministic evaluation    | `@metrev/rule-engine`                                                          | Rule-backed evaluation of normalized case input                                                      |
| Simulation enrichment       | `@metrev/electrochem-models`                                                   | Optional deterministic modeling/simulation enrichment attached to evaluation outputs                 |
| Narrative layer             | `@metrev/llm-adapter`                                                          | Narrative generation that sits after deterministic output, not before it                             |
| Audit generation            | `@metrev/audit`                                                                | Explicit audit records, defaults, missing-data tracking, versions, and traceability                  |
| Client data layer           | TanStack Query                                                                 | Client-side fetching, caching, invalidation, and loading/error handling                              |
| URL state                   | `nuqs`                                                                         | Shareable, restorable query state for tabs, filters, sort, and wizard steps                          |
| UI primitives               | Local wrappers over Radix primitives                                           | Accessible building blocks without turning Tailwind or generated UI into source of truth             |
| Command palette             | `cmdk`                                                                         | Quick navigation across top-level product surfaces, recent evaluations, and recent cases             |
| Charts                      | `recharts`                                                                     | Simulation series and modeling charts                                                                |
| Styling                     | Custom CSS in `globals.css` with CSS variables                                 | IBM Plex typography, warm surfaces, dense information views, and reusable workspace tokens           |
| Observability               | OpenTelemetry, OTLP HTTP exporter, Jaeger                                      | Trace inspection across API runtime and local container workflow                                     |
| Testing                     | Vitest, Playwright, Python contract checks                                     | Runtime, UI, Postgres, contracts, and end-to-end coverage                                            |
| Workspace orchestration     | pnpm workspaces, Turbo                                                         | Monorepo dependency and task orchestration                                                           |
| Container/runtime packaging | Docker Compose                                                                 | Local full-stack runtime with Postgres, API, web, and Jaeger                                         |

## 4. Top-Level Repository Structure

The root is organized as a mixed authority-plus-runtime workspace.

```text
METREV/
├── apps/
│   ├── api-server/
│   └── web-ui/
├── packages/
│   ├── audit/
│   ├── auth/
│   ├── database/
│   ├── domain-contracts/
│   ├── electrochem-models/
│   ├── llm-adapter/
│   ├── rule-engine/
│   ├── telemetry/
│   └── utils/
├── tests/
│   ├── contracts/
│   ├── e2e/
│   ├── fixtures/
│   ├── postgres/
│   ├── runtime/
│   └── web-ui/
├── specs/
├── docs/
├── adr/
├── bioelectrochem_agent_kit/
├── bioelectro-copilot-contracts/
├── copilot_project_starter_detailed/
├── archive/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── vitest.config.ts
├── vitest.postgres.config.ts
└── playwright.config.ts
```

## 5. What Each Major Folder Owns

### `apps/`

Contains deployable runtime entrypoints.

- `apps/web-ui/`: Next.js App Router application for the analyst-facing interface.
- `apps/api-server/`: Fastify API that exposes raw evaluation endpoints, workspace endpoints, export endpoints, evidence-review endpoints, and health checks.

### `packages/`

Contains reusable runtime libraries.

- `packages/audit/`: creates audit records for persisted evaluations.
- `packages/auth/`: role parsing, password utilities, server-session resolution, and local seed users.
- `packages/database/`: Prisma client, database readiness checks, repository implementation, and ingestion scripts.
- `packages/domain-contracts/`: Zod schemas, YAML loaders, normalization, compatibility and contract validation, workspace/export schemas, and runtime-facing shared types.
- `packages/electrochem-models/`: simulation and enrichment logic attached to evaluations.
- `packages/llm-adapter/`: narrative generation adapter that consumes deterministic outputs.
- `packages/rule-engine/`: deterministic case evaluation rules.
- `packages/telemetry/`: shared OpenTelemetry helpers and Node SDK bootstrap.
- `packages/utils/`: shared utility helpers used across the runtime packages.

### `tests/`

Contains verification surfaces.

- `tests/contracts/`: contract-level Python and validation checks.
- `tests/runtime/`: runtime behavior, authority, and workspace validation checks.
- `tests/postgres/`: database-backed integration coverage.
- `tests/web-ui/`: UI rendering and workspace-focused tests.
- `tests/e2e/`: Playwright end-to-end flows.
- `tests/fixtures/`: reusable payloads and example inputs.

### `specs/`

Contains the maintained internal feature workflow packs.

Notable packs for the current runtime/UI architecture:

- `specs/014-local-first-professional-workspace/`: active execution pack for the current local-first product phase.
- `specs/016-metrev-ui-refactor/`: concrete staged UI refactor pack.
- `specs/011-analyst-ux-system/`: reusable analyst UX language.
- `specs/009-external-evidence-review-and-intake-gate/`: evidence review and intake gating.
- `specs/007-analyst-cockpit-and-preset-registry/`: presets and cockpit-oriented evaluation UX.

### `docs/`

Maintained repository-level documentation.

- `docs/repository-authority-map.md`: first stop for active vs reference-only ownership.
- `docs/internal-feature-workflow.md`: maintained internal feature workflow.
- `docs/runtime-tooling-setup.md`: tooling and runtime setup context.

### `bioelectrochem_agent_kit/`

Domain-kit repository segment that still owns semantic truth.

### `bioelectro-copilot-contracts/`

Contract boundary repository segment that still owns the hardened contract surface.

### `copilot_project_starter_detailed/`

Reference scaffolding and methodology, not active product source of truth.

### `archive/`

Historical duplicates and retired surfaces retained only as reference.

## 6. Runtime Applications

## 6.1 Web UI: `apps/web-ui/`

This is a Next.js App Router application that renders the analyst-facing workspace.

### Web UI responsibilities

- public landing and login
- authenticated workspace shell
- route guards at page boundaries
- client-side data fetching from the Fastify API
- URL-backed query state for tabs, filters, sort, and wizard steps
- reusable workspace chrome and primitives
- dedicated screens for dashboard, intake, evidence review, evaluation results, comparison, case history, and report

### Web UI important files

- `apps/web-ui/src/app/layout.tsx`: root layout. It loads auth state, wraps the app in providers, and decides whether to render the authenticated shell.
- `apps/web-ui/src/app/providers.tsx`: registers `QueryClientProvider` and `NuqsAdapter`.
- `apps/web-ui/src/auth.ts`: Auth.js configuration for credentials-based sign-in using Prisma and JWT session strategy.
- `apps/web-ui/src/app/api/auth/[...nextauth]/route.ts`: NextAuth route handlers exposed under the Next.js internal API route.
- `apps/web-ui/src/components/app-shell.tsx`: main authenticated shell with sidebar, breadcrumbs, and command palette.
- `apps/web-ui/src/components/workspace-chrome.tsx`: shared page header, section shell, cards, empty state, and skeleton components.
- `apps/web-ui/src/app/globals.css`: design tokens and global CSS system.

## 6.2 API Server: `apps/api-server/`

This is a Fastify application that owns the runtime HTTP surface.

### API responsibilities

- health checks
- role-based route protection for runtime endpoints
- raw evaluation endpoints
- evidence review endpoints
- workspace-oriented UI endpoints
- export endpoints
- repository access and persistence lifecycle
- OpenTelemetry initialization and request tracing

### API important files

- `apps/api-server/src/index.ts`: runtime bootstrap. It initializes telemetry, asserts auth and database readiness, builds the Fastify app, and starts listening.
- `apps/api-server/src/app.ts`: registers CORS, sensible helpers, auth plugin, health routes, case routes, evaluation routes, external-evidence routes, workspace routes, and export routes.
- `apps/api-server/src/plugins/auth.ts`: resolves the shared Auth.js session from cookies and decorates `request.actor`.
- `apps/api-server/src/services/case-evaluation.ts`: main deterministic evaluation pipeline.
- `apps/api-server/src/presenters/workspace-presenters.ts`: builds UI-facing workspace payloads for dashboard, evaluation, comparison, case history, evidence review, printable report, and exports.

## 7. Shared Package Integration Model

The runtime is package-driven. Each HTTP request or UI screen crosses these layers in a deliberate order.

### Core runtime chain

1. `@metrev/domain-contracts`: loads schemas, normalization rules, and runtime contract helpers.
2. `@metrev/rule-engine`: executes deterministic evaluation logic.
3. `@metrev/electrochem-models`: generates optional simulation enrichment.
4. `@metrev/llm-adapter`: generates narrative output after deterministic results are available.
5. `@metrev/audit`: creates explicit audit records from raw input, normalized input, decision output, simulation, runtime versions, and actor context.
6. `@metrev/database`: persists and queries runtime data through the repository interface.
7. `@metrev/telemetry`: wraps important operations in spans.
8. `apps/api-server/src/presenters/workspace-presenters.ts`: shapes persisted/runtime data into UI-facing workspace responses.
9. `apps/web-ui/src/lib/api.ts`: fetches those workspace responses into the web application.

## 8. Web Route Topology

The web app uses dedicated product routes instead of one overloaded page.

### Public routes

| Route                     | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `/`                       | Public landing page explaining the product, its live routes, and its audit posture |
| `/login`                  | Credentials-based Auth.js login page                                               |
| `/api/auth/[...nextauth]` | Framework-level Auth.js route handlers                                             |

### Protected workspace routes

| Route                                    | Purpose                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `/dashboard`                             | Operational dashboard and entry surface                                   |
| `/cases/new`                             | Analyst-only input deck for new evaluations                               |
| `/cases/new/submitting`                  | Stage-visible synchronous evaluation progress page                        |
| `/evaluations`                           | Searchable and sortable evaluation registry                               |
| `/evaluations/[id]`                      | Main evaluation workspace                                                 |
| `/evaluations/[id]/compare/[baselineId]` | Dedicated pairwise comparison surface                                     |
| `/evaluations/[id]/report`               | Printable consulting-style report surface                                 |
| `/cases/[caseId]/history`                | Case-level history, run timeline, audit disclosures, and evidence context |
| `/evidence/review`                       | Evidence review queue                                                     |
| `/evidence/review/[id]`                  | Evidence detail and analyst review action surface                         |

### Route guard behavior

The page components are intentionally thin. They usually:

1. call `requireAuthenticatedSession()` or `requireRoleSession()`
2. return a simple `<main>` wrapper
3. render a single top-level feature component

This keeps auth/authorization logic at the route edge and avoids duplicating it throughout the component tree.

## 9. API Route Topology

The Fastify app exposes a product-oriented set of API prefixes.

### Health

| Prefix    | Purpose                                       |
| --------- | --------------------------------------------- |
| `/health` | Runtime readiness and container health probes |

### Raw evaluation and history endpoints

| Prefix                   | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `/api/cases/evaluate`    | Create a persisted evaluation from raw case input |
| `/api/cases/:id/history` | Return raw case history                           |
| `/api/evaluations`       | List evaluations                                  |
| `/api/evaluations/:id`   | Get a raw persisted evaluation                    |

### External evidence endpoints

| Prefix                              | Purpose                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `/api/external-evidence`            | List catalog evidence, optionally filtered by review state or search query |
| `/api/external-evidence/:id`        | Get evidence detail                                                        |
| `/api/external-evidence/:id/review` | Analyst-only accept/reject mutation                                        |

### Workspace endpoints

These are the most important product-facing endpoints because they return backend-owned view models for the UI.

| Prefix                                                                   | Purpose                           |
| ------------------------------------------------------------------------ | --------------------------------- |
| `/api/workspace/dashboard`                                               | Dashboard workspace payload       |
| `/api/workspace/evaluations/:evaluationId`                               | Evaluation workspace payload      |
| `/api/workspace/cases/:caseId/history`                                   | Case history workspace payload    |
| `/api/workspace/evaluations/:evaluationId/compare/:baselineEvaluationId` | Comparison workspace payload      |
| `/api/workspace/evidence/review`                                         | Evidence review workspace payload |
| `/api/workspace/evaluations/:evaluationId/report`                        | Printable report payload          |

### Export endpoints

| Prefix                                        | Purpose                                       |
| --------------------------------------------- | --------------------------------------------- |
| `/api/exports/evaluations/:evaluationId/json` | Download/export the evaluation workspace JSON |
| `/api/exports/evaluations/:evaluationId/csv`  | Download/export the evaluation CSV            |

## 10. Authentication and Session Integration

The repository uses Auth.js credentials auth with Prisma-backed users.

### Web-side flow

1. The user opens `/login`.
2. The form submits credentials into Auth.js credentials provider logic in `apps/web-ui/src/auth.ts`.
3. Prisma looks up the user and `@metrev/auth` verifies the password hash.
4. Auth.js issues a JWT-backed session.
5. Protected Next.js pages use `auth()` indirectly through `requireAuthenticatedSession()` or `requireRoleSession()`.

### API-side flow

1. Browser requests the Fastify API with `credentials: 'include'` from `apps/web-ui/src/lib/api.ts`.
2. The Fastify `authPlugin` reads the cookie header.
3. `@metrev/auth` resolves the server session into a `SessionActor`.
4. Routes enforce viewer or analyst role through `requireRole()`.

### Why this architecture exists

The web UI and API share the same session identity model so that:

- page rendering can gate access before UI render
- API calls remain protected even if someone bypasses the frontend
- role-specific mutations, such as evidence review and case submission, remain enforceable on the server side

## 11. Deterministic Evaluation Pipeline

The main evaluation lifecycle is implemented in `apps/api-server/src/services/case-evaluation.ts`.

### Pipeline order

1. Check idempotency key: if the same key has already been used, return the existing evaluation.
2. Sanitize selected catalog evidence: only evidence records already reviewed and accepted in the external catalog may be attached.
3. Normalize case input: `@metrev/domain-contracts` transforms raw user input into a normalized case.
4. Run simulation enrichment: `@metrev/electrochem-models` computes optional derived observations and simulation series.
5. Run deterministic rules: `@metrev/rule-engine` produces the core decision output.
6. Validate decision output against contract rules: `@metrev/domain-contracts` validates and, when needed, reviews the result.
7. Generate narrative: `@metrev/llm-adapter` creates narrative output after deterministic evaluation exists.
8. Build runtime versions: the runtime collects prompt, model, contract, ontology, ruleset, and workspace schema versions.
9. Create audit record: `@metrev/audit` records raw input, normalized input, decision output, simulation, actor, versions, and entrypoint.
10. Persist evaluation: `@metrev/database` stores the evaluation and makes it available to raw endpoints and workspace presenters.

### Why this order matters

The runtime is intentionally not chat-first. Narrative generation happens only after normalization, simulation enrichment, deterministic rules, and contract validation.

## 12. Workspace Presenter Model

One of the most important architectural choices in the repository is that the UI consumes backend-owned workspace payloads.

This means the API does not send only raw database records and expect the browser to invent product meaning.

### Presenter responsibilities

`apps/api-server/src/presenters/workspace-presenters.ts` builds:

- dashboard summaries
- evaluation hero cards, lead action, attention items, metrics, tabs, and history posture
- pairwise comparison summaries and deltas
- case-history timeline and disclosures
- evidence-review queue workspace summaries
- printable report sections
- export metadata and CSV serialization
- runtime version and traceability metadata

### Why this exists

This keeps decision framing, posture, gaps, and traceability closer to the validated backend contract rather than scattering heuristics throughout the frontend.

## 13. UI Architecture Today

The UI is a workspace-style application, not a generic SaaS dashboard and not a marketing-first shell.

### 13.1 Shell and navigation

The authenticated UI is centered around:

- a fixed left sidebar
- centralized breadcrumbs
- a global command palette
- a print-safe mode that removes workspace chrome on report routes

Important files:

- `apps/web-ui/src/components/app-shell.tsx`
- `apps/web-ui/src/components/app-sidebar.tsx`
- `apps/web-ui/src/components/primary-nav.tsx`
- `apps/web-ui/src/components/recent-evaluations-nav.tsx`
- `apps/web-ui/src/components/command-palette.tsx`
- `apps/web-ui/src/components/workspace-breadcrumbs.tsx`
- `apps/web-ui/src/lib/navigation.ts`

### 13.2 Workspace chrome

Most screens are composed out of the same page-level building blocks:

- `WorkspacePageHeader`
- `WorkspaceSection`
- `WorkspaceStatCard`
- `WorkspaceDataCard`
- `WorkspaceEmptyState`
- `WorkspaceSkeleton`

These are defined in `apps/web-ui/src/components/workspace-chrome.tsx`.

### 13.3 Design system and primitives

The UI uses a CSS-first design system with IBM Plex typography and local wrappers around Radix primitives.

Important files/folders:

- `apps/web-ui/src/app/globals.css`
- `apps/web-ui/src/components/ui/`
- `apps/web-ui/src/components/workbench/`
- `apps/web-ui/src/components/charts/simulation-multi-line-chart.tsx`

The repo explicitly keeps Tailwind out of scope for the current UI refactor path.

### 13.4 URL state model

The UI persists important workspace state in the URL through `nuqs`.

Examples:

- evaluation active tab: `apps/web-ui/src/lib/evaluation-view-query-state.ts`
- case form step: `apps/web-ui/src/lib/case-form-query-state.ts`
- evidence review filter/search: `apps/web-ui/src/lib/evidence-review-query-state.ts`
- evaluation registry filters/sort: `apps/web-ui/src/lib/evaluations-list-query-state.ts`

This makes filters, tabs, and wizard position more shareable and restorable.

## 14. Main UI Screens and Their Purpose

### Dashboard

Owned by `apps/web-ui/src/components/dashboard-workspace.tsx`.

Purpose:

- runtime KPIs
- quick actions
- latest run surface
- entry point into input deck, evaluation registry, evidence review, and reporting
- recent runs and evidence backlog tables

### Input Deck

Owned primarily by `apps/web-ui/src/components/case-form.tsx` and `apps/web-ui/src/components/case-form/`.

Purpose:

- collect case context and operating conditions
- allow preset selection
- attach accepted external evidence explicitly
- autosave and restore drafts
- validate step-by-step before submission

### Submitting Screen

Owned by `apps/web-ui/src/components/intake-submitting-screen.tsx`.

Purpose:

- keep submission synchronous
- still make progress stages visible to the analyst
- preserve draft state on failure

### Evaluation Workspace

Owned by `apps/web-ui/src/components/evaluation-result-view.tsx` and `apps/web-ui/src/components/evaluation/`.

Tabs:

- Overview
- Recommendations
- Modeling
- Roadmap & Suppliers
- Audit

Purpose:

- keep decision-first summary at the top
- expose modeling, roadmap, and audit without overloading one page
- provide direct actions into compare, history, report, and exports

### Comparison

Owned by `apps/web-ui/src/components/evaluation-comparison-view.tsx`.

Purpose:

- compare two runs from the same case
- show metric deltas, recommendation deltas, and supplier shortlist deltas
- avoid hiding comparison inside the main evaluation page

### Case History

Owned by `apps/web-ui/src/components/case-history-view.tsx`.

Purpose:

- timeline of stored evaluation runs
- case-level defaults, missing data, and assumptions
- audit payload disclosures
- shared evidence context for the case

### Evidence Review

Owned by `apps/web-ui/src/components/external-evidence-review-board.tsx` and `apps/web-ui/src/components/evidence-review/`.

Purpose:

- dense analyst queue for imported literature/catalog evidence
- search and filter state
- bulk accept/reject actions
- visible pending, accepted, and rejected posture

### Evidence Detail

Owned by `apps/web-ui/src/components/external-evidence-detail.tsx` and `apps/web-ui/src/components/evidence-detail/`.

Purpose:

- review a single imported evidence item
- inspect metadata, claims, applicability scope, and payload disclosures
- accept or reject with an explicit analyst note

### Printable Report

Owned by `apps/web-ui/src/components/printable-report-view.tsx`.

Purpose:

- browser-native print and PDF generation
- consulting-style report sections
- preserve defaults, missing data, and confidence framing in exported output

## 15. How Integration Works End to End

## 15.1 Sign-in to protected runtime

1. User signs in through `/login`.
2. Auth.js verifies credentials with Prisma.
3. Protected pages check session before rendering.
4. The authenticated shell loads.
5. React Query calls the Fastify API with cookies included.
6. Fastify resolves the same session into `request.actor`.

## 15.2 New evaluation flow

1. Analyst opens `/cases/new`.
2. Case form collects input and stores draft state.
3. Accepted catalog evidence may be added explicitly.
4. Form submits to `/cases/new/submitting`.
5. `evaluateCase()` calls `/api/cases/evaluate` with an idempotency key.
6. API normalizes, enriches, runs rules, validates, narrates, audits, and persists.
7. Browser redirects to `/evaluations/[id]`.

## 15.3 Viewing an evaluation

1. Web UI fetches `/api/workspace/evaluations/:id`.
2. API loads the persisted evaluation and its case history.
3. Workspace presenter builds the evaluation workspace payload.
4. Tabs render backend-owned summary structures.

## 15.4 Evidence review to intake gate

1. Imported evidence is listed under `/evidence/review`.
2. Analysts accept or reject records.
3. Only accepted records appear in the accepted-evidence selector for intake.
4. During evaluation creation, catalog evidence is revalidated server-side before attachment.

## 15.5 Exports and reporting

1. Evaluation workspace exposes report, JSON export, and CSV export actions.
2. Report route fetches a printable report payload from `/api/workspace/evaluations/:id/report`.
3. JSON and CSV are served through `/api/exports/evaluations/:id/json` and `/api/exports/evaluations/:id/csv`.

## 16. Folder-Level Notes for Onboarding

If you are new to the repository, use this reading order:

1. `docs/repository-authority-map.md`
2. `README.md`
3. `specs/014-local-first-professional-workspace/spec.md`
4. `specs/016-metrev-ui-refactor/spec.md`
5. `apps/web-ui/src/app/`
6. `apps/web-ui/src/components/`
7. `apps/api-server/src/app.ts`
8. `apps/api-server/src/routes/`
9. `apps/api-server/src/services/case-evaluation.ts`
10. `apps/api-server/src/presenters/workspace-presenters.ts`
11. `packages/domain-contracts/`
12. `packages/database/`

## 17. Tests and Validation Surfaces

The repository validates behavior across multiple layers.

### JavaScript/TypeScript

- `pnpm run test:js`: runs Vitest across runtime and UI tests.

### Postgres-backed runtime tests

- `pnpm run test:db`: runs Vitest with the Postgres config.

### Python contract checks

- `pnpm run test:python`: runs canonical contract and domain drift checks.

### End-to-end browser coverage

- `pnpm run test:e2e`: runs Playwright.

### Build and lint

- `pnpm run lint`
- `pnpm run build`

## 18. Local Runtime and Deployment-Like Startup

## 18.1 Standard local development

From the root:

1. Copy `.env.example` to `.env`
2. Run `pnpm install`
3. Run `pnpm prisma:generate`
4. Run `pnpm run db:migrate:deploy`
5. Run `pnpm run db:seed`
6. Run `pnpm run dev:api`
7. Run `pnpm run dev:web`

### Main root scripts

- `pnpm run dev`
- `pnpm run dev:api`
- `pnpm run dev:web`
- `pnpm run build`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run test:db`
- `pnpm run test:e2e`

## 18.2 Local full-stack container view

The repository exposes a validated alternate-port local-view mode.

### Startup

- `pnpm run local:view:up`
- `pnpm run local:view:status`
- `pnpm run local:view:open`
- `pnpm run local:view:down`

### Local-view ports

| Service   | Port    |
| --------- | ------- |
| Web       | `3012`  |
| API       | `4012`  |
| Postgres  | `5436`  |
| Jaeger UI | `16689` |
| OTLP HTTP | `4321`  |

## 18.3 Docker Compose services

Defined in `docker-compose.yml`:

- `postgres`
- `api`
- `web`
- `jaeger`

The web container depends on API, Jaeger, and Postgres. The API depends on Jaeger and Postgres. This gives a complete local-first stack for runtime validation.

## 19. Important Archives and Reference Materials

These folders exist but should be interpreted correctly:

- `archive/legacy-root-duplicates/`: historical duplicates and cleanup leftovers.
- `copilot_project_starter_detailed/`: generic starter/reference materials.
- `docs/historical-cleanup-notes.md`: consolidated historical cleanup and manual-review context.

They are useful for background but they are not the active runtime owners.

## 20. Short Practical Summary

METREV today is a local-first monorepo with:

- Next.js App Router web UI in `apps/web-ui/`
- Fastify API in `apps/api-server/`
- Prisma/PostgreSQL persistence in `packages/database/`
- Auth.js credentials auth shared between web and API
- domain and contract truth living outside the runtime in `bioelectrochem_agent_kit/` and `bioelectro-copilot-contracts/`
- backend-owned workspace payloads feeding a dense analyst UI
- explicit evidence gating, audit records, exports, and observability

If you are extending the product, the safest mental model is:

1. semantics come from the domain kit
2. validation and shared shapes come from the contract layer
3. API presenters turn validated runtime data into product-facing workspace payloads
4. the UI renders those payloads without inventing a parallel business language
