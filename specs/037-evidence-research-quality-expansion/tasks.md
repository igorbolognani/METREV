# Tasks — Spec 037

Track per-phase tasks. Status legend: `[ ]` not started, `[~]` in progress, `[x]` done.

## Phase 0 — Spec pack + ADRs + baseline

- [x] T0.1 Create `specs/037-evidence-research-quality-expansion/spec.md`.
- [x] T0.2 Create `plan.md`, `tasks.md`, `quickstart.md`, `research.md`.
- [x] T0.3 Create `contracts/{document-intelligence-model,research-cell-coverage,audit-funnel-semantics,admin-ui-density-rules}.md`.
- [x] T0.4 Draft `adr/0006-document-intelligence-extraction-stack.md`.
- [x] T0.5 Draft `adr/0007-research-cell-lineage-and-audit.md`.
- [x] T0.6 Draft `adr/0008-admin-ui-density-and-layout-rules.md`.
- [x] T0.7 Draft `adr/0009-internal-quality-tools-and-doctor-command.md`.
- [ ] T0.8 Capture baseline screenshots (4 viewports × 11 routes) under `specs/037-.../baseline/screenshots/`.
- [ ] T0.9 Capture baseline `evidence:quality-report` JSON under `baseline/audit.json`.
- [ ] T0.10 Capture baseline research review coverage snapshot under `baseline/research-coverage.json`.

## Phase 1 — UI 100% zoom corrections

- [x] T1.1 `globals.css`: removed `overflow-x: hidden` from `.app-main` and `.app-layout--workspace-density`; added `.workspace-scroll-x` and `.workspace-mono-overflow` utilities; enforced `min-width: 0` on grid children.
- [ ] T1.2 `external-evidence-explorer.tsx`: stack split-grid below ~1440, isolate dense queue in scroll shell, split toolbar rows.
- [ ] T1.3 `external-evidence-review-board.tsx`: wrap each `EvidenceReviewTable` in scroll shell; bulk-action toolbar `position: sticky` only on overflow.
- [ ] T1.4 `evidence-review/evidence-review-table.tsx`: enforce row `min-width: 0`, add `compact` prop dropping low-priority columns at narrow widths.
- [ ] T1.5 `external-evidence-detail.tsx`: responsive metadata grid, payload/claims inside scroll shell.
- [ ] T1.6 `evidence-quality/evidence-quality-workspace.tsx`: matrix/heatmap into own scroll containers; stack funnel + heatmap on <1500.
- [ ] T1.7 `research/research-review-detail.tsx`: stacked row groups; tables in `DenseTableShell` with horizontal scroll; chips cap width; tab strip wraps.
- [ ] T1.8 `research/research-review-list.tsx`: cap card max-width.
- [ ] T1.9 Toolbars: `evidence-explorer-toolbar.tsx`, `evidence-review-toolbar.tsx` — wrap chips, allow rows to flow.
- [~] T1.10 Marked `DenseTableShell` and research-review payload `<pre>` with `data-layout-scroll="true"`. Remaining: heatmap/matrix shells in evidence-quality workspace (deferred until Phase 1 follow-up after layout audit).
- [ ] T1.11 Extend Vitest UI tests covering chip wrap, scroll shell presence, stacked layouts.

## Phase 2 — Layout audit tooling

- [x] T2.1 Added `tests/e2e/layout-audit.spec.ts` (4 viewports × 11 routes, illegal-overflow scanner respecting `data-layout-scroll`).
- [x] T2.2 Added `scripts/run-ui-layout-audit.mjs` (exit codes 0=PASS, 1=FAIL, 2=WARN; supports `--dry-run`).
- [x] T2.3 Added root `package.json` script `ui:layout-audit`.
- [x] T2.4 Audit emits `test-results/layout-audit/summary.json` + per-viewport PNG screenshots.
- [x] T2.5 Document allowed overflow containers in `contracts/admin-ui-density-rules.md`.

## Phase 3 — Audit semantic split v1

- [x] T3.1 Extend `evidenceQualityReportSchema` with optional `funnels`.
- [x] T3.2 `evidence-audit-repository.ts`: per-funnel queries.
- [x] T3.3 `run-audit.ts`: assemble structured `funnels`.
- [x] T3.4 API route emits new payload (Zod boundary).
- [x] T3.5 UI renders 5 funnels.
- [x] T3.6 Tests: `tests/runtime/evidence-audit-funnels.test.ts`, UI tests.

