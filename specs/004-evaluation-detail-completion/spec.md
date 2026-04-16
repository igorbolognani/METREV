# Feature Specification — Evaluation Detail Completion

## Objective

Render the full stored decision-output package and key audit context on the evaluation detail page so analysts and viewers can inspect the complete deterministic result that the runtime already computes and persists.

## Why

The runtime already produces and stores the full decision output contract plus supporting audit metadata, but the current evaluation detail page only exposes part of it. This leaves audit-critical sections hidden even though they are available in the payload.

## Primary users

- analysts reviewing a completed decision run
- viewers inspecting persisted runtime evidence and recommendations

## Affected layers

- domain semantics: no change
- contract boundary: no change
- runtime adapters: no change
- UI: evaluation detail presentation and styling
- infrastructure: no change
- docs and workflow: add a maintained feature pack for this UI slice

## Scope

### In

- render the currently omitted decision-output sections and supporting audit context on the evaluation detail page
- keep empty states explicit when optional or list-heavy sections have no entries
- improve navigation inside case history so stored related evaluations are easy to open

### Out

- changes to evaluation generation, auth, persistence, or contracts
- PDF export, public marketing pages, or dashboard filtering

## Functional requirements

1. The evaluation detail page must render impact map, supplier shortlist, and phased roadmap from the stored evaluation payload.
2. The evaluation detail page must render diagnosis findings, weaknesses, and traceable recommendation identifiers alongside the existing summary so the result is audit-friendly.
3. The page must preserve uncertainty, provenance, narrative metadata, and auth behavior while adding direct navigation to other evaluations and related audit context in the same case history.

## Acceptance criteria

- [ ] An authenticated user can open an evaluation detail page and see all required decision output sections from the shared schema.
- [ ] Empty arrays render controlled explanatory text instead of blank space.
- [ ] Existing evaluation retrieval, case history retrieval, and route protection behavior remain unchanged.

## Clarifications and open questions

- The slice stays read-only and does not add browser-side filtering or export actions.
- Styling should remain aligned with the current custom CSS surface instead of introducing a component library migration.

## Risks / unknowns

- The page can become visually dense if the new sections are added without stronger layout hierarchy.
- Real evaluations may produce long recommendation lists, so the first pass should prefer readable grouping over compactness.
