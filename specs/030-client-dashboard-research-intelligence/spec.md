# Feature Specification - Client Dashboard And Research Intelligence

## Objective

Refactor the signed-in METREV client workspace so the dashboard becomes a useful technical decision surface, reports behave like a normal workspace layer, the local evaluation registry can be deliberately reset for a clean runtime, and the stack configurator can evolve toward explicit parameter controls with transparent defaults, units, and exclusion state. In parallel, land the research-intelligence architecture and runtime controls required to queue and track a 30,000-record MFC/MEC warehouse bootstrap without overstating what the current reviewed-evidence layer can honestly support.

## Why

The current client dashboard is dominated by oversized panels and synthetic trend cards derived from evaluation counts, which does not communicate scientific or operational meaning to the primary user. Reports feel disconnected from the main workspace, the local registry accumulates stale demo data with no supported cleanup path, and the current stack form cannot yet express the parameter-level control model the user requested. The research warehouse can grow metadata today, but it still lacks first-class table traces, concept persistence, and acceptance workflow at the scale needed to improve presets, comparisons, and future agents with trustworthy provenance.

## Primary users

- clients and analysts using the dashboard as the main decision workspace
- analysts and admins managing research ingestion, review, warehouse quality, and evidence promotion

## Related owner specs

- `specs/020-metrev-three-phase-product-plan/` remains the active product roadmap owner.
- `specs/017-full-big-data-workspace/` remains the big-data baseline owner.
- `specs/019-research-intelligence-review-table-engine/` remains the current research-table owner.
- `specs/028-metrev-data-metadata-intelligence/` remains the metadata/data-readiness owner.
- `specs/029-logged-in-ui-admin-separation/` remains the first signed-in IA/UI cleanup owner.

## Scope

### In

- a backend-owned dashboard payload and UI refactor centered on useful client decision status
- reports embedded as a dashboard workspace tab with a safe route fallback
- a guarded local-development evaluation reset path for cleaning the runtime registry
- cleaner evaluations empty-state behavior after an intentional local reset
- canonical design notes for parameter include/default/exclude state across the 12 stack steps
- improved preset-library provenance and parameter-quality planning
- research-intelligence design and implementation slices for a 30,000-record warehouse bootstrap, structured concepts, table traces, and reviewed promotion into comparison/preset services
- accessibility and visualization requirements for all signed-in pages touched by this work

### Out

- inflating warehouse counts or accepted-article totals without real ingestion, review, and traceability support
- exposing raw research backfill or warehouse operations as client-dashboard actions
- silently injecting browser-only "best values" that bypass defaults, provenance, and confidence disclosure
- production data-deletion paths or uncontrolled destructive admin tools
- a complete end-state research corpus in the same first UX slice

## Functional requirements

1. The dashboard must prioritize client-relevant signals: current workspace posture, readiness, missing critical data, defaults/assumptions, next actions, latest run, and output availability.
2. Reports must be reachable inside the dashboard workspace while remaining available through a route fallback that includes clear navigation and actions.
3. The local runtime must provide a guarded path to clear saved evaluations and cascade-owned artifacts without deleting research warehouse data, users, or unrelated runtime records.
4. The evaluations registry must render a deliberate clean/empty state after reset instead of stale counters or oversized filler cards.
5. The stack configurator must gain a canonical parameter-control design that supports included, excluded, system-defaulted, and client-provided values with explicit units and audit visibility.
6. The preset library must become more provenance-aware and parameter-aware instead of only acting as a coarse form-value loader.
7. The research-intelligence implementation must separate metadata growth from accepted reviewed evidence; 30,000 stored records must not be conflated with 30,000 accepted structured articles.
8. Structured research extraction must preserve original values, units, normalized values, and source traces, and it must extend to table/cell-aware traces before the product claims line/column/table extraction.
9. Accepted research concepts and metrics must be available to future comparison and preset services only through explicit backend-owned retrieval flows.
10. The affected UI must meet higher accessibility and visualization standards: readable text, semantic layout, visible focus, labeled charts, compact panels, and reduced scroll-heavy card stacking.

## Acceptance criteria

- [ ] `specs/030-client-dashboard-research-intelligence/` contains `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, `research.md`, and planning-only notes under `contracts/`.
- [ ] The local runtime exposes a guarded evaluation reset path and it can clear saved evaluations in the dev database without touching warehouse records or auth users.
- [ ] `/dashboard` presents compact, decision-relevant client status instead of synthetic oversized count graphs.
- [ ] Reports are available in the dashboard workspace and `/reports` remains a safe fallback with obvious dashboard/back navigation.
- [ ] `/evaluations` renders a clean, useful empty state after the reset path is run.
- [ ] The feature pack documents a canonical parameter-state model covering defaults, exclusion, units, rationale, and audit visibility.
- [ ] The feature pack documents the real research architecture gap between stored metadata and accepted structured article evidence, including table/cell trace requirements.
- [ ] The research API and admin workspace expose a 30,000-record MFC/MEC backfill preset, queue scripts, and warehouse progress reporting.
- [ ] Focused tests cover the dashboard/report/evaluation reset slice that lands first.

## Guardrails

- Keep domain semantics in `bioelectrochem_agent_kit/domain/`.
- Keep validation, serialization, and API-facing shapes in `bioelectro-copilot-contracts/contracts/` and `packages/domain-contracts/`.
- Keep route handlers thin and move business logic into shared packages or backend presenters/services.
- Do not represent unreviewed or pending research as accepted decision evidence.
- Do not hide defaults, excluded parameters, missing critical fields, or confidence penalties.

## Clarifications and resolved decisions

- "Clean all evaluation registry" means a guarded local-development deletion path for saved evaluations and cascade-owned runtime artifacts.
- "30,000 articles" means build the queueing, ingestion, review, and traceability pipeline first; do not fake 30,000 accepted structured articles.
- Reports should live inside the dashboard workspace while `/reports` remains as a clear route fallback.

## Risks / unknowns

- Provider metadata availability, rate limits, and missing full text can slow progress toward a genuinely useful 30,000-record warehouse.
- Table-aware extraction and cell-level provenance likely require new storage and extractor tooling beyond the current text-span model.
- The parameter-control UX touches runtime contracts, audit semantics, presets, and evaluation normalization, so it should not be rushed as a browser-only convenience layer.
