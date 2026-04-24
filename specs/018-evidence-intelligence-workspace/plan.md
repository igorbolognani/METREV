# Implementation Plan — Evidence Intelligence Workspace

## Summary

Use 018 as the durable execution pack for the evidence-intelligence wave. The shipped slice now includes dedicated explorer routes and navigation, a tabbed evidence-detail workbench, a dedicated runtime explorer workspace contract and CSV export, page-scoped facets and grouped tables in the explorer UI, and conservative cleanup that consolidates historical notes into maintained docs.

## Source-of-truth files

- `bioelectrochem_agent_kit/domain/`
- `bioelectro-copilot-contracts/contracts/`
- `packages/domain-contracts/src/schemas.ts`
- `apps/api-server/src/presenters/workspace-presenters.ts`
- `apps/api-server/src/routes/workspace.ts`
- `apps/api-server/src/routes/exports.ts`
- `apps/web-ui/src/lib/navigation.ts`
- `apps/web-ui/src/lib/api.ts`
- `apps/web-ui/src/components/external-evidence-explorer.tsx`
- `apps/web-ui/src/components/external-evidence-detail.tsx`
- `docs/repository-authority-map.md`
- `docs/historical-cleanup-notes.md`

## Affected layers and areas

- evidence-workspace route topology, export endpoints, and web navigation
- dedicated explorer presenter and runtime contract shaping
- read-first evidence explorer UI, grouped tables, slice facets, and tabbed evidence-detail inspection
- conservative cleanup for historical repository notes and execution tracking for the broader evidence-intelligence wave

## Required durable artifacts

- `spec.md`: define the scope, guardrails, and accepted first slice for the evidence-intelligence wave
- `plan.md`: record the implemented move from reuse-first explorer UI to a dedicated runtime explorer contract and cleanup follow-through
- `tasks.md`: distinguish shipped explorer, contract, cleanup, and validation work from the still-open later slices
- `quickstart.md`: document how to exercise the explorer, grouped tables, export action, and tabbed detail surfaces locally
- `research.md`: capture why the explorer started from reuse and why it later promoted a runtime-specific workspace contract without touching Prisma or hardened YAML owners
- `contracts/`: not required in this slice because no new canonical contract or planning-only boundary note is needed yet

## Research inputs

- existing evidence review routes, workspace presenters, export routes, and detail surfaces in the API and web UI
- the 017 big-data workspace pack and the repository authority map for active versus reference-only surfaces
- focused discovery confirming that current catalog items, claims, source documents, and supplier links are rich enough for a first explorer slice and for an additive runtime explorer contract

## Contracts and canonical owner files

- contracts affected: `packages/domain-contracts/src/schemas.ts` for the runtime explorer workspace schema; no hardened YAML contract owner changes are required in this slice
- canonical owner files: `packages/domain-contracts/src/schemas.ts`, `apps/api-server/src/presenters/workspace-presenters.ts`, `apps/api-server/src/routes/workspace.ts`, `apps/api-server/src/routes/exports.ts`, `apps/web-ui/src/components/external-evidence-explorer.tsx`, `apps/web-ui/src/components/external-evidence-detail.tsx`, `docs/repository-authority-map.md`
- planning-only notes under `specs/<feature>/contracts/`: not needed yet because the slice reuses existing boundaries

## Data model or boundary changes

The slice makes no Prisma or hardened YAML contract changes. It adds a runtime explorer-specific workspace schema, presenter, route, shared query parser, and CSV export once grouped tables and slice-level facets exceeded what the reused review payload could represent cleanly. This keeps the operational behavior additive while leaving full-warehouse aggregates and canonical boundary changes for later slices.

## Implementation steps

1. Create the 018 feature pack and document the first explorer slice, its constraints, and its open follow-through work.
2. Add dedicated explorer routes and navigation so the warehouse can be explored directly without entering the review queue first.
3. Reuse the current evidence workspace payload to implement a read-first explorer with search, posture slices, source filters, pagination, and direct links into detail.
4. Promote a dedicated runtime explorer workspace contract, presenter, and CSV export once explorer-specific slice metadata becomes necessary.
5. Convert evidence detail into a tabbed workbench and expand the explorer UI with page-scoped facets, grouped tables, and slice export.
6. Consolidate the historical cleanup notes into a maintained docs surface and retire the redundant root copies.
7. Add focused regression coverage for runtime explorer routes, explorer rendering, client wiring, and tabbed detail rendering.

## Validation strategy

- unit: static-render regression coverage for explorer view composition and evidence-detail tab rendering
- integration: focused runtime API coverage for the dedicated explorer route and CSV export, plus API client coverage for dedicated explorer fetch helpers
- e2e/manual: exercise `/evidence/explorer` and `/evidence/explorer/[id]` in the local workspace flow after this slice if broader browser validation is needed
- docs/contracts: keep 018 consistent with the truth model that canonical semantics stay in domain/contracts while the warehouse is the operational evidence surface and cleanup history stays in maintained docs rather than root notes

## Critique summary

The main risk is overclaiming architectural progress by treating a richer explorer as if the full evidence-intelligence program were already complete. This plan avoids that by keeping the new explorer contract runtime-scoped, labeling facet counts as page-scoped, and leaving heavier warehouse aggregates and local-first LLM work open in the pack.

## Refined final plan

Anchor the wave in 018, ship the explorer on top of the current warehouse, promote only the runtime-specific contract needed for grouped tables and slice summaries, validate it with focused regressions, and use the resulting surface as the stable base for later additive work such as warehouse aggregates and local-first evidence Q&A.

## Rollback / safety

The explorer routes, runtime contract, and cleanup doc changes are additive. If this slice regresses, rollback can happen at the route, presenter, and component level without changing Prisma, canonical domain semantics, or the existing review queue behavior.
