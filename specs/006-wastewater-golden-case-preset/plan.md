# Implementation Plan — Wastewater Golden Case Preset

## Summary

Extract the case-intake payload builder into a reusable helper, add a wastewater-treatment golden-case preset that carries richer runtime context than the visible form alone, wire that preset into the UI with explicit messaging, and validate it with deterministic output regression coverage.

## Source-of-truth files

- `apps/web-ui/src/components/case-form.tsx`
- `apps/web-ui/src/lib/case-intake.ts`
- `packages/domain-contracts/src/schemas.ts`
- `packages/domain-contracts/src/normalize.ts`
- `packages/rule-engine/src/index.ts`
- `bioelectro-copilot-contracts/contracts/rules/diagnostics.yaml`
- `bioelectro-copilot-contracts/contracts/rules/improvements.yaml`
- `tests/runtime/case-intake-preset.test.ts`

## Affected layers and areas

- case-intake UI orchestration in the Next.js app
- deterministic runtime smoke coverage for a reusable preset payload
- workflow artifacts under `specs/`

## Required durable artifacts

- `spec.md`: define the preset scope and non-goals
- `plan.md`: anchor the preset to the existing contracts and rule path
- `tasks.md`: sequence preset, UI, and validation work
- `quickstart.md`: document how to trigger and validate the golden case manually
- `research.md`: required because the preset should target concrete diagnostic and improvement rules without altering them
- `contracts/`: not required because no boundary change is intended

## Research inputs

- `packages/domain-contracts/src/normalize.ts`
- `packages/rule-engine/src/index.ts`
- `bioelectro-copilot-contracts/contracts/rules/diagnostics.yaml`
- `bioelectro-copilot-contracts/contracts/rules/improvements.yaml`

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `packages/domain-contracts/src/schemas.ts`, `bioelectro-copilot-contracts/contracts/rules/diagnostics.yaml`, `bioelectro-copilot-contracts/contracts/rules/improvements.yaml`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No API, auth, persistence, or contract boundary change is intended. The preset remains a UI-side convenience that builds an existing `RawCaseInput` payload and sends it through the current runtime unchanged.

## Implementation steps

1. Extract the case-intake payload builder and validated wastewater-treatment preset into a reusable helper module.
2. Update the intake form to apply the preset, explain the richer hidden context, and keep visible edits authoritative.
3. Add regression tests that validate both the built raw payload and the resulting deterministic recommendation set.

## Validation strategy

- unit: add targeted tests around the preset payload builder and deterministic output
- integration: run lint, JavaScript tests, and build checks
- e2e/manual: open `/cases/new`, apply the preset, submit it, and inspect the evaluation detail page
- docs/contracts: confirm no canonical contract or rule files changed

## Critique summary

The main risk is letting the preset become a hidden second form model. The implementation should keep the helper narrow, explain the hidden context directly in the UI, and avoid coupling the tests to unstable ranking details.

## Refined final plan

Keep the runtime untouched, move only the form-to-payload logic into a helper, and make the preset explicit enough that it accelerates smoke validation without introducing unsupported certainty or opaque hidden behavior.

## Rollback / safety

If the preset proves confusing, revert the helper, the intake-form UI additions, and the preset test only. No API, contract, or persistence rollback should be needed.
