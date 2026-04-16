# Feature Specification — Analyst Cockpit And Preset Registry

## Objective

Replace the one-off intake preset flow with a reusable preset registry, add the nitrogen-recovery golden case, and turn the evaluation detail route into a comparison-first analyst cockpit instead of a long-form report.

## Why

The current runtime can already produce and persist a rich deterministic package, but the intake path only scales to one preset and the evaluation page still emphasizes scroll-heavy report sections over decision hierarchy, comparison, and relevance.

## Primary users

- analysts validating deterministic runs quickly with trusted reference scenarios
- reviewers who need a clearer explanation of why one recommendation outranks another

## Affected layers

- domain semantics: preset mapping must stay aligned with the domain golden cases
- contract boundary: no canonical schema change intended for the preset and cockpit slice
- runtime adapters: no API contract change intended
- UI: case-intake preset selection and evaluation detail presentation
- infrastructure: no change
- docs and workflow: maintained feature pack for the implementation

## Scope

### In

- fix the TypeScript config warning source for the active runtime tsconfig files
- convert the intake preset flow into a registry and add the nitrogen-recovery golden case
- rebuild the evaluation detail page as an analyst cockpit with stronger comparison and decision hierarchy

### Out

- external evidence ingestion schema and source adapters
- changes to deterministic rule definitions or canonical ontology files

## Functional requirements

1. The intake UI must support more than one validated preset without hardcoded one-off branches.
2. Analysts must be able to load a nitrogen-recovery golden case derived from the domain reference assets.
3. The evaluation detail route must surface top actions, confidence drivers, and comparison cues before lower-priority audit detail.

## Acceptance criteria

- [x] The active tsconfig deprecation warnings caused by `baseUrl` are resolved at the source.
- [x] The intake page exposes both wastewater and nitrogen-recovery presets from a shared registry.
- [x] The evaluation detail route reads as a decision cockpit rather than a long-form report.
- [x] Automated tests cover both presets and their materially different deterministic paths.

## Clarifications and open questions

- The second preset uses the existing nitrogen-recovery golden case as the semantic reference, not a newly invented scenario.
- The cockpit redesign should stay on the current custom CSS surface instead of introducing a charting or component-library migration in this slice.

## Risks / unknowns

- If the nitrogen-recovery mapping drifts from the domain golden case, the preset could become a second unsupported vocabulary.
- If the cockpit redesign keeps too much report detail on the first screen, the UX will remain dense without becoming clearer.
