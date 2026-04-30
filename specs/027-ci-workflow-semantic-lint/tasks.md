# Tasks — CI Workflow Semantic Lint

## Workstream 1 — Feature pack and scope

- [x] T1 Create the `027` feature pack for workflow semantic lint.
- [x] T2 Record the bounded scope and explicit non-goals for this slice.

## Workstream 2 — Root automation validation

- [x] T3 Add a dedicated repository script for workflow semantic lint.
- [x] T4 Promote the semantic lint gate in the main `CI` workflow.
- [x] T5 Extend the focused workflow-formatting surface for the new slice files.

## Workstream 3 — Guardrails and docs

- [x] T6 Extend the workflow-assets regression test for the new semantic gate.
- [x] T7 Update the maintained workflow docs for the promoted semantic gate.
- [x] T8 Run `pnpm run lint:workflow-semantics`, `pnpm run test:workflow-assets`, and `pnpm run format:workflow-assets`.
      Current status: the semantic lint command passed against the current root
      workflows through the pinned official `actionlint` container, the
      workflow-assets regression test passed with the new semantic assertions,
      and the focused formatting gate passed after normalizing the new slice
      files with Prettier.

## Dependencies

- The semantic lint script, CI step, docs, and workflow-assets regression must
  move in the same patch.
- The new gate must stay focused on workflow semantics without widening into
  unrelated repository linting.

## Parallelizable

- [x] P1 The feature-pack docs can be authored in parallel with the script and CI updates.
- [x] P2 The workflow-assets regression update can land in the same slice as the new script and doc changes.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
