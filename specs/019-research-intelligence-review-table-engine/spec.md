# Feature Specification - Research Intelligence Review Table Engine

## Objective

Add a formal literature-review table engine for microbial electrochemical technologies. The engine must create review tables from source-document metadata, run structured per-paper/per-column extraction, validate outputs, normalize supported metrics, build evidence packs, and expose decision-ingestion previews.

## In Scope

- research review tables backed by existing external source records
- structured default and custom columns
- deterministic MVP extraction from metadata, abstracts, and existing claims
- schema validation, evidence traces, confidence, missing-field visibility, and validation errors
- evidence-pack creation and decision-ingestion preview
- API and web surfaces for creating, viewing, extracting, and packing reviews

## Out of Scope

- live UI-triggered external paper search
- PDF upload and full-text parsing
- real background workers
- provider-backed structured LLM extraction
- automatic report/dashboard refresh from research packs

## Acceptance Criteria

- Runtime contracts expose research paper, column, extraction, table, evidence-pack, and decision-preview shapes.
- Prisma persists review tables, papers, columns, jobs, results, and evidence packs without duplicating source-document metadata.
- `/api/research` supports review creation, list/detail, column addition, extraction run, evidence-pack creation, and decision-input preview.
- `/research/reviews` and `/research/reviews/[id]` provide a usable table-first workflow.
- Deterministic fixtures and tests cover validation, normalization, extraction, evidence-pack building, API routes, and UI rendering.
