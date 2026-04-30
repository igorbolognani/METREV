# Plan - TRAMPOLINe-Aligned Metadata And Evidence Intelligence

## Summary

Deliver 022 as a full evidence-intelligence slice: document the strategic alignment, extend canonical vocabulary and contracts, seed TRAMPOLINe/context evidence, add local PDF ingestion, and expose metadata/veracity signals through existing research and evidence surfaces.

## Key Changes

- Add source-artifact and source-text-chunk persistence linked to `ExternalSourceRecord`.
- Add metadata quality and evidence veracity runtime schemas, contracts, and scoring helpers.
- Add local PDF import through CLI and analyst-gated API, using `pdfinfo`/`pdftotext` when available.
- Add curated TRAMPOLINe seed manifest and script wrapper.
- Extend research review UI with local PDF import and evidence explorer with metadata/veracity facets.

## Testing

- Contract vocabulary checks for metadata taxonomy, veracity schema, source artifact contracts, and expanded metric rules.
- Runtime tests for metric normalization, metadata scoring, and source-artifact schema validation.
- API tests for analyst-gated local source import with memory repository.
- UI tests for local PDF import controls and metadata/veracity disclosure.
- Validation through `pnpm run test:fast`, `pnpm run test:advanced`, `pnpm run lint`, and `pnpm run build`.
