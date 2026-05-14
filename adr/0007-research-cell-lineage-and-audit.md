# ADR 0007 — Research Cell Lineage and Audit

## Status

Proposed (spec 037, Phase 0).

## Context

`ResearchExtractionResult` carries a single overall status (`valid`/`invalid`) and a hand-typed answer per `(paperId, columnId)`. Empty values cannot distinguish:

- the paper did not report this measurement,
- full text is missing,
- the document failed to parse,
- a relevant table was found but did not map,
- the extractor crashed,
- the cell is queued / pending analyst review.

The audit cannot report research-cell coverage funnel stages, and the UI cannot render honest empty-state labels.

## Decision

1. Extend `researchExtractionResultSchema.normalized_payload.cells[]` with per-cell `status`, `missingReason`, `evidenceTrace[]`, `confidence`, and `extractorVersion` (see `contracts/research-cell-coverage.md`).
2. Cell status enum: `filled_with_trace | filled_without_enough_trace | not_reported_by_paper | full_text_missing | document_parse_failed | table_detected_but_no_match | extraction_failed | queued | needs_analyst_review`.
3. Deterministic extractor derives status honestly from input availability (artifact, blocks, tables, retrieval signal).
4. Persistence v1 stays inside `ResearchExtractionResult.normalizedPayload` JSON (no migration). v2 introduces a `ResearchReviewCell` table if uniqueness, history, or fast joins are required.
5. `[paperId, columnId]` uniqueness on `ResearchExtractionResult` is unchanged in v1 — overwrite semantics persist. Cell-history is deferred.
6. `take: 12` source-chunk cap in `packages/database/scripts/prune-research-warehouse.ts` is raised to a CLI-controlled default of 64; trace fidelity is now an honest knob.

## Alternatives

- **New `ResearchReviewCell` table immediately**: rejected v1; adds migration and write paths without proven necessity.
- **Boolean missing flags**: rejected; cannot express the nine-state distinction.

## Consequences

- Audit gains a real research-cell funnel.
- UI surfaces honest empty-state chips and trace tooltips.
- Extractor output is slightly larger (cells[] grows linearly with columns).
- Old consumers still see the legacy fields; new fields are optional.

## Validation

- `tests/runtime/research-cell-coverage.test.ts` exercises ≥6 enum values.
- `pnpm run research:coverage-report` reports per-status counts (Phase 8).
- Regression invariants enforced in tests (see spec 037 § Acceptance).
