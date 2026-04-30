# Tasks — CI Security Automation

## Workstream 1 — Feature pack and scope

- [x] T1 Create the `025` feature pack for CI security automation.
- [x] T2 Record the bounded scope and explicit non-goals for this slice.

## Workstream 2 — Repository automation

- [x] T3 Add a root CodeQL workflow for the repo languages actually present.
- [x] T4 Add a root Dependabot configuration for GitHub Actions, npm/pnpm workspace manifests, and pip.
- [x] T5 Extend the focused workflow-formatting gate to cover the new automation files and spec pack.

## Workstream 3 — Validation and discoverability

- [x] T6 Extend the workflow-assets regression test to cover the new security automation surface.
- [x] T7 Update the repository authority map to include the new root automation assets.
- [x] T8 Run `pnpm run test:workflow-assets` and `pnpm run format:workflow-assets`.

## Dependencies

- The new automation files must be reflected in the focused workflow-assets validation surface.
- The authority map must stay aligned with the actual root-owned automation files.

## Parallelizable

- [x] P1 The CodeQL workflow and Dependabot config can be authored in parallel.
- [x] P2 The authority-map and workflow-assets test updates can land in the same slice as the new automation files.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
