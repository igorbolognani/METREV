# Research — Local-First Professional Workspace

## Findings

### Backend-owned workspace view models are the correct seam

The main architectural correction in this phase is not visual. It is the move from frontend-computed decision framing to backend-built workspace payloads. This keeps posture, readiness, uncertainty, critical gaps, history deltas, and export summaries traceable to the same deterministic runtime output.

### Dedicated routes reduce cognitive overload

The previous evaluation surface mixed current-result reading, comparison, and history too tightly. Promoting history and comparison to dedicated routes preserves the current evaluation as the center of reading while still keeping audit and chronology explicit.

### The report surface should mirror the contract templates

The printable report now maps onto the consulting and diagnostic report templates under `bioelectro-copilot-contracts/contracts/reports/`. The runtime does not need to ingest those templates dynamically yet, but the surface and payload structure should keep following their section order and language.

### Synchronous submission still benefits from a progress route

There is no external async job in this phase. Even so, the product quality improves materially when the user sees deterministic runtime stages during the synchronous call and when the draft plus error context survive a failed submission.

### Version traceability belongs in every trust boundary

`ruleset_version`, `contract_version`, `ontology_version`, `prompt_version`, `model_version`, and `workspace_schema_version` now belong in audit records, workspace responses, report payloads, and exports. This is necessary for reviewability and regression tracking, not just observability.

## Current status versus remaining work

- The main contract, route, presenter, export, idempotency, and dedicated-page slice is already present in the repository.
- SSR/runtime test coverage now extends across history, comparison, evidence review, report, submitting, and export-version metadata.
- Playwright local E2E and final manual print/export validation remain the main open follow-through items for full acceptance.

## Recommendation

Treat 014 as the maintained execution source from this point forward. Keep the additive backend-owned workspace architecture intact, finish the remaining E2E/manual validation work, and avoid reopening the old frontend-heuristic approach.
