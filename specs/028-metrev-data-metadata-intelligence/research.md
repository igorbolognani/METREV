# Research Notes — METREV Data Metadata Intelligence

## Goal

Distill valid theory and practice from the three local metadata-related PDFs
into METREV-owned data and metadata behavior without storing article text or
document derivatives in the repository.

## Questions

- Which concepts belong in domain semantics versus runtime implementation?
- Which article-derived ideas should affect metadata quality, evidence veracity, readiness, and bioelectrochemical review workflows?

## Inputs consulted

- docs: repository authority map, active instructions, and the prior `022` feature pack
- repo files: domain taxonomy, research contracts, local-source ingestion, deterministic extraction, evidence-pack propagation, and current tests
- experiments: temporary local-PDF availability check and extraction during implementation, with no committed article text

## Findings

- The three PDFs are available locally but are not versioned in the repository, which fits the existing rule that copyrighted full text should stay in local persistence.
- The repository already contains the right abstraction layers for metadata quality, evidence veracity, local PDF chunking, traceable extraction, and decision-ingestion preview.
- The useful article-derived concepts are operational rather than documentary: signal generation metadata, signal quality metadata, contextual annotations, data lineage, access and licensing, review state, and explicit readiness for downstream decision use.
- Metadata-oriented context sources should be allowed to strengthen methodology and readiness understanding while still receiving a penalty when used as validated stack performance evidence.
- MFC, MEC, MET, BES, wastewater treatment, resource recovery, gas handling, and implementation-risk context should stay tightly connected to metadata/data readiness rather than split into a separate vocabulary.

## Decisions

- Replace the legacy external-program wording and seed artifacts with METREV-owned data and metadata readiness semantics.
- Keep the generic local PDF importer and improve its metadata categories instead of deleting it.
- Add explicit research-review extraction for metadata/data readiness rather than hiding the concept only inside source-artifact payloads.
- Do not commit PDFs, extracted article full text, or article markdown summaries.

## Open blockers

- No open blockers remain for this slice.
- Future refinements should use new reviewed source chunks rather than adding article text or document derivatives to the repository.

## Impact on plan

- Domain and contract changes are required, not just UI copy cleanup.
- Source-artifact scoring and deterministic extraction are the main implementation surfaces.
