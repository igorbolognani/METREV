# Tasks — Wastewater Golden Case Preset

## Workstream 1 — Artifacts and rule-path design

- [x] T1 Capture the golden-case scope, transparency requirements, and acceptance criteria in the feature pack.
- [x] T2 Map the deterministic rule triggers the preset should exercise without changing the rules themselves.

## Workstream 2 — Implementation

- [x] T3 Add a reusable intake payload helper with the wastewater-treatment golden-case preset.
- [x] T4 Update the intake form to expose autofill, explain the richer preset payload, and keep visible edits authoritative.

## Workstream 3 — Validation and follow-through

- [x] T5 Add regression coverage for the preset payload and deterministic output.
- [x] T6 Run validation checks and record the resulting sample behavior.

## Dependencies

- T3 depends on T1 and T2.
- T4 depends on T3.
- T5 and T6 depend on T3 and T4.

## Parallelizable

- [x] P1 Draft the feature pack while confirming the existing rule triggers.
- [x] P2 Design the preset payload and the visible form mapping in parallel.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed

## Verified sample result

- [x] Current validated sample result from the preset: `imp_004`, `imp_001`, `imp_002`, `imp_003` with `medium` confidence and `low` sensitivity.
