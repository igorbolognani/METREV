# Feature Specification — CI Local Smoke Validation

## Objective

Make the Docker-backed Playwright and local-view acceptance path expose an
explicit smoke phase before the full local validation matrix.

## Why

The current `validate:local` flow already proves the full Docker-backed runtime,
but CI only exposes one coarse local-validation step. When that step fails, it
is harder to tell whether the breakage is basic runtime reachability, API
health, or the broader seeded E2E flow. The next low-risk hardening step is to
split out a named smoke phase while keeping `validate:local` as the canonical
orchestrator.

## Primary users

- maintainers debugging local-view regressions in CI
- reviewers who need a clearer signal when Playwright or Docker-backed runtime
  startup fails before the seeded E2E path begins

## Affected layers

- domain semantics: no change
- contract boundary: no change
- runtime adapters: no change
- UI: no product behavior change
- infrastructure: local validation scripts, Playwright smoke coverage, CI steps
- docs and workflow: local validation documentation and workflow-asset coverage

## Scope

### In

- add an explicit Playwright smoke test for the local-view runtime
- add a focused `validate:local:smoke` entrypoint and make `validate:local`
  run the same smoke phase by default
- split the CI local-validation job into a smoke step and a follow-on local
  acceptance step
- extend workflow-assets regression coverage and docs for the new validation
  posture

### Out

- product-facing UI changes
- replacing the existing full `validate:local` acceptance matrix
- adding a second Docker compose topology or non-Playwright browser stack

## Functional requirements

1. The repository must expose a dedicated smoke entrypoint for the Docker-backed
   Playwright local-view flow.
2. The smoke phase must validate the public landing route, login route, and API
   `/health` before the seeded full E2E path runs.
3. `validate:local` must remain the canonical orchestrator for full local
   validation.
4. CI must surface the smoke phase as an explicit named step before the full
   local acceptance step.
5. The workflow-assets regression test must fail if the new smoke validation
   posture drifts from the promoted scripts or CI workflow.

## Acceptance criteria

- [x] `tests/e2e/local-view-smoke.spec.ts` exists and covers public landing,
      login, and API health.
- [x] `package.json` exposes `test:e2e:smoke` and `validate:local:smoke`.
- [x] `scripts/run-local-validation.mjs` runs the smoke phase explicitly and
      supports smoke-only execution.
- [x] `.github/workflows/ci.yml` exposes a dedicated smoke step before the full
      local acceptance step.
- [x] `tests/runtime/workflow-assets.test.ts` and
      `docs/runtime-tooling-setup.md` reflect the new local smoke posture.

## Clarifications and open questions

- The smoke phase should stay lightweight and should not require the seeded E2E
  database bootstrap.
- The full local matrix still owns seeded database validation and the richer
  Playwright workspace coverage.

## Risks / unknowns

- If the smoke phase overlaps too much with the seeded E2E suite, CI time can
  grow without adding much diagnostic value.
- The smoke route assertions must stay stable enough that layout churn does not
  make the validation noisy.

## Validation notes

- The slice also hardens the full local orchestrator by applying runtime
  migrations before seed and `test:db` when a reused local Postgres volume is
  behind the current schema.
