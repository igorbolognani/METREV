# Tasks - Full-Text Research Intelligence

## Workstream 1 - Artifacts and design

- [x] T1 Create the `034` feature pack and record the baseline scope, safety boundaries, and cleanup policy.
- [x] T2 Record the initial repository findings and currently validated runtime slice in `research.md`.
- [x] T3 Add the planning-only contract note for research document ingestion and eligibility semantics.

## Workstream 2 - Implementation

- [x] T4 Make warehouse eligibility counts aggregate the full linked warehouse while `limit` only controls the returned sample items.
- [x] T5 Execute the real local-warehouse eligibility audit and record before/after counts plus rejection buckets.
- [x] T6 Run the canonical evidence, benchmark refresh, and quality-report path over the active eligible warehouse slices.
- [x] T7 Expand internal/admin research-review validation to reproducible 25-paper and 100-paper flows.

## Workstream 3 - Validation and follow-through

- [x] T8 Add and run a regression proving eligibility counts stay whole-warehouse accurate even when the returned item sample is capped.
- [x] T9 Run DB, JS, Python, build, local runtime, canonicalization, benchmark refresh, quality-report, and browser validation commands for the full `034` closeout.
- [x] T10 Record the explicit local hard-prune execution evidence, PASS/FAIL outcomes, and remaining broader closeout blockers in the durable artifacts.

## Dependencies

- Real local-warehouse execution depends on a reachable Prisma/PostgreSQL runtime with the expected warehouse data already loaded.
- Large research-review browser validation depends on the warehouse/backfill/preset path because live search remains capped at 15 fetched results.

## Parallelizable

- [ ] P1 Browser validation preparation can proceed while canonicalization and benchmark refresh are running on bounded warehouse slices.
- [ ] P2 Durable docs can be refined in parallel with local runtime execution once the command outputs and counts are known.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked for the explicit local hard-prune and extracted research table path

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
- [x] whole-warehouse execution evidence is recorded with final counts and rejection buckets
- [x] large-review browser validation is recorded for 25-paper and 100-paper flows

## Current blocker note

- The prior Postgres blocker on `tests/postgres/persistence.test.ts` is cleared: Prisma warehouse eligibility now counts persisted local `SourceArtifactRecord` and `SourceTextChunkRecord` evidence, and bounded `source_document_ids` sweeps can materialize `ACCEPTED` or `REJECTED` catalog review states without scanning the entire warehouse.
- `pnpm run test:db` is now green again for this slice, and the runtime research API regression is also green with the new bounded sweep coverage.
- `T9` is now green for the broader full-closeout command set, the canonicalization/benchmark/quality-report matrix already recorded in this pack, and the final local-view smoke plus workspace-density browser checks against the rebuilt Docker runtime.

## Explicit local hard-prune execution evidence

- Dry-run against the local Docker PostgreSQL database measured `128356` source records, `128302` linked records, `2784` strict eligible non-fixture MFC/MEC/MET records to keep, `126` fixture-like records in the delete set, and `125572` records to delete.
- Execute hard-deleted non-eligible and fixture-like local research source rows, leaving `2784` `ExternalSourceRecord` rows and `0` Playwright/fixture research source or review rows.
- Created clean review `cmotramks00007di0yzza87hu` titled `Eligible MFC/MEC/MET research corpus` with `2784` papers, `52896` jobs, `52896` results, `0` missing results, `0` queued jobs, `0` running jobs, and `0` failed jobs after repair of 20 malformed-chunk edge cells using abstract/title provenance fallback.
- Browser validation at `http://localhost:3012/admin/intelligence/research/reviews/cmotramks00007di0yzza87hu` showed the clean table with `2784 papers`, `11 visible columns`, `52896 results`, and `0 queued`; visible cells contained real extracted summaries, technology classes, materials, operating conditions, metrics, limitations, implementation factors, and metadata readiness values instead of `Queued` placeholders.
- PASS `pnpm exec vitest run tests/runtime/research-runtime-extractor.test.ts tests/runtime/research-api.test.ts` with `10` tests passing.
- PASS `pnpm run test:db` with `9` Postgres integration tests passing.
- PASS scoped E2E `PLAYWRIGHT_SKIP_BOOTSTRAP=1 PLAYWRIGHT_BASE_URL='http://localhost:3012' PLAYWRIGHT_API_BASE_URL='http://localhost:4012' PLAYWRIGHT_DATABASE_URL='postgresql://metrev:metrev@localhost:5436/metrev?schema=public' pnpm exec playwright test tests/e2e/research-review-fixtures.spec.ts` with `2` tests passing and temporary Playwright research fixtures cleaned afterward.
- PASS package builds `pnpm --filter @metrev/research-intelligence build && pnpm --filter @metrev/database build`.
- PASS `pnpm run test:advanced` with `36` tests passing.
- PASS `pnpm run test:js` with `54` files and `210` tests passing.
- PASS `pnpm run test:python` with `14` contract checks passing.
- PASS `pnpm exec vitest run tests/web-ui/navigation.test.tsx` with `3` tests passing after the collapsed sidebar accessible-name fix.
- PASS `pnpm run lint` across all `13` packages.
- PASS `pnpm run build` across all `13` packages, including `@metrev/web-ui` production build.
- PASS `PLAYWRIGHT_BASE_URL='http://localhost:3013' PLAYWRIGHT_API_BASE_URL='http://localhost:4012' PLAYWRIGHT_DATABASE_URL='postgresql://metrev:metrev@localhost:5436/metrev?schema=public' pnpm exec playwright test tests/e2e/local-first-workspace.spec.ts` with `3` tests passing after normal e2e bootstrap reset the pending evidence fixture.
- PASS `pnpm run local:view:up` rebuilt and started the Docker local view successfully with healthy `postgres` and `api` containers plus rebuilt `web`, `api`, and `research-worker` images.
- PASS `PLAYWRIGHT_BASE_URL='http://localhost:3012' PLAYWRIGHT_API_BASE_URL='http://localhost:4012' PLAYWRIGHT_DATABASE_URL='postgresql://metrev:metrev@localhost:5436/metrev?schema=public' pnpm exec playwright test tests/e2e/local-view-smoke.spec.ts tests/e2e/workspace-density.spec.ts` with `4` tests passing against the rebuilt Docker local view.
- Final local database audit after cleanup: `2784` source records, `1` clean research review, `2784` papers, `52896` completed jobs, `52896` results, `0` queued/running/failed jobs, `0` Playwright/fixture source rows, and `0` Playwright/fixture research reviews.
