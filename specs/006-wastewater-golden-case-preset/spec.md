# Feature Specification — Wastewater Golden Case Preset

## Objective

Add a one-click wastewater-treatment golden-case preset to the minimal case-intake form so analysts can populate every visible intake and typed-evidence field while still exercising a richer deterministic evaluation path.

## Why

The current intake page intentionally exposes only a narrow subset of the runtime schema. That keeps the form light, but it makes manual validation slower and hides how the richer deterministic rule path behaves unless the user hand-builds a larger payload outside the UI.

## Primary users

- analysts validating the authenticated case-intake flow
- reviewers who need a repeatable deterministic demo scenario

## Affected layers

- domain semantics: no ontology or rule change
- contract boundary: no schema change
- runtime adapters: no API change
- UI: case-intake form behavior and preset messaging
- infrastructure: no change
- docs and workflow: add a maintained feature pack for the preset

## Scope

### In

- add a reusable wastewater-treatment golden-case preset for the current intake form
- keep the preset explicit about the richer hidden stack, metric, supplier, and evidence context it injects
- add regression coverage for payload building and deterministic output expectations

### Out

- expanding the intake page into the full raw schema editor
- changing deterministic rules, contracts, or persistence behavior

## Functional requirements

1. Analysts must be able to autofill the current intake form with a wastewater-treatment golden case in one action.
2. The preset must populate every currently visible intake and typed-evidence field while also carrying the richer structured runtime context needed for a meaningful deterministic run.
3. Visible form edits must remain authoritative over the preset-backed values the user can currently see and change.

## Acceptance criteria

- [x] The intake page exposes a wastewater-treatment golden-case autofill action.
- [x] The autofill produces a valid raw case input with typed evidence and richer stack context.
- [x] Automated tests prove that the preset drives the deterministic engine to concrete recommendation IDs without changing the underlying contracts or rules.

## Clarifications and open questions

- The preset is intentionally a validated demo and smoke-test scenario, not a new source of truth for ontology or rule behavior.
- Hidden preset fields must be described clearly in the UI so the richer payload is not mistaken for user-entered visible inputs only.

## Risks / unknowns

- A preset that silently injects too much hidden context could confuse analysts if the UI does not explain it.
- Recommendation ordering can shift if the deterministic scoring model changes, so tests should assert key recommendation IDs rather than a brittle full ranking.
