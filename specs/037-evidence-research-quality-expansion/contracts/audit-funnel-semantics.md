# Contract Note — Audit Funnel Semantics

Planning-only document. Canonical owner: `packages/domain-contracts/src/schemas.ts` (`evidenceQualityReportSchema`). Persistence: JSON on `EvidenceQualityAuditReport.summary` and `funnelMetrics`.

## Goal

Stop conflating articles, parsed documents, scientific facts, benchmarks, and research-cells in one funnel. Expose five funnels side-by-side.

## Shape (additive)

```ts
funnels: {
  article: FunnelStageCount[];
  document: FunnelStageCount[];
  fact: FunnelStageCount[];
  benchmark: FunnelStageCount[];
  research_cell: FunnelStageCount[];
}
```

`FunnelStageCount` reused from existing `funnelStageCountSchema`.

## Article funnel stages

1. `discovered` — `ExternalSourceRecord` total.
2. `cataloged` — `ExternalEvidenceCatalogItem` total.
3. `accepted` — accepted catalog items.
4. `has_stable_identifier` — DOI/PMID/etc.
5. `has_abstract` — non-empty abstract.
6. `has_full_text_artifact` — linked `SourceArtifactRecord` with body.
7. `has_source_text_chunks` — ≥1 chunk.
8. `technical_domain_match` — passes `hasTechnicalResearchTechnologyClass`.
9. `strict_table_ready` — `table-ready-completeness.ts::keep`.
10. `has_research_review` — at least one `ResearchReview` row referencing it.

## Document funnel stages

1. `artifact_present` — `SourceArtifactRecord` exists.
2. `pdf_xml_html_detected` — known mime.
3. `parse_attempted` — parser ran.
4. `pages_parsed` — pages > 0.
5. `text_blocks_parsed` — blocks > 0.
6. `tables_parsed` — tables > 0.
7. `parse_warnings` — count with warnings.
8. `parse_failures` — count with no blocks or hard error.

## Fact funnel stages

1. `scientific_facts` — `ScientificEvidenceFact` total.
2. `canonical_facts` — layer = canonical.
3. `normalized_facts` — normalized value/unit present.
4. `decision_ready_facts` — `decisionReady = true`.
5. `low_confidence_facts` — confidence < threshold.
6. `invalid_facts` — `qualityFlags` contains `invalid`.

## Benchmark funnel stages

1. `benchmark_records` — `EvidenceBenchmarkRecord` total.
2. `normalized_benchmark_records` — normalized value + unit.
3. `decision_ready_benchmark_records` — passes decision threshold.
4. `benchmark_aggregates` — `EvidenceBenchmarkAggregate`.
5. `unit_normalization_failures` — recorded errors.

## Research-cell funnel stages

1. `expected_cells` — Σ over reviews of (papers × columns).
2. `filled_with_trace` — cell status.
3. `filled_without_enough_trace` — cell status.
4. `not_reported_by_paper` — cell status.
5. `full_text_missing` — cell status.
6. `document_parse_failed` — cell status.
7. `table_detected_but_no_match` — cell status.
8. `extraction_failed` — cell status.
9. `queued` — cell status.
10. `needs_analyst_review` — cell status.

## Compat

Existing top-level `funnel_metrics` is kept untouched until consumers migrate. New consumers prefer `funnels.*`. Audit run records both.

## API surface

`/api/evidence-audit/report` returns the new payload, validated by extended Zod schema. UI groups via `FunnelChart` per funnel.