## Phase 4 — Research cell provenance v1

- [x] T4.1 Add cell-status + missing-reason enums to domain contracts.
- [x] T4.2 Extend `researchExtractionResultSchema.normalized_payload.cells[]`.
- [x] T4.3 Update `deterministic-extractor.ts` to produce honest `cells[]`.
- [x] T4.4 Raise `take: 12` cap in `prune-research-warehouse.ts` with CLI flag (default 64).
- [x] T4.5 UI: missing-reason chips + trace tooltip in `research-review-detail.tsx`.
- [x] T4.6 Tests: `tests/runtime/research-cell-coverage.test.ts`, UI tests.

## Phase 5 — Document intelligence v1

- [x] T5.1 Scaffold `packages/document-intelligence/`.
- [~] T5.2 PDF parser (pdfjs-dist or unpdf — decided in ADR 0006 spike). _Deferred — awaiting ADR 0006 parser selection._
- [~] T5.3 HTML/XML parsers. _Deferred — pairs with T5.2 spike._
- [x] T5.4 Zod `documentIntelligenceResultSchema` + `docintel-v1` version constant.
- [x] T5.5 Integrate via `packages/research-intelligence/src/fulltext/source-content.ts` behind `METREV_DOCINTEL_ENABLED`. _Flag default off; passthrough scaffold._
- [~] T5.6 Persist JSON into `SourceArtifactRecord.metadataQuality.documentIntelligence` and chunk metadata. _Deferred — depends on real parsers (T5.2/T5.3)._
- [x] T5.7 Fixture-based parser tests. _Scaffold-level: paragraph split + flag-off behavior covered; full parser fixtures land with T5.2._

## Phase 6 — Table/metric extraction improvements

- [~] T6.1 Block-aware retrieval in `deterministic-extractor.ts`. _DEFERRED — extractor overhaul justifies its own design pass; revisit after ADR 0006._
- [~] T6.2 Table-first metrics extraction. _DEFERRED — same rationale as T6.1._
- [~] T6.3 `evidence-pack-builder.ts` attaches block/table provenance. _DEFERRED — depends on T6.1/T6.2._
- [~] T6.4 Fixture regression comparing coverage before/after. _DEFERRED — pairs with overhaul._

## Phase 7 — Review Gate repair queues

- [~] T7.1 Queue taxonomy + tabs. _DEFERRED — Review Gate UI needs standalone design pass._
- [~] T7.2 v1 rerun actions wired to existing endpoints. _DEFERRED — pairs with T7.1._
- [~] T7.3 Breadcrumb origin via query param. _DEFERRED — pairs with T7.1._
- [~] T7.4 UI tests + Playwright extension. _DEFERRED — pairs with T7.1._

## Phase 8 — Corpus quality CLIs

- [x] T8.1 `corpus-score.ts`. _Scaffold via `scripts/run-corpus-score.mjs`._
- [x] T8.2 `research-coverage-report.ts`. _Scaffold via `scripts/run-research-coverage.mjs` (9-bucket cell_status_counts)._
- [x] T8.3 `pdf-inspect.ts`. _Scaffold via `scripts/run-pdf-inspect.mjs`._
- [x] T8.4 `audit-explain.ts`. _Scaffold via `scripts/run-audit-explain.mjs`._
- [x] T8.5 Root scripts wired with `--dry-run` / `--json`.

## Phase 9 — METREV doctor

- [x] T9.1 `scripts/run-metrev-doctor.mjs`.
- [x] T9.2 Aggregator logic.
- [x] T9.3 Root script + docs. _Script wired; doc update tracked under T10.3._

## Phase 10 — Final validation

- [x] T10.1 Full test sweep (spec-037 vitest suites). _28/28 PASS: document-intelligence, research-cell-coverage, evidence-audit-funnels, research-intelligence, research-runtime-extractor. Broader `test:db`/`test:e2e` not re-run this batch._
- [x] T10.2 `metrev:doctor --full --json` clean. _Doctor overall=PASS for 3 scaffold checks (corpus-score, research-coverage, audit-explain)._
- [~] T10.3 Doc updates (`docs/runtime-tooling-setup.md`, `quickstart.md`). _Deferred — follow-up after restart._
- [x] T10.4 `specs/037-.../report.md` with PASS/WARN/FAIL summary.
