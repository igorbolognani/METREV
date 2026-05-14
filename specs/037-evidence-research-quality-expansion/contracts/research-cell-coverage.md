# Contract Note — Research Cell Coverage

Planning-only document. Canonical owner: `packages/domain-contracts/src/schemas.ts` (`researchExtractionResultSchema.normalized_payload.cells[]`). Source-of-truth domain semantics: `bioelectrochem_agent_kit/domain/`.

## Cell record

| field              | type                     | notes                                  |
| ------------------ | ------------------------ | -------------------------------------- |
| `paperId`          | string                   | FK `ResearchReviewPaper.id`            |
| `reviewId`         | string                   | FK `ResearchReview.id`                 |
| `columnId`         | string                   | FK `ResearchReviewColumn.id`           |
| `outputSchemaKey`  | string                   | mirror of column's schema key          |
| `valueDisplay`     | string \| null           | for analyst UI                         |
| `normalizedValue`  | number \| string \| null | per column spec                        |
| `unit`             | string \| null           | normalized unit token                  |
| `status`           | enum (below)             | required                               |
| `missingReason`    | enum (below)             | required when status is missing/failed |
| `confidence`       | number 0..1              |                                        |
| `evidenceTrace[]`  | EvidenceTrace            |                                        |
| `extractorVersion` | string                   | e.g. `research-deterministic-v1`       |
| `createdAt`        | ISO-8601                 |                                        |
| `updatedAt`        | ISO-8601                 |                                        |

## Cell status enum

- `filled_with_trace` — value present, ≥1 evidence trace.
- `filled_without_enough_trace` — value present, no/weak trace (advisory only; UI must label).
- `not_reported_by_paper` — full text inspected, paper did not report this datum.
- `full_text_missing` — could not read full text (no artifact / unsupported).
- `document_parse_failed` — artifact present but parser failed or yielded no blocks.
- `table_detected_but_no_match` — parser found tables, none mapped to this column.
- `extraction_failed` — extractor crashed / Zod failed.
- `queued` — extraction pending.
- `needs_analyst_review` — extractor flagged low-confidence or ambiguous answer.

## MissingReason enum

Same labels as status (excluding `filled_*`). Required for any non-filled status.

## EvidenceTrace

| field             | type         | notes                      |
| ----------------- | ------------ | -------------------------- |
| `artifactId`      | string?      | when known                 |
| `chunkId`         | string?      | `SourceTextChunkRecord.id` |
| `documentBlockId` | string?      | `${page}:${index}`         |
| `documentTableId` | string?      | `${page}:t${index}`        |
| `tableCell`       | `{row,col}?` | when table-derived         |
| `quote`           | string       | excerpt                    |
| `hash`            | string       | sha256(quote)              |

## Derivation rules (deterministic extractor v1)

- artifact absent → `full_text_missing`.
- artifact present, no blocks/chunks → `document_parse_failed`.
- blocks present, no signal in retrieval window → `not_reported_by_paper`.
- tables detected but no column match → `table_detected_but_no_match`.
- Zod validation fails on extracted answer → `extraction_failed`.
- value parsed but no quote/trace captured → `filled_without_enough_trace`.
- value parsed + trace captured → `filled_with_trace`.
- Confidence < 0.4 → also flag `needs_analyst_review` (alongside main status).

## Invariants

- `filled_with_trace` requires ≥1 `evidenceTrace` whose `quote` hash matches a `documentBlock.hash` or `chunk` hash.
- `not_reported_by_paper` requires evidence of full-text inspection (at least N blocks parsed; configurable; default 5).
- Metadata-only signal (abstract/title) is never `filled_with_trace` for performance-metric columns; it may be `filled_without_enough_trace`.
