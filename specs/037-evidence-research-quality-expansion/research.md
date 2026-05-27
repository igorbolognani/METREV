# Research — Spec 037

This file captures the open technical questions that materially shape the implementation. Decisions are deferred to the linked ADRs.

## PDF parsing library

Candidates: `pdfjs-dist`, `unpdf`, `pdf-parse`.

- `pdfjs-dist`: Mozilla's reference; layout-aware (text items with x/y/width); active maintenance; ~heavy bundle but acceptable for server-side worker.
- `unpdf`: lightweight runtime fork of `pdfjs-dist` aimed at serverless; same data model.
- `pdf-parse`: thin text-only extractor; no layout — disqualified for table-lite goals.

Decision: spike both `pdfjs-dist` and `unpdf` over a small fixture corpus (3–5 OA PDFs). Decide in ADR 0006. Default to `pdfjs-dist` if results equivalent.

Out of scope v1: OCR (image-only PDFs), formula recognition. Mark `documentIntelligenceResult.warnings` with `requires_ocr` so corpus tools can surface it.

## Table extraction

Strategy v1: heuristic from `pdfjs-dist` text-item rows: cluster items by y-band, then split by x-gaps. Confidence low; `headerInferred` set when first row contains distinct typography (bold) or unit tokens. Validate against fixture truth files.

Out of scope v1: borderless complex tables, multi-page tables, rotated text.

## Audit funnel persistence

Option A (chosen v1): JSON-only extension on `EvidenceQualityAuditReport.summary` + `funnelMetrics`. No migration. Back-compat via optional Zod fields.

Option B (deferred): normalized `AuditFunnel` + `AuditFunnelStage` tables. Considered if v1 JSON becomes unwieldy.

## Research-cell history

`ResearchExtractionResult` is unique on `[paperId, columnId]` (overwrite). History would require a new table; deferred to v2.

## UI density rule

`overflow-x: hidden` removal scope: scope to non-admin density only via class — keeps public/report pages unchanged. Implementation: add `.app-layout--admin-density` modifier on admin routes; `.workspace-density` remains for parity-mode dashboards.

## Layout audit reproducibility

- Fixed viewport list: 1280×800, 1440×900, 1600×900, 1920×1080.
- `prefers-reduced-motion: reduce` enforced in test profile.
- Wait for `networkidle` + a custom hydration sentinel before measuring.
- Allowed overflow only inside `[data-layout-scroll="true"]`.

## METREV doctor scope

Reads: web HEAD `/`, api `GET /healthz`, db `SELECT 1`, latest `EvidenceQualityAuditReport`, counts of accepted/strict/source artifacts/source chunks, redirect HEAD on legacy routes, last `test-results/layout-audit/summary.json`. Does not run mutating commands.
