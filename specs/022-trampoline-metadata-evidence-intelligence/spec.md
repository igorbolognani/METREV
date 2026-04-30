# Feature Specification - TRAMPOLINe-Aligned Metadata And Evidence Intelligence

## Objective

Align METREV with the TRAMPOLINe industrial-adoption ecosystem by adding an auditable metadata and veracity layer, a curated TRAMPOLINe/MFC/MEC evidence map, and local PDF source ingestion for metadata-rich water-sector references.

## Scope

### In

- Audit and roadmap comparing METREV with TRAMPOLINe-style industrial adoption needs.
- Canonical metadata taxonomy for signal generation, signal quality, contextual annotations, data lineage, access/licensing, and review state.
- Expanded research taxonomy and metric normalization for MFC, MEC, and broader MET evidence.
- Curated TRAMPOLINe-aligned seed manifest covering ecosystem/project-scope records and metadata PDFs.
- Local PDF import by analyst-gated API and CLI path, with file hash, source artifact metadata, extracted text chunks, and evidence trace locators.
- Evidence veracity scoring that keeps confidence penalties visible in warehouse, review, extraction, pack, and report-adjacent contexts.

### Out

- Treating TRAMPOLINe project pages as validated stack-performance evidence.
- Committing raw PDFs or full extracted copyrighted text into the repository.
- Replacing the existing source-document warehouse, research reviews, or case-intake evidence-pack path.

## Functional Requirements

1. METREV must represent TRAMPOLINe as strategic ecosystem evidence and industrial-adoption context, not as proof of a particular reactor/material design.
2. Metadata quality must be inspectable separately from claim confidence.
3. Local PDFs must be imported with source-artifact records, page/chunk locators, hash dedupe, access/license posture, and missing-metadata flags.
4. Evidence scoring must expose component scores for source rigor, metadata completeness, measurement quality, extraction method, trace quality, normalization support, review status, relevance, recency/context fit, and corroboration/conflict.
5. Research/evidence UI must make TRAMPOLINe, MFC, MEC, metadata-quality, and source-artifact signals easy to filter and inspect.

## Acceptance Criteria

- [x] Feature pack exists with spec, plan, tasks, quickstart, audit roadmap, and contract notes.
- [x] Domain and contract files define metadata quality, source artifacts, source chunks, veracity scoring, expanded research applications, and expanded MET metrics.
- [x] `ingest:trampoline-seed` imports curated project/context records and metadata PDF references.
- [x] `ingest:local-pdf` imports one or more local PDFs into `ExternalSourceRecord`, source artifact, source chunks, catalog item, and claims.
- [x] API exposes analyst-gated local source import and source-artifact detail retrieval.
- [x] Evidence/research UI shows local PDF import controls, imported source metadata, metadata quality, and veracity signals.
- [x] Focused contract, runtime, API, and UI tests cover the new paths.
