# Feature Specification — Evidence Intelligence Workspace

> 020 reconciliation note: this feature is an Advanced/Internal evidence instrument. The evidence explorer and evidence assistant remain useful warehouse-facing tools, but they are not the final client-facing report conversation feature. Report-grounded conversation is owned by `specs/020-metrev-three-phase-product-plan/`.

## Objective

Implement the next METREV evidence-intelligence wave as a durable workspace feature pack, now expanded to include a dedicated explorer backend contract, warehouse-scoped filtered facets and metrics, explorer CSV export, a local-first evidence assistant with explicit fallback semantics, and conservative historical-doc cleanup alongside the navigable explorer and tabbed evidence-detail workbench.

## Why

The repository already stores and presents external evidence, but the active web surface was still centered on analyst review workflow rather than read-first exploration. The user asked for a broader evidence-intelligence product with structured tables, better navigation, local-first operation, and conservative cleanup. This feature pack now covers the first explorer wave plus the immediate follow-through needed to keep the explorer honest and operationally useful.

## Primary users

- analysts exploring, triaging, and attaching evidence to decision runs
- engineering reviewers checking provenance, review posture, and audit disclosures before evidence is trusted downstream

## Affected layers

- domain semantics: preserve the canonical bioelectrochemical vocabulary and evidence semantics without introducing a second ontology
- contract boundary: keep canonical domain and hardened contract surfaces authoritative while adding a runtime explorer-specific workspace schema where the reused review payload became too narrow
- runtime adapters: add a dedicated explorer presenter, route, query parser, and CSV export while reusing the current evidence catalog repository
- UI: add a dedicated explorer route and improve evidence-detail navigation with tabbed sections
- UI: surface warehouse-scoped filtered facets, grouped tables, current-slice export actions, and an explicit evidence assistant without hiding review posture or provenance
- infrastructure: keep local-first warehouse workflows intact while enabling an honest Ollama-backed assistant path with deterministic fallback
- docs and workflow: maintain the 018 feature pack as the execution umbrella for this wave and consolidate historical cleanup notes into a maintained docs surface

## Scope

### In

- create the 018 feature pack with spec, plan, tasks, quickstart, and research notes
- ship a dedicated evidence explorer route using the current persisted evidence catalog and server-backed filters
- promote a dedicated runtime explorer workspace contract and CSV export surface
- render warehouse-scoped filtered facets and grouped tables in the explorer UI
- add a dedicated evidence-explorer assistant route and UI surface with explicit provenance and uncertainty fields
- convert the evidence detail page into a tabbed workbench so claims, provenance, and stored payloads are easier to inspect
- extract useful context from historical cleanup notes into maintained docs and retire the redundant root copies

### Out

- immediate Prisma or hardened canonical contract migration beyond the current runtime adapter expansion for warehouse aggregates
- hidden evidence intake or opaque LLM reasoning without explicit analyst review, provenance, and fallback metadata

## Functional requirements

1. The web workspace must expose a dedicated evidence explorer route that lets users search, filter, paginate, and open evidence detail records without entering batch-review mode first.
2. The evidence-detail surface must separate overview, claims, provenance, and payload disclosures into tabs while keeping review controls explicit.
3. The explorer backend must expose a dedicated runtime contract and CSV export once grouped tables, slice facets, and explorer-specific metadata exceed what the review workspace can represent cleanly.
4. Explorer facets and summary cards must be computed from the filtered warehouse in the repository layer rather than inferred from the current paginated page slice.
5. Historical cleanup notes must be preserved in a maintained background surface before redundant root copies are retired.
6. The explorer must expose a dedicated evidence assistant surface that keeps provenance, uncertainty, cited rows, and fallback metadata explicit.
7. The feature pack must explicitly record what is shipped now and what remains open for later slices such as richer evidence reasoning and deeper warehouse analytics.

## Acceptance criteria

- [x] `specs/018-evidence-intelligence-workspace/` contains `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, and `research.md`.
- [x] The web app exposes `/evidence/explorer` and `/evidence/explorer/[id]` as navigable routes wired into global navigation and breadcrumbs.
- [x] The explorer route uses server-backed search, source-type filtering, status slicing, pagination, and direct links into evidence detail.
- [x] The API exposes a dedicated explorer workspace route and CSV export route with additive runtime schema coverage.
- [x] The explorer UI renders warehouse-scoped filtered facets, grouped tables, and a current-slice CSV export action from the dedicated explorer contract.
- [x] The API and UI expose a dedicated evidence assistant surface with explicit provenance, uncertainty, cited-row disclosure, and local-first fallback metadata.
- [x] The evidence-detail page presents a tabbed workbench for overview, claims, provenance, and payload disclosures.
- [x] Historical cleanup context has been consolidated into a maintained docs surface before redundant root notes were removed.
- [x] Focused regression coverage validates runtime explorer routes, explorer rendering, API client wiring, and tabbed detail rendering.

## Clarifications and open questions

- The warehouse remains the operational source of truth for evidence records in this slice; canonical domain and hardened contract layers remain authoritative for semantics and boundaries.
- The dedicated explorer workspace contract is a runtime adapter contract, not a replacement for the canonical domain or hardened YAML contract owners.
- Explorer facets and headline metrics are warehouse-scoped for the active filter set, while grouped tables and spotlight rows remain intentionally page-scoped.
- Conservative cleanup is complete for the identified historical notes because their useful content was extracted before removal.

## Risks / unknowns

- Richer citation analytics, evidence clustering, and cross-page ranking still require repository-level expansion beyond this slice.
- The local-first assistant remains conservative by design; it summarizes the supplied warehouse slice and spotlight rows but does not replace analyst review or deterministic evidence validation.
