# Research Notes - METREV Three-Phase Product Integration

## Repository Findings

- The runtime already has deterministic evaluation, persistence, evidence review, evidence explorer, research tables, simulation enrichment, exports, comparison, case history, and printable reports.
- The main product mismatch is information architecture: internal evidence/research tools are too prominent for a client who wants to configure a stack and receive a diagnosis/recommendation/report.
- The public landing is route inventory oriented. It needs to become an educational product presentation.
- The input deck already has autosave, presets, staged submission, and validation. It should evolve into a stack cockpit without changing the `RawCaseInput` contract ad hoc.
- Modeling already emits named series. `operating_window` contains `x/y/z` sensitivity data and should not be flattened into a line chart.
- The LLM adapter already supports `disabled`, `stub`, and `ollama`. Report conversation should reuse that posture and avoid new provider scope.
- Evidence explorer and evidence assistant from 018 are useful internal/advanced instruments, not the user’s final report conversation.

## Product Direction

The client-facing path should be:

1. Understand the technology/value.
2. Configure the system stack.
3. Run deterministic evaluation.
4. Inspect diagnosis and recommendations.
5. Compare alternatives and roadmap/supplier options.
6. Generate a report.
7. Ask grounded clarification questions about that report.

## Contract Direction

Report chat needs explicit contracts because it crosses UI, API, persistence, LLM, audit, and report boundaries. It must receive a backend-built context package, not raw database access.

## Data Direction

The warehouse can support strong product claims only when ingestion is resumable, dedupe is stronger than source-key matching, review state is preserved, claim IDs are stable, and accepted items keep claim-review state aligned.

