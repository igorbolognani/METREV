# Planning Contract Note - Evidence Intelligence Runtime Shapes

> Planning-only artifact. This note captures feature-scoped examples, mappings, and proposed deltas for review. It is not a canonical schema source.

## Purpose

Define the proposed audit, discovery, acquisition, and workspace evidence-intelligence shapes before promoting them into canonical contract and runtime schema files.

## Current state

- canonical owner files: `bioelectrochem_agent_kit/domain/`, `bioelectro-copilot-contracts/contracts/`, `packages/domain-contracts/src/schemas.ts`, `packages/domain-contracts/src/research-schemas.ts`.
- current status: `canonical change required`.

## Proposed request, response, or shape examples

```yaml
evidence_quality_report:
  report_id: string
  trigger_mode: manual | scheduled | pre_evaluation | worker
  coverage_matrix: coverage_entry[]
  gaps: evidence_gap[]
  outliers: evidence_outlier[]
  readiness_scores: readiness_score[]
  funnel_metrics: funnel_stage_count[]
  summary:
    total_benchmark_records: number
    decision_ready_records: number
    coverage_ratio: number
    critical_gap_count: number
    stale_metric_count: number
    outlier_count: number
  created_at: iso_datetime

discovery_target:
  target_id: string
  gap_id: string
  query: string
  providers: string[]
  priority: number
  status: queued | running | completed | failed | skipped
  records_found: number
  records_staged: number

acquisition_attempt:
  attempt_id: string
  source_record_id: string
  strategy: source_artifact | unpaywall | core | semantic_scholar | publisher_oa | direct_pdf | direct_html | direct_xml
  status: queued | running | success | failed | blocked | skipped
  found_url: string | null
  found_access_status: string | null
```

## Mapping or adapter notes

- Evidence audit data maps from `EvidenceBenchmarkAggregate`, `EvidenceBenchmarkRecord`, `ScientificEvidenceFact`, `ExternalEvidenceCatalogItem`, `ExternalSourceRecord`, `SourceArtifactRecord`, `SourceTextChunkRecord`, `IngestionRun`, and `EvidenceCanonicalizationRun`.
- Discovery uses gaps from audit reports and stages records through the existing research repository.
- Acquisition must consider persisted artifacts and chunks before remote full-text fetching.
- Evaluation readiness maps into existing missing-data and provenance-note behavior.

## Validation notes

- Zod schemas must parse every API response and persisted JSON payload.
- Contract drift tests must ensure domain YAML and contract YAML use the same semantic vocabulary.
- API tests must cover role-gated read/write behavior.
- Database tests must cover empty warehouse, sparse evidence, strong evidence, and stale evidence.

## Open questions

- Whether `worker` trigger mode should be included in the first canonical schema or kept internal.
- Whether readiness snapshots should eventually be persisted per evaluation in a dedicated table or embedded in existing audit records.

## Promotion steps

1. Add domain YAML policies.
2. Add contract YAML policies.
3. Add runtime Zod schemas and loaders.
4. Add tests proving domain, contract, runtime, and repository shapes align.
