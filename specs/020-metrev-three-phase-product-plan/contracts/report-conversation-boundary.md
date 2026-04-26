# Report Conversation Boundary

## Purpose

The report conversation feature explains a generated METREV report. It does not manage the database, browse the full warehouse, run arbitrary simulations, or reveal raw internal model details.

## Request Boundary

Minimum request fields:

- `evaluation_id`
- `message`
- optional `selected_section`
- optional `conversation_id`
- optional recent `turn_history`

## Response Boundary

Minimum response fields:

- `conversation_id`
- `answer`
- `citations`
- `grounding_summary`
- `uncertainty_summary`
- `recommended_next_checks`
- `narrative_metadata`
- optional `refusal_reason`

## Context Package

The backend builds the context package from:

- printable report response
- normalized case
- decision output
- assumptions/defaults audit
- confidence/uncertainty summary
- source usages
- claim usages
- workspace/report snapshots
- supplier shortlist
- model/simulation summary

The LLM receives this package only.

## Allowed Answers

- Explain report findings.
- Clarify recommendations.
- Explain confidence and uncertainty.
- Summarize missing measurements and next checks.
- Explain tradeoffs already present in the report.
- Draft executive or technical wording from the report.
- Point to report sections and evidence groups.

## Blocked or Constrained Answers

- Unsupported guarantees.
- Full raw database dumping.
- Raw secret model internals in client mode.
- Speculative what-if answers without deterministic recalculation.
- Supplier purchase certainty without validation caveats.

## Runtime Modes

- `disabled`: no generated LLM answer.
- `stub`: deterministic safe answer from the report context.
- `ollama`: local model call with stub fallback.

OpenAI runtime mode is intentionally out of scope for this phase.

