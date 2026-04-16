# Feature Specification — External Evidence Ingestion Foundation

## Objective

Introduce an explicit external-evidence catalog and ingestion-run foundation so free scholarly metadata can start entering the database automatically without being mixed into case-scoped decision evidence before review.

## Why

The current runtime persists evidence only in case-centric structures. That is insufficient for broad automatic ingestion because it lacks source identity, freshness, dedupe, run tracking, and review state.

## Primary users

- analysts and reviewers who need imported evidence to remain auditable before use
- maintainers building future supplier, company, and market-data ingestion adapters

## Affected layers

- domain semantics: no ontology rewrite in this slice
- contract boundary: no public API contract change intended in this first foundation pass
- runtime adapters: additive database ingestion scripts only
- UI: no direct analyst UI change in this slice
- infrastructure: Prisma schema and local ingestion commands
- docs and workflow: maintained feature pack for the ingestion foundation

## Scope

### In

- add first-class storage for external sources, catalog evidence items, and ingestion runs
- add OpenAlex and Crossref literature-ingestion scripts as the first live source adapters
- keep imported records reviewable and separate from active decision flows

### Out

- auto-attaching imported evidence to evaluation runs
- supplier/company and market-data live adapters in this first pass

## Functional requirements

1. The runtime must be able to persist externally imported source metadata with stable source identity and dedupe keys.
2. The runtime must track ingestion runs explicitly with source type, query, status, and record counts.
3. Imported literature metadata must enter a review-pending catalog rather than appearing as validated decision evidence automatically.

## Acceptance criteria

- [x] Prisma schema includes additive models for external source records, catalog evidence items, and ingestion runs.
- [x] OpenAlex and Crossref ingestion commands can import literature metadata into the new catalog tables.
- [x] Automated tests cover the normalization logic for the first live source adapters.
- [x] Current evaluation, history, auth, and local-view flows remain unchanged.

## Clarifications and open questions

- This slice starts the broader ingestion program through literature metadata first because it has the strongest provenance posture.
- Market or supplier claims remain future adapters because they need stronger semantics and review rules than this first pass provides.

## Risks / unknowns

- Without review-state discipline, imported metadata could be mistaken for validated engineering evidence.
- External APIs can drift or rate-limit, so source adapters should remain small and replaceable.
