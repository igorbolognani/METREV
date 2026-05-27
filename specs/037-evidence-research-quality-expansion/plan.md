# Plan — Evidence/Research Quality Expansion + UI 100% Zoom Correction

This is the operational plan for spec 037. The full narrative (assumptions, decomposition, risks, validation matrix) is intentionally kept compact here and authoritative in this file; tasks are tracked in `tasks.md`.

## Goal

Make METREV usable at 100% zoom and scientifically auditable end-to-end (document-block traces, research-cell provenance, 5 audit funnels) with minimal infrastructure growth.

## Source-of-truth and exception policy

- Domain semantics: `bioelectrochem_agent_kit/domain/` — unchanged.
- Contract boundary: `bioelectro-copilot-contracts/contracts/` — additive only.
- Runtime adapters: `apps/`, `packages/`.

Allowed exceptions, each tied to an ADR:

- Add `pdfjs-dist` / `unpdf` (OA-only, layout-aware) — ADR 0006.
- Add `packages/document-intelligence/` — ADR 0006.
- Research-cell lineage and status enum — ADR 0007.
- Admin UI density rule (drop global `overflow-x: hidden` on admin pages, introduce density tokens and explicit scroll containers) — ADR 0008.
- New pnpm scripts and `metrev:doctor` — ADR 0009.

Hard rules (no exception):

- No Sci-Hub, no paywall bypass.
- No bypass of contract layer in API responses.
- No silent loss of provenance, confidence, or missing-reason.
- No conflation of accepted / table-ready / parsed / research-cell-complete.

## Phased plan

### Phase 0 — Spec pack + ADR drafts + baseline

