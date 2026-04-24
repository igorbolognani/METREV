# Research Notes - Research Intelligence Review Table Engine

## Decision

Use the existing evidence warehouse as the first paper source rather than introducing live external search in the first implementation slice.

## Rationale

The repository already has OpenAlex, Crossref, Europe PMC, curated-manifest ingestion, source-document persistence, evidence claims, and analyst review gates. Building the review table on top of those records gives deterministic tests and preserves provenance.

## Deferred Integrations

- OpenAlex/Crossref/Semantic Scholar search from the UI
- Unpaywall and PDF upload
- structured provider-backed LLM extraction
- async workers and queue observability

## Risk

The main risk is schema drift between research-specific terms and the decision engine. The MVP keeps research terms in dedicated research taxonomy/contracts and emits existing `RawEvidenceRecord` shapes at the decision adapter boundary.
