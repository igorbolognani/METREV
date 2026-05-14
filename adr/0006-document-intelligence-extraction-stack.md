# ADR 0006 — Document Intelligence Extraction Stack

## Status

Proposed (spec 037, Phase 0).

## Context

`packages/research-intelligence/src/fulltext/source-content.ts` parses PDFs via hand-rolled regex over `<<...>>stream/endstream` plus `inflateSync` for FlateDecode streams. It produces a single page=1, no block typing, no bounding boxes, no tables, and 900-character block caps. As a result:

- Research-cell missing reasons cannot be distinguished honestly (`full_text_missing` vs `document_parse_failed` vs `not_reported_by_paper` collapse).
- The audit cannot report parsed-document funnel stages.
- Deterministic extraction cannot benefit from table-first metric retrieval.

## Decision

1. Introduce `packages/document-intelligence/` as a TypeScript-first package owned by this repo (no new permanent service).
2. Use `pdfjs-dist` for layout-aware text/table extraction; fall back to `unpdf` only if `pdfjs-dist` size/runtime is problematic for the worker. Final choice confirmed by a fixture spike during Phase 5 implementation.
3. Output a versioned `DocumentParseResult` (`docintel-v1`), persisted as JSON inside `SourceArtifactRecord.metadataQuality.documentIntelligence` and referenced by `SourceTextChunkRecord.metadata.documentBlockId`. No Prisma migration in v1.
4. Behind opt-in env `METREV_DOCINTEL_ENABLED` while fixtures stabilize.
5. Table extraction v1 is heuristic (y-band clustering + x-gap splitting). Confidence per table; `headerInferred` flag. UI surfaces low-confidence cells but never silently promotes them.
6. OCR is out of scope v1; image-only PDFs produce `warnings: ["requires_ocr"]`.

## Alternatives

- **Keep hand-rolled parser**: rejected; provably insufficient.
- **`pdf-parse`**: rejected; text-only, no layout.
- **Python sidecar (e.g. `pdfplumber`)**: deferred. Would output versioned JSON; allowed if TS quality is inadequate after Phase 5, documented in a follow-up ADR.
- **Normalize document tables into Prisma immediately**: rejected v1; JSON-first keeps schema migrations out of the critical path while we iterate.

## Consequences

- New dependency (`pdfjs-dist` or `unpdf`).
- `metadataQuality` JSON grows by ~10–100 KB per parsed artifact (acceptable; OA-only).
- Provenance becomes auditable end-to-end once Phases 5+6 land.
- v2 normalization path tracked in `contracts/document-intelligence-model.md`.

## Validation

- Fixture parser tests under `tests/runtime/document-intelligence/`.
- `pnpm run pdf:inspect -- <artifactId>` (Phase 8) reports parser status, page/block/table counts, warnings.
