# Implementation Plan — Agent And CI Governance Hardening

## Summary

Treat the external audit as a stale inventory, capture the corrected root-owned
workflow reality in a durable spec pack, then harden the existing CI workflow,
Playwright install helper, workflow-asset regression test, and workflow docs in
one validation-first slice.

## Source-of-truth files

- `WORKFLOW.md`
- `docs/internal-feature-workflow.md`
- `docs/repository-authority-map.md`
- `docs/runtime-tooling-setup.md`
- `.github/workflows/ci.yml`
- `package.json`
- `tests/runtime/workflow-assets.test.ts`

## Affected layers and areas

- root workflow governance
- CI and promoted validation scripts
- focused runtime validation for workflow assets
- durable feature documentation under `specs/`

## Required durable artifacts

- `spec.md`: capture scope, non-goals, and acceptance criteria for the reconciliation slice
- `plan.md`: define the exact hardening steps and validation order
- `tasks.md`: make implementation and validation ordering explicit
- `quickstart.md`: document how to inspect and verify the active workflow and CI surface
- `research.md`: not needed for this slice
- `contracts/`: not needed for this slice

## Research inputs

- current root workflow and CI inventory from repository inspection
- the active workflow docs and runtime-tooling docs
- the existing workflow-assets runtime regression test

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `WORKFLOW.md`, `docs/internal-feature-workflow.md`, `docs/repository-authority-map.md`, `docs/runtime-tooling-setup.md`, `.github/workflows/ci.yml`, `package.json`, `tests/runtime/workflow-assets.test.ts`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No domain, contract, API, or runtime payload change is intended. This slice is
purely workflow, CI, and documentation hardening.

## Implementation steps

1. Create the `024` feature pack with a corrected inventory and bounded scope.
2. Add the focused workflow-formatting gate and artifact uploads to `.github/workflows/ci.yml`.
3. Align `package.json` `test:e2e:install` with the CI Playwright install command.
4. Extend `tests/runtime/workflow-assets.test.ts` so the CI hardening is executable.
5. Update the root workflow docs to describe the safe multi-agent execution pattern and CI gate ownership.
6. Run the focused workflow-asset regression first, then the broader validation commands.

## Validation strategy

- focused: `pnpm run test:workflow-assets`
- formatting: `pnpm run format:workflow-assets`
- fast matrix: `pnpm run validate:fast`
- tooling: `docker compose config`
- local browser install parity: `pnpm run test:e2e:install`

## Critique summary

The main risk is creating a second governance story. The implementation avoids
that by updating the already-active owner files instead of inventing new top-level
surfaces or new specialist agents. Another risk is asserting the wrong CI
artifact or Playwright behavior; the workflow-assets test therefore checks the
exact promoted script and workflow strings.

## Refined final plan

Keep the slice minimal: document the corrected inventory, harden the existing
CI gates, add focused regression coverage, and stop. Defer security scanners,
coverage publishing, and Dockerfile reproducibility tightening to later PRs.

## Rollback / safety

If the new CI assertions prove too brittle, keep the feature pack and docs, then
relax the test to check only the promoted gate commands and artifact paths that
the repository explicitly owns.
