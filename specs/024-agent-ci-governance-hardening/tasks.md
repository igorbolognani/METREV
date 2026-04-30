# Tasks — Agent And CI Governance Hardening

## Workstream 1 — Feature pack and inventory

- [x] T1 Create the `024` feature pack with the corrected inventory.
- [x] T2 Record the bounded scope and deferred follow-ups for the reconciliation slice.

## Workstream 2 — CI and validation hardening

- [x] T3 Add the focused workflow-formatting gate to the promoted CI workflow.
- [x] T4 Upload local validation artifacts for Playwright and test results.
- [x] T5 Align the local Playwright install helper with the CI browser install posture.
- [x] T6 Extend the workflow-assets regression test to cover the promoted CI expectations.

## Workstream 3 — Workflow documentation

- [x] T7 Update the root workflow docs to describe safe multi-agent execution and CI ownership.
- [x] T8 Keep `AGENTS.md` stable and avoid new authority surfaces in this slice.

## Workstream 4 — Validation and follow-through

- [x] T9 Run `pnpm run test:workflow-assets`.
- [ ] T10 Run `pnpm run format:workflow-assets`, `pnpm run validate:fast`, `docker compose config`, and `pnpm run test:e2e:install`.
      Current status: `test:workflow-assets`, `format:workflow-assets`,
      `validate:fast`, `validate:advanced`, and `docker compose config` passed.
      `pnpm run test:e2e:install` is still pending on this Linux workstation
      because Playwright requested `sudo` to install system dependencies.

## Dependencies

- CI hardening and script changes must land with the workflow-assets regression update.
- Workflow doc updates must reference the already-active root surfaces instead of creating duplicates.

## Parallelizable

- [x] P1 Feature-pack docs and workflow doc updates can happen in parallel with CI edits.
- [x] P2 CI edits and workflow-assets assertions can be prepared together, then verified with one focused test.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
