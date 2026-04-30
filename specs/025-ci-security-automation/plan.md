# Implementation Plan — CI Security Automation

## Summary

Add GitHub-native code scanning and dependency-update automation to the root
workflow surface, then protect those new assets with the existing
workflow-assets regression test and focused formatting gate.

## Source-of-truth files

- `.github/workflows/codeql.yml`
- `.github/dependabot.yml`
- `tests/runtime/workflow-assets.test.ts`
- `docs/repository-authority-map.md`
- `package.json`

## Affected layers and areas

- repository automation
- focused workflow validation
- durable CI/security documentation under `specs/`

## Required durable artifacts

- `spec.md`: define scope and acceptance criteria for the security-automation slice
- `plan.md`: sequence the workflow/config changes and validation path
- `tasks.md`: track implementation and verification explicitly
- `quickstart.md`: document how to inspect and validate the new automation surface
- `research.md`: not needed
- `contracts/`: not needed

## Research inputs

- GitHub documentation for Dependabot `directory` and `directories` support
- GitHub documentation for Dependabot scheduling, grouping, and versioning strategy options
- current repo language inventory and workflow surface

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `.github/workflows/codeql.yml`, `.github/dependabot.yml`, `tests/runtime/workflow-assets.test.ts`, `docs/repository-authority-map.md`, `package.json`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No domain, contract, API, or runtime payload change is intended. This slice is
limited to repository automation and its validation.

## Implementation steps

1. Create the `025` feature pack for CI security automation.
2. Add a root CodeQL workflow for `javascript-typescript` and `python`.
3. Add a root `dependabot.yml` with conservative schedules and grouping.
4. Extend the focused workflow-formatting gate and the workflow-assets regression test for the new files.
5. Update the repository authority map so the new automation assets are discoverable.
6. Run `pnpm run test:workflow-assets` and `pnpm run format:workflow-assets`.

## Validation strategy

- focused regression: `pnpm run test:workflow-assets`
- focused formatting: `pnpm run format:workflow-assets`

## Critique summary

The main risk is adding automation that is either too noisy or too implicit.
This slice keeps the configuration explicit, bounded to GitHub-native surfaces,
and validated through the existing root workflow-assets test rather than adding
another bespoke validation layer.

## Refined final plan

Keep the automation small and reviewable: one CodeQL workflow, one Dependabot
config, one existing regression test extended to cover them, and one root doc
updated to keep the authority map honest.

## Rollback / safety

If the new automation proves too noisy, keep the feature pack and regression
coverage, then narrow the Dependabot schedules or ecosystems instead of removing
the root-owned automation surface altogether.
