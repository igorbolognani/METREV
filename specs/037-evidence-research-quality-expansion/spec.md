# Feature Specification — Evidence/Research Quality Expansion + UI 100% Zoom Correction

## Objective

Make METREV usable at 100% browser zoom on desktop viewports (1280–1920 wide) and make the evidence/research/audit pipeline scientifically auditable end-to-end: document-block-level traces for parsed artifacts, research-cell-level provenance with explicit missing-reason enums, and an audit that splits its single funnel into five (article / document / fact / benchmark / research-cell). Land all of this without adding a new permanent service.

## Why

Today analysts must use ~50% browser zoom to see admin/evidence/research/quality pages comfortably because `.app-main` and `.app-layout--workspace-density` apply `overflow-x: hidden` over dense card/grid layouts. At the data layer, accepted ≠ strict-table-ready ≠ document-parsed ≠ research-cell-complete, but the current audit conflates these and PDF extraction (regex over flate-decoded streams in `packages/research-intelligence/src/fulltext/source-content.ts`) gives no page/line/table fidelity, so research-cell missing reasons cannot be expressed honestly.

## Primary users

- Analysts reviewing the Evidence Explorer, Review Gate, Quality Audit, and Research tables at normal desktop zoom.
- Administrators curating corpus quality and inspecting why a record/cell is empty.
- Repository agents running reproducible quality/health checks (`metrev:doctor`, layout audit, corpus scoring).

## Affected layers

- domain semantics: unchanged.
- contract boundary: additive Zod extensions on `evidenceQualityReportSchema` (5 funnels), `researchExtractionResultSchema` (cell status + missing_reason + trace), and a new `documentIntelligenceResultSchema`.
- runtime adapters: new `packages/document-intelligence/`; updated `packages/research-intelligence/` extractor and full-text path; expanded `packages/evidence-audit/` funnel split; updated repository, API, and UI.
- infrastructure: no new long-running service. New pnpm scripts and Playwright layout-audit spec only.
- docs and workflow: spec pack + ADRs 0006–0009.

## Scope

### In

- Spec pack at `specs/037-evidence-research-quality-expansion/`.
- ADRs 0006–0009 covering document-intelligence stack, research-cell lineage, admin UI density, and internal quality tools.
- UI corrections so 100% zoom is comfortable at 1280×800, 1440×900, 1600×900, 1920×1080 across 11 critical routes.
- Playwright layout-audit spec + `pnpm ui:layout-audit` script.
- Five-funnel evidence audit (JSON-only contract extension, no Prisma migration).
- Research-cell `status` + `missing_reason` enum with provenance trace.
- TS-first `packages/document-intelligence/` v1: page/block/(table-lite) parsing with stable `docintel-v1` schema, persisted into existing JSON fields.
- Rewired deterministic extractor consuming document blocks/tables.
- Review Gate repair queues (v1: queue labels + rerun actions hitting existing endpoints).
- Internal quality CLIs: `evidence:corpus-score`, `research:coverage-report`, `pdf:inspect`, `audit:explain`.
- Health command `metrev:doctor` (`--quick`, `--full`, `--json`).

### Out

- New permanent service (queue, worker daemon outside `apps/research-worker`).
- Sci-Hub or paywall bypass; only lawful OA + analyst-provided local artifacts.
- New Prisma tables in v1 (deferred to v2 if v1 JSON proves lossy).
- Python sidecar (deferred unless TS parser quality is insufficient after Phase 5).
- Cell-history (`ResearchExtractionResult` keeps `[paperId,columnId]` overwrite semantics).

## Non-negotiable invariants

- accepted ≠ strict_table_ready.
- full_text_missing ≠ not_reported_by_paper.
- document_parse_failed ≠ not_reported_by_paper.
- metadata-only extraction cannot claim `filled_with_trace`.
- decision-ready benchmark requires normalized value/unit + trace.
- API responses still pass the contract boundary.

## Acceptance criteria

See `plan.md` Section 12. Summary: no critical route requires <100% zoom; layout audit PASS across 4 viewports × 11 routes; 5 audit funnels exposed; ≥6 cell-status enum values exercised on fixtures; ≥1 fixture PDF parsed into multi-page blocks + a table; all quality CLIs and `metrev:doctor` return PASS/WARN/FAIL exit codes.
