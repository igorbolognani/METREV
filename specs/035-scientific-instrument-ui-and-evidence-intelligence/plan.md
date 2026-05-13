# Implementation Plan - Scientific Instrument UI and Evidence Intelligence

## Summary

Implement one integrated feature across eight workstreams: feature artifacts, domain and contracts, database, design system, evidence audit, evidence discovery, API/worker/evaluation integration, UI redesign, and validation. The runtime must reuse the existing evidence warehouse, research repository, worker loop, and decision context builder.

## Source-of-truth files

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `docs/repository-authority-map.md`
- `docs/internal-feature-workflow.md`
- `bioelectrochem_agent_kit/domain/`
- `bioelectro-copilot-contracts/contracts/`
- `packages/domain-contracts/src/schemas.ts`
- `packages/domain-contracts/src/research-schemas.ts`
- `packages/domain-contracts/src/loaders.ts`
- `packages/domain-contracts/src/reconciliation.ts`
- `packages/database/prisma/schema.prisma`
- `apps/api-server/src/services/case-evaluation.ts`
- `apps/research-worker/src/worker.ts`
- `apps/web-ui/src/lib/navigation.ts`

## Affected layers and areas

- Domain rules and contract rule files.
- Runtime contract schemas and loaders.
- Prisma schema, migrations, and database repositories.
- Shared packages for evidence audit, evidence discovery, and UI design system.
- API server routes, workspace presenters, and evaluation services.
- Research worker queue loop.
- Next.js web app routes, shell, navigation, API clients, and page components.
- Runtime, Postgres, web UI, E2E, and contract tests.

## Required durable artifacts

- `spec.md`: product scope, functional requirements, acceptance criteria, and exclusions.
- `plan.md`: dependency order, workstream responsibilities, validation strategy, and safety notes.
- `tasks.md`: full checklist used for coverage checks.
- `quickstart.md`: setup, happy path, failure path, edge case, and validation commands.
- `research.md`: repo findings, design reference findings, and implementation decisions.
- `contracts/`: planning-only contract and persistence notes before canonical promotion.

## Research inputs

- Existing UI route and component structure in `apps/web-ui/`.
- Existing evidence database models and scripts in `packages/database/`.
- Existing contract schemas and loaders in `packages/domain-contracts/`.
- Existing API routes and worker jobs in `apps/api-server/` and `apps/research-worker/`.
- Attached `claude_design_skill.md` as an aesthetic reference for production-grade frontend design.

## Contracts and canonical owner files

- contracts affected: `bioelectro-copilot-contracts/contracts/rules/evidence_quality_audit.yaml`, `bioelectro-copilot-contracts/contracts/rules/evidence_discovery.yaml`, runtime schemas and research schemas.
- canonical owner files: `bioelectrochem_agent_kit/domain/rules/evidence-quality-audit.yml`, `bioelectrochem_agent_kit/domain/rules/evidence-discovery-targets.yml`, existing ontology and evidence schema files.
- planning-only notes under `specs/035-scientific-instrument-ui-and-evidence-intelligence/contracts/` describe proposed persistence and API shapes before implementation.

## Data model or boundary changes

Add persisted audit and operation state without replacing the evidence warehouse:

- `EvidenceQualityAuditReport`: JSON report sections, summary, trigger, actor, and created timestamp.
- `EvidenceDiscoveryTarget`: gap-derived query target, provider list, priority, status, counters, and failure detail.
- `EvidenceAcquisitionAttempt`: per-source full-text acquisition attempt with strategy, status, URL, access status, and failure reason.

Runtime boundaries expose typed schemas for coverage entries, evidence gaps, outliers, readiness scores, funnel stage counts, audit reports, discovery targets, acquisition attempts, and workspace evidence intelligence summary.

## Implementation steps

1. Create feature pack artifacts and planning contract notes.
2. Add domain and contract policy YAML files.
3. Add runtime schemas, loaders, reconciliation entries, and exports.
4. Add Prisma models, migration, and repository methods.
5. Create `@metrev/design-system` with tokens, primitives, layouts, and visualizations.
6. Create `@metrev/evidence-audit` with coverage, gap, outlier, readiness, funnel, and report orchestration modules.
7. Create `@metrev/evidence-discovery` with query generation, acquisition attempt handling, and discovery orchestration modules.
8. Add API routes for quality report and discovery/acquisition status.
9. Extend workspace response and presenters with evidence intelligence summary.
10. Extend case evaluation with evidence readiness notes and missing data.
11. Extend research worker to drain discovery and acquisition queues.
12. Rebuild web navigation and route compatibility.
13. Rebuild public landing, home, evaluate, evidence, research, reports, and admin surfaces.
14. Add runtime, database, web, E2E, and contract tests.
15. Run validations and restart local view for user testing.

## Validation strategy

- unit: schema parsing, audit classifications, discovery query generation, readiness scoring, UI rendering.
- integration: API routes, repository methods, case evaluation readiness, worker queue handling.
- e2e/manual: local-view navigation, evaluation flow, evidence quality dashboard, report flow.
- docs/contracts: contract drift tests and feature artifact review.

## Critique summary

The original plan was directionally correct but needed repo-specific corrections: reuse the existing evidence quality report script, treat persisted artifacts and text chunks as full-text evidence, preserve old routes while adding new IA, and keep API paths consistent with the existing `/api` Fastify surface.

## Refined final plan

Ship one cohesive feature, but implement in gates. Each gate must update tests and run the narrowest validation before broad validation. Do not leave route compatibility, evidence readiness persistence, or UI copy traceability as follow-up work.

## Rollback / safety

- Database changes are additive.
- New packages are additive.
- Existing routes remain available through redirects or compatibility pages.
- Existing evidence admissibility gates remain unchanged.
- Existing rule-engine weights remain unchanged.
- Local-view restart happens only after validation or after a documented blocker.
