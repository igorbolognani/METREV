# Implementation Plan — External Evidence Review And Intake Gate

## Summary

Turn the imported literature catalog into an auditable analyst workflow by adding runtime contracts, repository access, and review routes, then surface accepted catalog evidence in the intake UI as an explicit review-gated typed-evidence source without changing the existing deterministic evaluation contract.

## Source-of-truth files

- `packages/database/prisma/schema.prisma`
- `packages/domain-contracts/src/schemas.ts`
- `packages/database/src/index.ts`
- `apps/api-server/src/app.ts`
- `apps/api-server/src/routes/cases.ts`
- `apps/web-ui/src/lib/api.ts`
- `apps/web-ui/src/lib/case-intake.ts`
- `apps/web-ui/src/components/case-form.tsx`

## Affected layers and areas

- runtime database repository access for external-evidence catalog records
- Fastify runtime routes for catalog browsing and review
- authenticated Next.js analyst UI for review and intake selection
- workflow artifacts under `specs/`

## Required durable artifacts

- `spec.md`: required to define the review-gated workflow and non-goals
- `plan.md`: required to keep the implementation anchored to the additive catalog models and existing intake flow
- `tasks.md`: required to sequence repository, API, UI, and validation work
- `quickstart.md`: required to document analyst review and intake validation
- `research.md`: required because the safest gate is explicit analyst selection rather than automatic evidence matching
- `contracts/`: required as a planning-only note because this feature introduces new internal API request and response shapes

## Research inputs

- current additive catalog models in `packages/database/prisma/schema.prisma`
- current intake and evaluation flow in `apps/web-ui/src/lib/case-intake.ts`, `apps/web-ui/src/components/case-form.tsx`, and `apps/api-server/src/routes/cases.ts`
- current ingestion scripts in `packages/database/scripts/ingest-openalex-literature.mjs` and `packages/database/scripts/ingest-crossref-literature.mjs`

## Contracts and canonical owner files

- contracts affected: runtime TypeScript API contracts in `packages/domain-contracts/src/schemas.ts`
- canonical owner files: `packages/domain-contracts/src/schemas.ts`, `packages/database/prisma/schema.prisma`
- planning-only notes under `specs/<feature>/contracts/`: `contracts/evidence-catalog-api.md` to capture the internal route shapes before implementation

## Data model or boundary changes

No new database table is intended in this slice. The existing additive catalog models remain the persistence source, and the new route shapes stay inside the runtime TypeScript contract layer.

## Implementation steps

1. Add runtime schemas and repository methods for catalog list, detail, and review actions, then expose them through authenticated Fastify routes.
2. Build an authenticated analyst review surface for the external-evidence queue and detail view, including explicit accept and reject actions.
3. Extend the intake payload helper and form so accepted catalog evidence can be selected explicitly and merged into the outgoing typed-evidence bundle.

## Validation strategy

- unit: add behavior-oriented tests for repository-backed API review flows and intake evidence merging
- integration: run lint, JavaScript tests, and build checks
- e2e/manual: browse the review queue, accept a catalog item, select it on the intake page, and confirm the resulting evaluation preserves typed-evidence visibility
- docs/contracts: keep the planning-only API note aligned with the implemented TypeScript schemas and leave the hardened YAML boundary unchanged

## Critique summary

The main risk is trying to solve evidence relevance automatically before the analyst workflow exists. The feature should keep the gate simple and explicit: review first, then manual inclusion in intake.

## Refined final plan

Keep the slice additive and reversible. Reuse the existing catalog tables, expose only the minimum runtime contracts needed to review and select records, and make the intake merge logic explicit enough that manual typed evidence, presets, and accepted catalog evidence can coexist without hidden overrides.

## Rollback / safety

If the review workflow underperforms, revert the new routes, runtime repository methods, and web review or intake selection UI. The existing ingestion scripts and evaluation flow should remain intact because the additive catalog models are already isolated.
