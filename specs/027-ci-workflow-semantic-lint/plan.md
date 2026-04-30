# Implementation Plan — CI Workflow Semantic Lint

## Summary

Add a dedicated semantic lint script for GitHub Actions workflows, promote it in
the main `CI` workflow, and lock the posture in the existing workflow-assets
regression test and focused workflow docs.

## Source-of-truth files

- `package.json`
- `scripts/run-workflow-semantic-lint.mjs`
- `.github/workflows/ci.yml`
- `tests/runtime/workflow-assets.test.ts`
- `WORKFLOW.md`
- `docs/internal-feature-workflow.md`
- `docs/runtime-tooling-setup.md`

## Affected layers and areas

- repository automation
- focused workflow validation
- durable CI/workflow documentation under `specs/`

## Required durable artifacts

- `spec.md`: define scope and acceptance criteria for workflow semantic lint
- `plan.md`: sequence the script, workflow, and regression updates
- `tasks.md`: track implementation and validation explicitly
- `quickstart.md`: document how to run the semantic lint gate locally and in CI
- `research.md`: not needed
- `contracts/`: not needed

## Research inputs

- official `actionlint` quick-start guidance for reproducible local and CI use
- current root `CI` workflow posture
- existing workflow-assets regression surface

## Contracts and canonical owner files

- contracts affected: none
- canonical owner files: `package.json`, `scripts/run-workflow-semantic-lint.mjs`, `.github/workflows/ci.yml`, `tests/runtime/workflow-assets.test.ts`, `WORKFLOW.md`, `docs/internal-feature-workflow.md`, `docs/runtime-tooling-setup.md`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No domain, contract, API, or runtime payload change is intended. This slice is
limited to the root automation validation surface.

## Implementation steps

1. Add a dedicated workflow semantic lint script that invokes the official
   `actionlint` container.
2. Expose that script in `package.json` and include the new slice files in the
   focused workflow-formatting surface.
3. Run the semantic lint command as an explicit step in `.github/workflows/ci.yml`.
4. Extend `tests/runtime/workflow-assets.test.ts` so the new script and CI step
   are enforced.
5. Update `WORKFLOW.md`, `docs/internal-feature-workflow.md`, and
   `docs/runtime-tooling-setup.md` to reflect the promoted semantic gate.

## Validation strategy

- narrow executable check: `pnpm run lint:workflow-semantics`
- workflow regression: `pnpm run test:workflow-assets`
- focused formatting: `pnpm run format:workflow-assets`

## Critique summary

The main risk is adding a semantic lint gate that depends on a brittle local
binary setup. Using the official pinned container keeps the command
reproducible, while the existing workflow-assets test protects the promoted
script and step from silent drift.

## Refined final plan

Keep the slice small and root-owned: one new script, one new CI step, one
existing regression surface extended, and the minimum docs needed so the new
gate is understandable and enforceable.

## Rollback / safety

If the semantic lint gate proves unexpectedly noisy, keep the script and docs in
place and narrow the invocation or pinning strategy rather than dropping back to
format-only workflow validation.
