# Feature Specification - Evidence Readiness Cleanup

## Objective

Make the evidence and research workspaces internally consistent by removing stale route exposure, distinguishing accepted evidence from table-ready evidence, lawfully enriching full-text coverage, and surfacing extracted technical parameters in the evidence detail and research-table UI.

## Why

METREV already stores accepted external evidence, canonical facts, benchmarks, source artifacts, and research extraction rows, but the current UI still exposes duplicate route families and treats accepted records as if they were uniformly ready for technical comparison. The product needs a stricter readiness boundary so analysts only see curated microbial electrochemical papers that can actually fill the research-table structure with values, units, traces, and explicit missing-data explanations.

## Primary users

- Analysts who review external evidence, inspect canonical facts, and build research tables from technical literature.
- Administrators who curate the evidence warehouse, monitor readiness gaps, and validate lawful full-text acquisition.

## Affected layers

- domain semantics: evidence discovery and acquisition policy remain the semantic source of truth.
- contract boundary: enriched evidence-detail and readiness-report payloads.
- runtime adapters: repository queries, API routes, and extraction orchestration.
- UI: canonical admin intelligence navigation, evidence detail, research tables, and state-aware empty labels.
- infrastructure: local database audit scripts and local-view restart/validation.
- docs and workflow: new feature pack and updated operator guidance.

## Scope

### In

- New feature pack under `specs/036-evidence-readiness-cleanup/`.
- Removal of stale top-level Evidence/Research route exposure from active navigation and admin cards.
- Compatibility redirects from old evidence/research pages to canonical `/admin/intelligence/...` routes.
- Enriched evidence detail payloads that expose canonical facts, benchmark records, and source-text readiness.
- A readiness audit/report that classifies accepted evidence records by table-readiness.
- Lawful full-text acquisition hardening using only open-access or analyst-provided local artifacts.
- Corpus curation, re-canonicalization, benchmark refresh, and research extraction reruns on the curated set.
- UI improvements that show extracted values, units, traces, and state-aware missing-data explanations.

### Out

- Sci-Hub, paywall bypassing, or any other copyright-violating acquisition path.
- Rule-engine scoring-weight changes.
- A full rewrite of deterministic extraction heuristics unrelated to readiness or source-text coverage.

## Functional requirements

1. The system MUST treat `/admin/intelligence/...` as the canonical evidence and research workspace surface while preserving old routes only as compatibility redirects.
2. The system MUST distinguish `accepted` evidence from `table-ready` evidence in reports, queues, and research review creation.
3. The evidence detail API MUST expose canonical scientific facts, benchmark records, and source-text readiness when they exist.
4. The system MUST use only lawful full-text acquisition strategies already supported by repository policy: open-access provider links, publisher OA URLs, and analyst-provided local artifacts with explicit access and license metadata.
5. The system MUST provide a readiness report or equivalent diagnostic that can drive keep, reacquire, rerun extraction, reject, quarantine, or delete decisions for accepted records.
6. Research tables MUST render extracted technical values, units, confidence, and traces for retained papers, and MUST explain when data is absent because it is not stated, not extracted, or missing full text.
7. The final curated evidence set MUST be limited to technical microbial electrochemical papers that fit the METREV structure well enough to populate Overview plus at least one Reactor/Materials and one Metrics/Outputs area.

## Acceptance criteria

- [x] `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, and `research.md` exist and agree.
- [x] Analyst/admin navigation no longer advertises the old top-level Evidence/Research routes as primary destinations.
- [x] `/evidence`, `/evidence/review`, `/evidence/quality`, and `/research` redirect to canonical admin intelligence routes.
- [x] An admin intelligence route exists for evidence quality.
- [x] The evidence detail contract and API include canonical facts, benchmark rows, and source-text readiness.
- [x] A readiness report or equivalent diagnostic can classify accepted catalog items by technical suitability.
- [x] Lawful acquisition checks reject closed, unknown-license, or piracy-style full-text sources.
- [x] Curated records are reprocessed so retained papers expose better extracted values, units, and traces in research tables.
- [x] Focused runtime, UI, Postgres, and local-view validations pass.

## Clarifications and open questions

- `accepted` remains the reviewed catalog state; `table-ready` is a stricter operational subset derived from readiness checks and extraction outcomes.
- Source artifacts and text chunks count as full-text evidence when they are traceable and locally lawful, even when upstream PDF/XML URLs are absent.
- Broad review articles may remain useful as background evidence, but they are not automatically table-ready if they lack reactor-level numeric detail.

## Risks / unknowns

- Curating for table-readiness will likely reduce the accepted corpus below the current count.
- Some records may already have useful canonical facts that the UI cannot show until the detail contract is extended.
- Research-table sparsity can come from both weak source text and incomplete rendering, so the implementation must validate both layers separately.
