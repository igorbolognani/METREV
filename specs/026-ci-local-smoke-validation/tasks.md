# Tasks — CI Local Smoke Validation

## Workstream 1 — Feature pack and scope

- [x] T1 Create the `026` feature pack for local smoke validation.
- [x] T2 Record the bounded scope and explicit non-goals for this slice.

## Workstream 2 — Local validation hardening

- [x] T3 Add a dedicated Playwright smoke spec for the Docker-backed local-view path.
- [x] T4 Add smoke-only support to the local validation orchestrator and Playwright setup.
- [x] T5 Expose `test:e2e:smoke` and `validate:local:smoke` in `package.json`.

## Workstream 3 — CI and durable coverage

- [x] T6 Split the CI local-validation job into smoke and full acceptance steps.
- [x] T7 Extend workflow-assets regression coverage and runtime tooling docs.
- [x] T8 Run `pnpm run validate:local:smoke`, `pnpm run test:workflow-assets`, and `pnpm run format:workflow-assets`.
      Current status: the new smoke entrypoint passed against the running
      Docker-backed local-view stack, the workflow-assets regression test passed
      with the explicit smoke assertions, and the focused formatting gate passed
      after normalizing the new slice files with Prettier. A follow-on rerun of
      `METREV_SKIP_LOCAL_SMOKE=1 pnpm run validate:local` also passed after the
      orchestrator began applying `db:migrate:deploy` before the seeded
      PostgreSQL-backed matrix.

## Dependencies

- The smoke phase must stay aligned across `package.json`, the local validation
  script, Playwright setup, and the CI workflow.
- Workflow-assets coverage must move with the promoted smoke-validation posture
  in the same patch.

## Parallelizable

- [x] P1 The smoke Playwright spec and the orchestrator changes can be authored together.
- [x] P2 CI wiring, runtime tooling docs, and workflow-assets regression updates can land in the same slice.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
