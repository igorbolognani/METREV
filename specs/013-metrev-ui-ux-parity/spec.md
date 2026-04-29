# Feature Specification — Analytical Workspace Refactor

Execution note: 013 remains the UI antecedent for this workstream. 014 is the antecedent local-first successor pack, while the active roadmap now lives in [020-metrev-three-phase-product-plan](../020-metrev-three-phase-product-plan/spec.md) with [021-public-infographic-pages](../021-public-infographic-pages/spec.md) as the current public-route execution slice.

## Objective

Refactor METREV into a task-oriented analytical workspace that separates setup, decision review, comparison, and audit concerns while preserving the current deterministic logic, provenance posture, and contract-owned runtime behavior.

## Why

The runtime already exposes enough deterministic output, provenance, uncertainty, and history detail to support a better product. The current deficit is mostly product architecture: weak top-fold hierarchy, insufficient progressive disclosure, and too much direct rendering of raw structures instead of decision-oriented view models.

## Primary users

- analysts running and reopening evaluations
- reviewers validating that a denser UI still preserves provenance, defaults, uncertainty, and local-only evidence posture

## Affected layers

- domain semantics: no vocabulary rewrite intended
- contract boundary: preserve current runtime response shapes unless a real product blocker proves summary data is missing
- runtime adapters: introduce output-side presentation mappers above the typed API responses
- UI: refactor analyst-facing surfaces around task-based workspaces and a shared decision language
- infrastructure: no new external service required
- docs and workflow: record the benchmark and rollout plan in a maintained feature pack

## Scope

### In

- decision workspace first, with posture, readiness, uncertainty, and gaps surfaced before trace details
- input workspace, comparison dock, and history/audit follow-through under one system language
- output-side view models that reshape deterministic results for product comprehension without changing business logic
- design-system-like primitives and page composition rules that support progressive disclosure

### Out

- changing deterministic business-rule ownership or hiding provenance to make the UI look cleaner
- inventing a second domain vocabulary in the product surface
- moving audit, defaults, or uncertainty into hidden-only states that weaken reviewability

## Functional requirements

1. The decision workspace top fold must surface the next best move, decision posture, delivery readiness, uncertainty, and gaps before raw input or audit detail.
2. Product-facing components must consume explicit presentation mappers instead of spreading raw runtime shape handling across the page.
3. Input, comparison, history, and evidence review must align to the same workspace language after the decision-first slice is stable.
4. Defaults, missing data, supplier-claim posture, evidence mode, and model status must remain explicit throughout the refactor.

## Acceptance criteria

- [x] The decision workspace exposes a decision-first top fold backed by explicit presentation mappers.
- [x] The refactor remains explicit about defaults, missing data, confidence, local-only evidence mode, and simulation status.
- [x] The implementation reuses the current runtime shape wherever possible and only adds backend support when a real product blocker proves summary data is missing.

## Clarifications and open questions

- The approved benchmark remains a composition reference, but 013 is no longer the canonical execution umbrella for the refactor.
- The decision-first direction captured here was absorbed by 014 and subsequent UI follow-through packs.
- A future Tailwind or shadcn-driven surface is allowed, but the first implementation slices should prioritize product architecture and mapper seams over framework churn.

## Risks / unknowns

- It is easy to overfocus on visual polish and leave the product narrative unchanged.
- Route-level separation may still reveal narrow summary gaps that need targeted runtime enrichments later.
