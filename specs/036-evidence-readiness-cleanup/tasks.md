# Tasks - Evidence Readiness Cleanup

## Workstream A - Feature artifacts

- [x] A1 Create `spec.md`.
- [x] A2 Create `plan.md`.
- [x] A3 Create `tasks.md`.
- [x] A4 Create `quickstart.md`.
- [x] A5 Create `research.md`.

## Workstream B - Route and stale UI cleanup

- [x] B1 Move active Evidence and Research navigation to canonical admin intelligence routes.
- [x] B2 Rename stale admin labels such as `Legacy explorer`.
- [x] B3 Add admin evidence-quality route parity.
- [x] B4 Redirect `/evidence`, `/evidence/review`, `/evidence/quality`, and `/research` to canonical admin routes.
- [x] B5 Remove dead research backfill client exports.
- [x] B6 Update any remaining active `/dashboard` links or callback defaults that should point to `/home`.

## Workstream C - Evidence detail and readiness data

- [x] C1 Extend the external evidence detail contract with canonical facts, benchmark records, and source-text readiness.
- [x] C2 Extend the API/repository payload to populate those fields.
- [x] C3 Add UI rendering for canonical facts, benchmark values, units, and missing-state reasons.
- [x] C4 Add a readiness-report script or equivalent diagnostic for accepted evidence.

## Workstream D - Corpus curation and reprocessing

- [x] D1 Add and dry-run the strict article-level readiness report against the accepted corpus.
- [x] D2 Add a lawful table-ready expansion workflow and high-precision technical query config.
- [x] D3 Wire strict table-readiness into `research:hard-prune --table-ready-only`.
- [x] D4 Improve research table rendering for extracted values, units, confidence, traces, and source-aware missing labels.
- [x] D5 Execute the lawful expansion campaign and canonicalization refresh until the strict table-ready corpus is clearly larger than 10 records.
- [x] D6 Run destructive strict pruning only after a local backup and an acceptable dry-run report.

## Workstream E - Validation and follow-through

- [x] E1 Run focused route/navigation/auth tests.
- [x] E2 Run focused research prune/scorer regression tests.
- [x] E3 Run database package type/build validation for repository/script changes.
- [x] E4 Dry-run the new expansion workflow and strict table-ready prune path.
- [x] E5 Update any operator docs that need the accepted-vs-table-ready distinction.
- [x] E6 Rerun local-view smoke after the latest backend gate changes.

## Dependencies

- Workstream B should land before Workstream C so the UI entry points are stable.
- Workstream C should land before Workstream D so corpus curation uses the same readiness model the UI can display.
- Workstream D should complete before the final browser validation.

## Parallelizable

- [x] P1 Route cleanup and feature-pack docs can land together.
- [x] P2 Evidence detail contract work and readiness-report implementation can proceed in parallel once the route slice is stable.

## Validation gates

- [x] docs updated or marked not needed.
- [x] contract owner files updated or marked not needed.
- [x] tests run or explicit reason recorded.
- [x] acceptance criteria checked after large-corpus execution.

## Definition of done

- [x] Spec-pack artifacts agree.
- [x] Canonical admin routes are the active UI path.
- [x] Evidence detail can explain and render table-readiness state.
- [x] Strict table-ready corpus is expanded beyond the earlier small local set.
- [x] Curated research papers populate the key table tabs with values, units, and traces after the expansion/prune pass.
- [x] Local-view validation passes on the running Docker stack after the latest backend gate changes.

## Latest implementation status - 2026-05-13

- Added a strict technical completeness scorer and wired it into `research:hard-prune --table-ready-only`.
- Added `pnpm run evidence:readiness-report` for JSON/CSV article-level readiness exports.
- Added `pnpm run evidence:expand-table-ready-corpus` and `packages/database/data/table-ready-expansion.config.json` for lawful OA/local corpus growth.
- Verified focused tests with `pnpm exec vitest run tests/runtime/research-prune-script.test.ts`.
- Verified database package build with `pnpm --filter @metrev/database build`.
- Verified focused UI regressions with `pnpm exec vitest run tests/web-ui/dashboard-workspace.test.tsx tests/web-ui/research-review-workspace.test.tsx tests/web-ui/advanced-route-pages.test.tsx`.
- Verified local smoke with `pnpm run validate:local:smoke`.
- Fixed the hydrate gate so `--full-text=hydrate` materializes lawful source chunks even when metadata-only extraction already found facts.
- Executed lawful expansion to 2,000 accepted local records, then strict-pruned after backups and matching dry-runs.
- Final local-view readiness report shows 39 accepted records and 39 strict table-ready records.
- Final retained corpus has 39 source records, 39 source artifacts, 1,021 source chunks, 1,020 scientific facts, 746 benchmark records, 59 benchmark aggregates, and one clean 39-paper research review.
- Backups created at `/tmp/metrev-evidence-readiness/pre-expansion-2026-05-13.sql` and `/tmp/metrev-evidence-readiness/post-expansion-2000-2026-05-13.sql`.
