# Implementation Plan - Client Dashboard And Research Intelligence

## Summary

Implement this work in two tracks. The first track lands immediate client value: a guarded local evaluation reset path, a compact dashboard refactor, reports embedded into the workspace, and cleaner evaluation-registry behavior. The second track builds the research-intelligence and parameter-state architecture required to support higher-quality presets, comparisons, and a 30,000-record MFC/MEC warehouse bootstrap without overstating what the current reviewed-evidence layer can do.

## Source-of-truth files

- `bioelectrochem_agent_kit/domain/` for canonical parameter semantics, defaults, plausible ranges, and research taxonomy.
- `packages/domain-contracts/src/` for runtime validation and API boundary shapes.
- `packages/database/prisma/schema.prisma` for persistence and cascade ownership.
- `apps/api-server/src/presenters/workspace-presenters.ts` for backend-owned dashboard and report-facing workspace payloads.
- `apps/web-ui/src/components/` and `apps/web-ui/src/lib/` for the signed-in UI layer.

## Affected layers and areas

- runtime adapters: dashboard presenter, evaluation routes, repository/reset scripts, research worker, research API
- UI: dashboard, reports, evaluations registry, stack configurator, preset library, shared form controls, global layout density
- docs and workflow: durable feature pack, quickstart, research notes, planning-only contract notes

## Required durable artifacts

- `spec.md`: scope, decisions, guardrails, and acceptance criteria
- `plan.md`: phased implementation, validation strategy, and rollback posture
- `tasks.md`: execution checklist for the UX slice and the research-intelligence slice
- `quickstart.md`: local commands and manual verification path
- `research.md`: grounded findings about current dashboard, reset absence, and research warehouse limitations
- `contracts/`: planning-only notes for dashboard payload, parameter state, and research table traces

## Research inputs

- the current dashboard uses count-derived summary rails and synthetic sparklines from `buildDashboardWorkspace`, not deeper client decision posture
- `/reports` is a standalone route backed by `ReportsListView`, while the dashboard already has a reports tab slice that can be expanded
- no evaluation delete/reset route or repository method exists today
- the research warehouse can scale metadata, but current persistence does not store first-class table/cell traces or concept tables
- the stack form already has units for a few numeric inputs and domain-owned default/plausible-range files, but not a canonical include/default/exclude parameter model

## Contracts and canonical owner files

- contracts affected: dashboard workspace response, evaluation reset behavior if exposed beyond scripts, parameter-state request/response mapping, research review and extraction trace schemas
- canonical owner files: `packages/domain-contracts/src/schemas.ts`, `packages/domain-contracts/src/research-schemas.ts`, `packages/database/prisma/schema.prisma`, `bioelectrochem_agent_kit/domain/ontology/property-dictionary.yml`, `bioelectrochem_agent_kit/domain/rules/defaults.yml`
- planning-only notes under `specs/030-client-dashboard-research-intelligence/contracts/`: `dashboard-workspace.md`, `parameter-state.md`, `research-table-trace.md`

## Data model or boundary changes

The first UX slice can add a local-only evaluation reset script without changing public API contracts. The dashboard presenter will likely need a refined payload structure so the UI can render client-relevant compact panels instead of generic count charts. The parameter-control slice will require a contract extension or adapter plan so included, excluded, defaulted, and client-provided values remain explicit in `RawCaseInput`, defaults audit, and runtime evaluation normalization. The research-intelligence slice will require new persistence for table/cell traces and concept/metric records before the product can claim line/column/table-aware extraction at scale.

## Implementation steps

1. Create the feature pack and planning-only contract notes.
2. Add a guarded local evaluation reset command and validate it against the Docker local-view stack.
3. Refactor the dashboard presenter and dashboard UI into compact client-useful panels.
4. Reuse or expand the dashboard reports tab and add `/reports` fallback navigation.
5. Improve evaluation registry empty-state behavior after reset.
6. Define and land the parameter-state contract and reusable field controls.
7. Apply parameter controls across the 12 stack steps and improve preset provenance.
8. Add research table/concept persistence design, then scale ingestion/review/extraction through the 30,000-record MFC/MEC queue, scripts, and progress surface.

## Validation strategy

- unit: focused Vitest coverage for dashboard view, reports registry behavior, evaluations empty state, reset-script logic, and parameter-control mapping helpers
- integration: runtime/API tests for dashboard payloads, evaluation list behavior, reset path safety, research API limits, and evidence acceptance gates
- e2e/manual: local Docker runtime verification for dashboard/reports/evaluations after reset, plus logged-in UX review across desktop and mobile widths
- docs/contracts: quickstart parity, contract note review, and domain/contract alignment for parameter state and research traces

## Critique summary

The main risk is pretending the whole request can land as one UI-only rewrite. Dashboard improvements are achievable now, but research-intelligence claims around 30,000 accepted table-extracted articles still require real schema, extractor, and review-flow work. The parameter-control request is also larger than a visual tweak because defaults, exclusion, units, and recommended values must survive normalization, evaluation, and audit.

## Refined final plan

Start with the slice that immediately improves product credibility and local usability: clean local evaluation data, refactor the dashboard, keep reports inside the dashboard workspace, and make empty states intentional. Then use the new feature pack to drive the deeper parameter-state and research-intelligence work in explicit, validated stages rather than mixing speculative UI with unsupported data claims.

## Rollback / safety

Keep the reset path local-only, dry-run capable, and isolated from production-like environments. Limit the first runtime edits to the dashboard/report/evaluation slice so validation is focused. For research-intelligence changes, add schema and extraction support incrementally behind explicit review gates instead of migrating the whole warehouse surface at once.
