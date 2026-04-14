# Tasks — Runtime Monorepo Foundation

## Workflow and docs

- [x] add root copilot instructions, prompts, agents, and skills
- [x] expand root testing instructions and add general/docs instructions
- [x] capture runtime architecture in ADR and spec artifacts
- [x] add tooling setup docs for GitHub MCP, Context7, Serena, and the internal spec-first workflow

## Monorepo foundation

- [x] add root package manager and turbo config
- [x] add shared TypeScript, lint, and formatting config
- [x] scaffold `apps/web-ui`
- [x] scaffold `apps/api-server`
- [x] scaffold shared runtime packages

## Runtime implementation

- [x] implement runtime contracts and normalization helpers
- [x] implement deterministic rule engine baseline
- [x] implement audit and telemetry helpers
- [x] implement API routes and health checks
- [x] implement UI submission and results flow

## Validation and delivery

- [x] add Vitest tests for packages and API
- [x] add Python-compatible or cross-layer drift validation where needed
- [x] add Docker config
- [x] add GitHub Actions workflow
- [x] verify local install, build, test, and dev commands

## Remaining MVP closure

- [x] add explicit sign-in and sign-out screens plus web route guards so the analyst UI flow is fully authenticated inside the browser, not only at the API boundary
- [x] document the complete analyst flow from login through evaluation, history review, and logout in maintained runtime docs
- [ ] decide whether post-MVP data modeling should further decompose the remaining JSON-backed runtime artifacts into first-class relational entities for materials, components, benchmarks, metrics, ingestion, extraction, normalization, and review states

## Dependencies

- runtime scaffold work depended on the root workflow assets and maintained docs landing first
- API and UI runtime work depended on shared contracts, rule-engine, auth, audit, and telemetry packages being available
- the remaining post-MVP data-model decision depends on the planning-only supplier mapping notes and future relational design review

## Validation gates

- [x] docs updated for runtime setup and analyst flow
- [x] contract drift checks preserved alongside runtime delivery
- [x] local install, build, test, and dev commands verified
- [ ] post-MVP relational decomposition decision recorded

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` stay consistent
- [x] runtime research findings are captured in a maintained feature artifact
- [ ] planning-only supplier mapping notes are either promoted into a future canonical change or closed as post-MVP follow-up
