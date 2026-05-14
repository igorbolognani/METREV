# Contract Note — Document Intelligence Model (`docintel-v1`)

Planning-only document. Canonical owner: `packages/domain-contracts/src/schemas.ts` (Zod) and the new `packages/document-intelligence/src/schema.ts`. Persistence: JSON on `SourceArtifactRecord.metadataQuality.documentIntelligence` and per-chunk `SourceTextChunkRecord.metadata.documentBlockId` until v2 normalization.

## DocumentParseResult (top level)

| field              | type                           | notes                                                                                   |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| `parserVersion`    | string literal `"docintel-v1"` | bumped on breaking changes                                                              |
| `parserName`       | string                         | e.g. `"pdfjs-dist@x.y.z"`                                                               |
| `parsedAt`         | ISO-8601                       | UTC                                                                                     |
| `sourceArtifactId` | string                         | FK to `SourceArtifactRecord.id`                                                         |
| `documentHash`     | string                         | sha256 of input bytes                                                                   |
| `pages[]`          | DocumentPage                   |                                                                                         |
| `tables[]`         | DocumentTable                  | optional, low-confidence allowed                                                        |
| `warnings[]`       | string enum                    | `requires_ocr`, `encrypted`, `partial_decode`, `unknown_filter`, `table_low_confidence` |
| `confidence`       | number 0..1                    | aggregate                                                                               |

## DocumentPage

| field        | type          | notes     |
| ------------ | ------------- | --------- |
| `pageNumber` | int ≥ 1       |           |
| `width`      | number        | PDF units |
| `height`     | number        | PDF units |
| `blocks[]`   | DocumentBlock |           |

## DocumentBlock

| field            | type         | notes                                                                                                                                       |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | string       | `${pageNumber}:${index}`                                                                                                                    |
| `type`           | enum         | `title \| abstract \| section_heading \| paragraph \| list_item \| table_ref \| figure_caption \| reference \| footer \| header \| unknown` |
| `text`           | string       | raw                                                                                                                                         |
| `normalizedText` | string       | whitespace-collapsed, unicode-normalized                                                                                                    |
| `hash`           | string       | sha256(normalizedText)                                                                                                                      |
| `line`           | int?         | when derivable                                                                                                                              |
| `bbox`           | `[x,y,w,h]?` | when derivable                                                                                                                              |
| `confidence`     | number 0..1  |                                                                                                                                             |
| `warnings[]`     | string       | per-block                                                                                                                                   |

## DocumentTable

| field            | type              | notes                                     |
| ---------------- | ----------------- | ----------------------------------------- |
| `id`             | string            | `${pageNumber}:t${index}`                 |
| `page`           | int               |                                           |
| `caption`        | string?           | nearby paragraph if detected              |
| `headerInferred` | boolean           |                                           |
| `rows[][]`       | DocumentTableCell | row-major                                 |
| `confidence`     | number 0..1       | low-confidence allowed; corpus tools warn |

## DocumentTableCell

| field            | type   | notes |
| ---------------- | ------ | ----- |
| `text`           | string |       |
| `normalizedText` | string |       |
| `rowIndex`       | int    |       |
| `colIndex`       | int    |       |
| `hash`           | string |       |

## Persistence path v1

- `SourceArtifactRecord.metadataQuality.documentIntelligence = DocumentParseResult` (whole snapshot).
- `SourceTextChunkRecord.metadata.documentBlockId = "<page>:<index>"` to tie a chunk to a block.
- `SourceTextChunkRecord.metadata.documentTableId` when chunk text came from a table cell range.

## v2 normalization (deferred)

Optional Prisma models: `DocumentParseRun`, `DocumentPage`, `DocumentBlock`, `DocumentTable`, `DocumentTableCell`. Decision tied to whether (a) JSON sizes exceed practical limits, (b) audit needs joins, (c) cell-history is required.
