# Research Notes — External Evidence Ingestion Foundation

## Goal

Identify the safest first automatic-ingestion slice that can start filling the database with useful external evidence without undermining provenance or the current deterministic runtime.

## Questions

- Which free sources are suitable for metadata-first literature ingestion right now?
- What storage foundation is missing from the current case-centric evidence model?

## Inputs consulted

- docs: OpenAlex developer overview and Crossref REST API documentation
- repo files: current Prisma schema, evaluation persistence, and typed-evidence runtime shape
- experiments: evaluation flow remains case-centric and does not yet expose a shared catalog or review state

## Findings

- OpenAlex and Crossref both support metadata-first literature ingestion with source identity, titles, publishers, dates, and abstracts or abstract-like fields.
- The current evidence model is case-scoped and cannot safely absorb broad external ingestion without first-class source identity, run tracking, dedupe, and review state.
- A literature-first foundation is the safest first live adapter because it has a stronger provenance posture than supplier or market data.

## Decisions

- Start with OpenAlex and Crossref literature metadata ingestion.
- Keep imported evidence separate from active evaluation flows and mark it review-pending by default.
- Model broader future source types now in the additive enums, but do not ship live supplier or market adapters in this slice.

## Open blockers

- Crossref live ingestion validated successfully with a small query during this implementation pass.
- OpenAlex live ingestion validated successfully with a small query after materializing `OPENALEX_API_KEY` in the ignored workspace `.env`; the command fetched 2 records and stored 2 records.
- Imported catalog records are now surfaced in the analyst UI and can be attached to evaluations through the explicit analyst-reviewed intake gate delivered in the follow-on slice.

## Impact on plan

- The database foundation must land before any future supplier or market-data automation.
- The first live commands should stay small, query-driven, and manual rather than background-scheduled.
