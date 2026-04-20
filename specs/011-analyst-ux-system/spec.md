# Feature Specification — Analyst UX System

## Objective

Turn the current evaluation surface into a stronger analyst-grade technical UX without changing METREV's deterministic decision behavior, authenticated runtime flow, or persistence contracts.

## Why

The runtime already delivers a real decision path, but the analyst interface still mixes report-like density with limited visual hierarchy. The product needs a coherent workbench language for comparison, confidence, evidence, simulation state, and next actions.

## Primary users

- analysts reviewing current and historical evaluations
- reviewers validating that evidence, defaults, confidence, and provenance remain visible in the product surface

## Affected layers

- domain semantics: no vocabulary rewrite intended
- contract boundary: preserve current runtime response shapes
- runtime adapters: keep API behavior stable
- UI: introduce a durable workbench language and stronger route hierarchy
- infrastructure: no new external service required
- docs and workflow: capture the UX system as a maintained feature pack

## Scope

### In

- strengthen the evaluation workbench hierarchy and comparison affordances
- make simulation, defaults, missing data, and provenance explicit instead of implied
- establish reusable visual tokens and workbench primitives on the current custom CSS surface

### Out

- migrating to a new component library or charting framework in this slice
- moving business rules out of shared runtime packages and into the UI

## Functional requirements

1. The evaluation workbench must surface lead action, confidence, evidence, and model state without hiding defaults or missing data.
2. The case history rail and comparison dock must support analyst comparison without changing the underlying API contract.
3. The visual system must stay responsive and reuseable across evaluation, evidence review, and intake surfaces.

## Acceptance criteria

- [ ] The workbench exposes clear summary, evidence, modeling, and audit modes with stable SSR-safe rendering.
- [ ] The comparison flow works against persisted history without inventing a separate backend shape.
- [ ] The shared CSS and component primitives can be reused by other analyst routes.

## Clarifications and open questions

- This slice evolves the current custom CSS surface instead of introducing a new visual framework.
- Simulation remains a secondary enrichment layer and must never masquerade as a mandatory source of truth.

## Risks / unknowns

- The current CSS surface may still expose layout limits once more routes adopt the workbench language.
- It is easy to increase density without improving comprehension if the hierarchy is not enforced consistently.
