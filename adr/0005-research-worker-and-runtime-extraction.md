# ADR 0005: Research Worker And Runtime Extraction Orchestration

## Status

Accepted

## Context

Feature pack 019 started as a deterministic review-table engine, but the runtime now needs to support larger warehouse growth and richer extraction behavior without splitting the evidence model into separate subsystems.

Three architecture choices needed to be made explicit:

- queued provider backfills and queued research extraction jobs need one supported execution path instead of ad-hoc manual runs
- full-text enrichment and provider-backed structured extraction need to extend the existing research-review model rather than replacing it with a second paper-processing pipeline
- research evidence packs need to flow into the existing case intake and evaluation lineage model instead of introducing a parallel attachment vocabulary

Without a durable decision, the worker, queue, and extraction runtime behavior would remain an implementation detail rather than an authoritative repository posture.

## Decision

The runtime adopts one shared research-orchestration model.

- `IngestionRun` remains the queue primitive for resumable research backfills
- `ResearchExtractionJob` remains the queue primitive for per-paper and per-column extraction work
- `apps/research-worker/` is the dedicated background worker that drains both queue types through the shared `ResearchRepository` interfaces

The extraction runtime stays layered on the existing review-table architecture.

- hydrated full text is fetched on demand from XML, HTML, or PDF links derived from canonical research-paper metadata
- hydrated full text is treated as ephemeral runtime context and provenance, not as a second committed full-text warehouse by default
- deterministic extraction remains the baseline path and provider-backed structured extraction is invoked only for `llm_extracted` columns when the configured runtime credentials are available
- provider-backed extraction stays behind `packages/llm-adapter/` so case/report narratives and research extraction share one runtime boundary

Research evidence packs continue through the existing decision-support lineage path.

- research evidence packs are converted into case-intake evidence, assumptions, and missing-data flags
- evaluation persistence records research-source usage inside the existing provenance and source-usage surfaces
- the runtime does not create a second evaluation-only research attachment schema

## Validation Snapshot

At the time this ADR is accepted, the focused validated baseline is:

- PASS `pnpm exec vitest run tests/runtime/llm-adapter.test.ts`
- PASS `pnpm exec vitest run tests/runtime/research-intelligence.test.ts tests/runtime/research-runtime-extractor.test.ts`
- PASS `pnpm exec vitest run tests/runtime/research-api.test.ts`
- PASS `pnpm exec vitest run tests/runtime/research-worker.test.ts`
- PASS `pnpm exec vitest run tests/runtime/case-intake-preset.test.ts tests/runtime/case-evaluation-service.test.ts tests/web-ui/case-form.test.tsx`
- PASS `pnpm exec vitest run tests/web-ui/research-review-workspace.test.tsx tests/runtime/research-api.test.ts tests/runtime/research-worker.test.ts`
- PASS `pnpm --filter @metrev/research-worker build`
- PASS `docker compose config`

## Consequences

### Positive

- Backfills and extraction work can run continuously without tying long-running work to API requests.
- Full-text and provider-backed extraction enrich the existing research-review tables without inventing a second paper store.
- Research evidence stays auditable because it flows through the same decision-input and evaluation lineage model already used elsewhere in the runtime.

### Negative

- Local and containerized runtime operation now requires awareness of a third process in addition to the API and web app.
- Extraction latency and external dependency behavior become more visible because full-text fetches and provider-backed LLM calls are no longer hypothetical paths.
- Queue health and worker observability become operational requirements for the research workspace.

## Guardrails

- Do not persist license-uncertain full text as committed repository data by default.
- Do not bypass deterministic validation, evidence traces, or missing-data disclosure when provider-backed extraction is enabled.
- Do not introduce a second research attachment vocabulary for evaluations when the existing case-intake and provenance surfaces can carry the evidence.
- Do not let the worker become a second business-logic layer; orchestration stays in the worker, while extraction and persistence behavior stay in shared packages.