- Create this spec pack (`spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, `research.md`, `contracts/*.md`).
- Draft ADRs 0006–0009.
- Capture baseline: Playwright screenshots of 11 routes × 4 viewports (committed under `specs/037-.../baseline/`), current `evidence:quality-report` JSON, current research review coverage snapshot.

### Phase 1 — UI 100% zoom corrections

Files: `apps/web-ui/src/app/globals.css`, `app-shell.tsx`, `primary-nav.tsx`, `lib/navigation.ts`, evidence/research workspace components, shared UI table/dense-table shells.

Steps:

1. Remove `overflow-x: hidden` from `.app-main` (or scope to non-admin density only).
2. Introduce `.workspace-scroll-x` utility and `data-layout-scroll="true"` marker for tables/heatmaps/payload/document previews.
3. Enforce `min-width: 0` on grid/flex children for `.workspace-split-grid`, `.workspace-detail-grid`.
4. Wrap rules for chips/DOIs/URLs (`word-break: break-word; overflow-wrap: anywhere`).
5. Stack split grids earlier on Evidence Explorer; isolate dense queues in scroll shells in Review Board.
6. Quality workspace: coverage matrix/heatmap into own scroll containers; stack funnel + heatmap on <1500.
7. Research detail: redesign expanded row into stacked groups (paper meta → summary → insights → actions); tables go inside `DenseTableShell` with horizontal scroll; chips cap width; tab strip wraps.

### Phase 2 — Layout audit tooling

- New Playwright spec `tests/e2e/layout-audit.spec.ts` (matrix of viewports × routes; reports overflow pixels; allows scroll only inside marked containers; emits JSON summary + PNGs to `test-results/layout-audit/`).
- New `scripts/run-ui-layout-audit.mjs` ensures local view is up and runs the spec.
- Root `package.json` script `ui:layout-audit`.

### Phase 3 — Audit semantic split v1 (JSON-only)

- `packages/domain-contracts/src/schemas.ts`: optional `funnels: { article, document, fact, benchmark, research_cell }` on `evidenceQualityReportSchema`.
- `packages/database/src/evidence-audit-repository.ts`: add per-funnel counts.
- `packages/evidence-audit/src/run-audit.ts`: assemble structured `funnels` alongside legacy `funnel_metrics`.
- API `apps/api-server/src/routes/evidence-audit.ts`: pass new payload; Zod validates.
- UI `evidence-quality-workspace.tsx`: render 5 funnels grouped via tabs/accordion.

### Phase 4 — Research cell provenance v1

- Add cell-status enum to domain contracts.
- `deterministic-extractor.ts` produces `cells[]` with honest `missing_reason`.
- Raise `take: 12` cap in `prune-research-warehouse.ts` to a CLI-controlled default (64).
- UI surfaces missing-reason chips + trace tooltip.

### Phase 5 — Document intelligence v1

- New `packages/document-intelligence/` (TS-first, PDF via `pdfjs-dist` or `unpdf`, HTML/XML parsers, `docintel-v1` Zod schema).
- Integrated through `packages/research-intelligence/src/fulltext/source-content.ts`.
- Persistence v1 (no migration): JSON on `SourceArtifactRecord.metadataQuality.documentIntelligence` + per-chunk `metadata.documentBlockId`.
- Fixture-based parser tests under `tests/runtime/document-intelligence/`.

### Phase 6 — Table/metric extraction improvements

- `deterministic-extractor.ts` consumes blocks/tables.
- Replace first-N-chunks limitation with column-keyword block retrieval.
- `evidence-pack-builder.ts` attaches block/table provenance.

### Phase 7 — Review Gate repair queues

- Queue/status filters from audit flags + cell statuses.
- v1 rerun actions wire to existing canonicalize/research endpoints.
- v2 (deferred): local PDF attach, parse rerun, trace inspector panel.

### Phase 8 — Corpus quality CLIs

- `packages/database/scripts/{corpus-score,research-coverage-report,pdf-inspect,audit-explain}.ts`.
- Root scripts: `evidence:corpus-score`, `research:coverage-report`, `pdf:inspect`, `audit:explain` (all support `--dry-run`, `--json`).

### Phase 9 — METREV doctor

- `scripts/run-metrev-doctor.mjs` with `--quick`, `--full`, `--json`.
- Aggregates web/api/db reachability, latest audit, accepted/strict counts, parsed PDF/table counts, research-cell coverage, redirect checks, latest layout-audit summary.

### Phase 10 — Final validation

- `pnpm test:js`, `pnpm test:db`, `pnpm test:e2e`, `pnpm ui:layout-audit`, `pnpm validate:local:smoke`, `pnpm metrev:doctor --full --json`.
- Update docs, write `specs/037-.../report.md` with PASS/WARN/FAIL per phase.

## Rollback / safety

- All UI changes scoped under density tokens; revertable component-by-component.
- Schema extensions are additive Zod `.optional()` + JSON; old consumers unaffected.
- Destructive scripts default to `--dry-run`.
- Document intelligence opt-in via `METREV_DOCINTEL_ENABLED` env until fixtures pass.
- Phases merged independently.

## Risk register

See spec 037 plan companion in `/memories/session/plan.md` Section 11 for the full list. Top risks: PDF parsing imperfections (mitigation: confidence flags + opt-in), UI refactor regressions (mitigation: density-scoped CSS), audit funnel JSON drift (mitigation: Zod boundary), layout audit flakiness (mitigation: fixed viewports + reduced motion).

## Acceptance criteria

- UI 100% zoom usable across 11 critical routes × 4 viewports; no unmarked horizontal overflow.
- Legacy redirects preserve query params.
- Audit report carries 5 funnels; UI surfaces all.
- Research cells distinguish ≥6 enum values; missing reasons visible.
- ≥1 fixture PDF parsed into multi-page blocks + ≥1 table with stable hashes.
- `ui:layout-audit`, `evidence:corpus-score`, `research:coverage-report`, `pdf:inspect`, `audit:explain`, `metrev:doctor` all exist with PASS/WARN/FAIL exit codes.
- `pnpm test:js`, `pnpm test:db`, `pnpm test:e2e`, `pnpm ui:layout-audit`, `pnpm validate:local:smoke` PASS or have documented WARN/FAIL with mitigation.

## Recommended first batch

Phase 0 → Phase 1 → Phase 2 → validate. Only then progress to Phase 3+.
