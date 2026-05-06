# Research Notes - Full-Text Research Intelligence

## Goal

Confirm the concrete operational starting point for closing the remaining `034` scope without inventing new infrastructure that the repository does not already have.

## Questions

- Which parts of the `034` plan already exist as runnable repo commands and runtime surfaces?
- What is the first implementation gap that blocks credible whole-warehouse execution against the linked warehouse already present in the local environment?

## Inputs consulted

- docs:
  - `README.md`
  - `docs/repository-authority-map.md`
  - `docs/runtime-tooling-setup.md`
  - `.github/copilot-instructions.md`
  - `AGENTS.md`
- repo files:
  - `package.json`
  - `packages/database/package.json`
  - `packages/database/src/research-repository.ts`
  - `packages/database/src/research-backfill-presets.ts`
  - `packages/database/scripts/canonicalize-scientific-evidence.ts`
  - `apps/api-server/src/routes/research.ts`
  - `apps/web-ui/src/components/research/research-review-list.tsx`
  - `apps/web-ui/src/components/research/research-review-detail.tsx`
  - `tests/runtime/research-api.test.ts`
  - `tests/runtime/bootstrap-bigdata.test.ts`
  - `tests/e2e/local-first-workspace.spec.ts`
- experiments:
  - `pnpm exec vitest run tests/runtime/research-api.test.ts`

## Findings

- The repository already exposes the core `034` execution commands: `pnpm prisma:generate`, `pnpm run test:db`, `pnpm run test:advanced`, `pnpm run evidence:canonicalize`, `pnpm run evidence:benchmark:refresh`, `pnpm run evidence:quality-report`, `pnpm run local:view:up`, and Playwright commands from the root `package.json`.
- No durable `specs/034-full-text-research-intelligence/` pack existed before this batch; the `034` plan only existed in session memory.
- The internal/admin research and evidence routes already exist and are hidden from VIEWER navigation, but Playwright coverage is still focused mainly on a single evidence-review happy path rather than large research reviews.
- The research-review create UI allows `limit` up to 100, but the live search fetch path is capped to `Math.min(limit, 15)`, so 25-paper and 100-paper validation must go through warehouse/backfill/preset paths rather than live search alone.
- The first concrete implementation gap was in warehouse eligibility reporting: counts were derived from the limited returned item slice instead of the whole linked warehouse under audit. This batch fixes that boundary so whole-warehouse counts are now aggregated while `limit` controls only the sampled `items` payload.
- The local admin runtime baseline was confirmed in-browser before the rebuild with the current explorer cards showing `Warehouse claims 561573`, `Warehouse rows with DOI 124204`, `Linked warehouse rows 128359`, and `128438 matching records` on the current filtered explorer slice.
- A direct Prisma-backed warehouse eligibility dry-run against the current local warehouse returned `128300` linked records, `2906` eligible records, `125394` excluded records, `48123` inaccessible records, `113667` out-of-scope records, `58827` missing full-text records, and `10799` missing-license records.
- A bounded canonicalization run over the live local warehouse completed successfully with `13` processed rows, `12` canonical extractions, `1` `needs_full_text`, `36` canonical facts, and `7` benchmark-ready records.
- Dedicated Playwright coverage now seeds deterministic `25`-paper and `100`-paper research reviews, opens the internal/admin review detail page, switches to the `Papers` tab, and verifies the authenticated review payload size from the browser session.

## Decisions

- Use the existing local warehouse as the operational baseline rather than forcing a new broad rebootstrap before the feature can move.
- Treat cleanup as soft exclusion and artifact hygiene by default, preserving warehouse rows and historical facts for audit/replay.
- For this explicit local correction, honor the user's hard-delete instruction through the guarded local `research:hard-prune` path only; do not run destructive cleanup against remote or non-local databases.
- Use warehouse/backfill/preset paths for large-review validation instead of pretending that live search alone can populate 25/100-paper reviews.

## Open blockers

- The broader full closeout matrix still needs a fresh end-to-end run for lint, JS, Python, build, canonicalization, benchmark refresh, quality report, and local runtime smoke after the local hard-prune correction.
- The 25/100 browser regression is now self-seeding and self-cleaning so normal local runtime seeding does not leave fake Playwright research articles in the app; it still validates seeded internal/admin review flows plus the authenticated API payload rather than warehouse/backfill/preset acquisition itself.

## Impact on plan

- The `034` feature can now start from a concrete runtime baseline instead of from speculative infrastructure work.
- The next implementation slices are now mostly operational closeout and blocker resolution: record the executed warehouse outcomes in final PASS/FAIL form, then resolve or explicitly waive the existing `test:db` persistence-test blocker and the warehouse-driven large-review acquisition proof.

## Validation executed in this implementation batch

- PASS `pnpm exec vitest run tests/runtime/research-api.test.ts`
- PASS regression coverage for whole-warehouse eligibility counts with a capped sample response in `tests/runtime/research-api.test.ts`
- PASS `pnpm exec vitest run tests/web-ui/external-evidence-explorer.test.tsx`
- PASS `pnpm exec playwright test tests/e2e/research-review-fixtures.spec.ts`
- PASS `pnpm run test:advanced`
- PASS `pnpm run evidence:canonicalize -- --limit=25 --batch-size=25 --replace-placeholders=true --full-text=hydrate --llm-mode=disabled`
- PASS `pnpm run evidence:benchmark:refresh`
- PASS `pnpm run evidence:quality-report`
- PASS `pnpm run local:view:up`
- PASS `pnpm run local:view:status`
- PASS `pnpm run test:db` after artifact-aware eligibility and bounded `source_document_ids` materialization were added.
- PASS local hard-prune dry-run and execution: retained `2784` strict eligible MFC/MEC/MET source records, deleted `125572` non-eligible or fixture-like local source records, created review `cmotramks00007di0yzza87hu`, saved `52896` extraction results, and verified `0` queued/running/failed jobs.
- PASS browser validation for the clean local review at `/admin/intelligence/research/reviews/cmotramks00007di0yzza87hu`: the page displayed `2784 papers`, `11 visible columns`, `52896 results`, `0 queued`, and visible extracted article values rather than Playwright fixture rows.
- PASS `pnpm exec vitest run tests/runtime/research-runtime-extractor.test.ts tests/runtime/research-api.test.ts`
- PASS `pnpm run test:db`
- PASS `PLAYWRIGHT_SKIP_BOOTSTRAP=1 PLAYWRIGHT_BASE_URL='http://localhost:3012' PLAYWRIGHT_API_BASE_URL='http://localhost:4012' PLAYWRIGHT_DATABASE_URL='postgresql://metrev:metrev@localhost:5436/metrev?schema=public' pnpm exec playwright test tests/e2e/research-review-fixtures.spec.ts`
- PASS `pnpm --filter @metrev/research-intelligence build && pnpm --filter @metrev/database build`
- PASS `pnpm run test:advanced`
