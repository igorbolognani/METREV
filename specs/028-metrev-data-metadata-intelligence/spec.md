# Feature Specification — METREV Data Metadata Intelligence

## Objective

Replace the legacy external-program evidence slice with METREV-owned data and
metadata intelligence that actively improves local-source ingestion,
research extraction, evidence review, and decision-support confidence.

## Why

METREV already has the right runtime spine for local-source ingestion,
chunked provenance, metadata quality, evidence veracity, and research
evidence packs. What still remains is a legacy external-program label, a
legacy curated seed, and a document-centric framing for three PDFs
that should instead inform the product's native treatment of data,
metadata, signal quality, lineage, and decision-use readiness.

## Primary users

- analysts reviewing literature and local PDF evidence for MFC, MEC, MET, and BES cases
- maintainers responsible for keeping domain semantics, contract boundaries, and runtime behavior aligned

## Affected layers

- domain semantics: research taxonomy and metadata taxonomy
- contract boundary: research metadata quality, evidence veracity, and source artifact schemas
- runtime adapters: local PDF ingestion, deterministic extraction, evidence pack propagation
- UI: research review local-source copy and defaults
- infrastructure: none
- docs and workflow: retire the old feature pack and replace it with a METREV-owned one

## Scope

### In

- remove active repository mentions and artifacts tied to the legacy external program
- replace project-specific context scoring with generic context-reference and metadata-methodology treatment
- operationalize article-derived concepts as METREV-owned metadata/data readiness behavior
- add or update research-review extraction output for data and metadata readiness
- add regression coverage that blocks reintroduction of the old label and article-default filenames in active source files

### Out

- committing PDFs, extracted full text, or article markdown summaries to the repository
- deleting a developer's already-ingested local database records
- broad UI redesign unrelated to research and evidence workflows

## Functional requirements

1. Active source files must no longer mention the retired external-program label or ship a dedicated legacy seed flow.
2. The three local PDFs must be treated only as temporary extraction inputs, not as repository documents or default workflow examples.
3. Metadata quality and evidence veracity must remain separate, with generic penalties for context/reference sources used as performance evidence.
4. Research extraction must expose METREV-owned data and metadata readiness signals with explicit evidence traces, missing fields, and confidence.
5. Evidence packs and decision-ingestion preview must propagate metadata readiness, missing data, and confidence penalties without hiding defaults or gaps.

## Acceptance criteria

- [x] Active source files no longer contain the retired external-program label or the old seed/manifest names.
- [x] The old `022` feature pack is removed and replaced by this `028` feature pack.
- [x] Domain and contract files express METREV-owned metadata/data readiness semantics without external project vocabulary.
- [x] Local PDF import and research extraction still work after the refactor, with focused runtime tests passing.
- [x] No PDF, extracted article full text, or article markdown derivative is committed.

## Clarifications and open questions

- The local PDFs may be read during implementation if they exist on disk, but the repository should keep only distilled behavior and rules.
- The runtime should keep the generic local-source import capability rather than removing it along with the old seed.

## Risks / unknowns

- Overfitting the new semantics to these three sources would recreate a hidden external dependency instead of a product-native model.
- Removing the old seed and label without replacing the generic scoring and extraction behavior would leave a gap in metadata/evidence handling.
