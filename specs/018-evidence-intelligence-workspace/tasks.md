# Tasks — Evidence Intelligence Workspace

## Workstream 1 — Artifacts and design

- [x] T1 Create `specs/018-evidence-intelligence-workspace/` as the durable execution pack for the evidence-intelligence wave.
- [x] T2 Record that the first slice reuses the existing evidence workspace payload and defers schema-heavy warehouse expansion, cleanup, and local-first LLM augmentation.

## Workstream 2 — Implementation

- [x] T3 Add `/evidence/explorer` and `/evidence/explorer/[id]` to the web route topology, primary navigation, and breadcrumb handling.
- [x] T4 Ship a read-first evidence explorer surface with search, source filters, status slices, pagination, and direct detail links using current workspace payloads.
- [x] T5 Promote a dedicated runtime explorer workspace contract, shared query parser, and explorer CSV export once explorer-specific slice metadata exceeds the reused review payload.
- [x] T6 Render warehouse-scoped filtered facets, grouped tables, and the current-slice export action in the explorer UI.
- [x] T7 Add a dedicated evidence assistant route and UI module with explicit provenance, uncertainty, cited-row disclosure, and deterministic fallback metadata.

## Workstream 3 — Validation and follow-through

- [x] T8 Convert evidence detail into a tabbed workbench and cover the new explorer and detail flow with focused regression tests.
- [x] T9 Consolidate historical cleanup context into `docs/historical-cleanup-notes.md` and retire the redundant root historical notes.
- [x] T10 Run focused runtime and web validation for the dedicated explorer contract, warehouse aggregates, assistant route, client helpers, and UI rendering.
- [x] T11 Record that later slices should now focus on richer evidence reasoning and deeper warehouse analytics rather than the already-completed explorer contract, warehouse aggregates, and first local-first assistant slice.

## Dependencies

- Canonical domain and hardened contract layers must remain authoritative while the warehouse stays the operational source of evidence records.
- The runtime explorer contract must remain additive and must not be treated as a replacement for canonical domain or hardened YAML contract owners.
- Warehouse-scoped explorer aggregates must be computed in the repository layer so presenter and UI code do not infer cross-page totals from paginated results.

## Parallelizable

- [x] P1 Conservative cleanup discovery completed once value was extracted from candidate historical surfaces.
- [x] P2 Explorer-specific backend contracts and grouped tables completed without undoing the earlier route slice.
- [x] P3 First local-first LLM assistance and warehouse-wide aggregate facets are shipped in this slice; richer evidence reasoning remains later work.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
