# Research Notes — Evidence Intelligence Workspace

## Goal

Determine whether the explorer can begin on the existing evidence warehouse and workspace payloads, and identify the point where a dedicated runtime explorer contract becomes justified without forcing Prisma or hardened YAML changes.

## Questions

- Do the current catalog summary and detail payloads already expose enough metadata, claims, provenance, and source linkage for a first explorer route?
- Can the evidence detail screen become materially more navigable without adding a new backend contract first?
- When grouped tables, slice facets, and explorer export are added, can they stay honest on top of the current repository layer without pretending to be full-warehouse aggregates?

## Inputs consulted

- docs: `docs/repository-authority-map.md`, `specs/017-full-big-data-workspace/spec.md`
- repo files: `apps/api-server/src/routes/workspace.ts`, `apps/api-server/src/routes/external-evidence.ts`, `apps/api-server/src/presenters/workspace-presenters.ts`, `apps/web-ui/src/components/external-evidence-review-board.tsx`, `apps/web-ui/src/components/external-evidence-detail.tsx`, `packages/domain-contracts/src/schemas.ts`
- experiments: focused runtime API, static-render, and client regression tests for the explorer route, CSV export, and tabbed detail surfaces

## Findings

- The current evidence workspace payload already exposes summary counts, spotlight records, paginated items, and stable filters that are sufficient for a first explorer route.
- The catalog detail payload already carries claims, source document metadata, supplier-linked documents, applicability scope, and stored payload disclosures, which is enough to justify a tabbed detail workbench without schema changes.
- Once grouped tables, page-level facets, and current-slice export were required, the reused review workspace payload became too review-centric; an additive runtime explorer contract was enough to solve that gap without touching Prisma.
- The existing repository method `listExternalEvidenceCatalog()` is sufficient for this runtime promotion, but only for page-scoped explorer summaries rather than full-warehouse aggregate facets.

## Decisions

- Reuse the existing evidence workspace payload for the first explorer slice instead of forcing immediate Prisma or contract migration.
- Treat the explorer as a read-first additive surface and keep explicit review controls in the detail workbench rather than blending explorer and batch-review workflows into one overloaded page.
- Promote a dedicated runtime explorer workspace contract only when explorer-specific slice metadata is needed, while keeping canonical domain and hardened YAML owners unchanged.
- Represent source, evidence-type, review-status, and publisher facets as page-scoped buckets until repository-level aggregate queries exist.
- Consolidate historical cleanup notes into a maintained docs surface before removing redundant root copies.

## Open blockers

- Warehouse-wide aggregate facets, richer citation summaries, and cross-page analytics still require repository-level expansion.
- Local-first LLM evidence assistance remains open and should follow only after the explorer contract and cleanup work stay stable under validation.

## Impact on plan

- The explorer could start as a reuse-first route, then promote to a dedicated runtime contract only when the UI demanded richer slice metadata.
- Later slices should now focus on repository-level aggregate explorer data and local-first evidence Q&A instead of reopening the already-completed contract and cleanup follow-through.
