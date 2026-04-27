# Feature Specification - Research Intelligence Review Table Engine

## Objective

Add a formal literature-review table engine for microbial electrochemical technologies. The engine must search external providers live, stage selected results into the canonical source-document warehouse, queue resumable warehouse backfills, create review tables from staged metadata, run structured per-paper/per-column extraction with full-text hydration and provider-backed LLM support, validate outputs, normalize supported metrics, build evidence packs, and expose decision-ingestion previews that can be attached to downstream evaluations.

## In Scope

- live UI-triggered external paper search across supported providers
- queued warehouse backfills for supported providers using the same canonical evidence model
- staged import of selected search results into the canonical `ExternalSourceRecord` and evidence-catalog warehouse model
- research review tables backed by existing or newly staged external source records
- structured default and custom columns
- deterministic and provider-backed extraction from metadata, abstracts, hydrated full text, and existing claims
- schema validation, evidence traces, confidence, missing-field visibility, and validation errors
- evidence-pack creation and decision-ingestion preview
- dedicated background worker support for queued backfills and queued extraction jobs
- API and web surfaces for creating, viewing, extracting, queueing backfills, and packing reviews
- case-intake propagation of research evidence packs into the existing evaluation lineage model

## Out of Scope

- manual local PDF upload beyond provider-hosted full-text links
- automatic dashboard/report refresh without routing the evidence pack through case intake or evaluation persistence

## Acceptance Criteria

- Runtime contracts expose research paper, column, extraction, table, evidence-pack, and decision-preview shapes.
- Runtime contracts expose queued research-backfill request and summary shapes.
- Prisma persists review tables, papers, columns, jobs, results, and evidence packs without duplicating source-document metadata.
- `/api/research` supports live paper search, staged import, queued backfill list/enqueue, review creation, list/detail, column addition, extraction run, evidence-pack creation, and decision-input preview.
- `/research/reviews` and `/research/reviews/[id]` provide a usable search-to-table workflow plus queue visibility for long-running warehouse growth.
- The dedicated research worker drains queued backfills and extraction jobs against the shared repository interfaces.
- Extraction uses deterministic normalization by default, adds hydrated full-text context when available, and invokes the configured provider-backed structured extraction path for `llm_extracted` columns when credentials are present.
- Research evidence packs can be attached during case intake so the downstream evaluation persistence layer records research-source usage without inventing a second attachment vocabulary.
- Deterministic fixtures and tests cover validation, normalization, extraction, evidence-pack building, API routes, worker execution, and UI rendering.
