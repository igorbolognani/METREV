# Quickstart - Research Intelligence Review Table Engine

> 020 validation note: the research tables remain an internal scientific tool. 019 now records the deterministic advanced validation matrix through `pnpm run validate:advanced` plus the focused runtime and UI checks listed below. Live provider search and provider-backed LLM extraction remain optional smoke follow-through because they depend on external services.

1. Start the validated local stack with `pnpm run local:view:start` or `pnpm run local:view:up`.
2. Sign in at `http://localhost:3012/login` as `analyst@metrev.local`.
3. Open `/research/reviews`.
4. Run a live search with a query such as `microbial fuel cell wastewater carbon felt` and confirm provider-backed results from OpenAlex, Crossref, or Europe PMC are returned.
5. Stage one or more selected papers into the canonical METREV warehouse.
6. Create a review from the staged source records and open the review detail page.
7. Run queued extraction, then add a structured custom column if the default table is insufficient.
8. Queue a warehouse backfill when you need broader corpus growth, and confirm the dedicated research worker drains queued backfills plus queued extraction jobs.
9. Build an evidence pack and inspect the decision-input preview before attaching that pack to downstream case intake.

## Validation log

- PASS `pnpm run test:advanced`: focused bootstrap, ingestion, research API, worker, and research workspace tests passed.
- PASS `pnpm run validate:advanced`: deterministic advanced matrix passed, including the curated-manifest-only big-data dry run.

The current runtime now supports live provider search from the UI, staged warehouse import, queued/resumable backfills, worker-backed extraction, and evidence-pack propagation into downstream evaluation provenance. The deterministic advanced matrix is now recorded; live provider and provider-backed LLM smoke remain optional follow-through rather than unresolved validation debt.
