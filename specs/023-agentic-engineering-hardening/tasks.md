# Tasks — Agentic Engineering Hardening

## Workstream 1 — Artifacts and design

- [x] T1 Record the workflow-hardening scope in a maintained feature pack.
- [x] T2 Capture the adopted external agentic patterns and explicit non-goals.

## Workstream 2 — First hardening slice

- [x] T3 Add a repo-owned `WORKFLOW.md` contract and align the root docs with it.
- [x] T4 Promote root review and test prompts, then normalize prompt agent
      bindings.
- [x] T5 Add runtime validation for workflow assets and prompt bindings.

## Workstream 3 — Agent clean-code rule slice

- [x] T6 Add explicit agent clean-code rules to `WORKFLOW.md` and the active root instructions.
- [x] T7 Extend the workflow-assets runtime test to protect clean-code anchors and the focused validation script.
- [x] T8 Reconcile this feature-pack task list with the completed and active slices.

## Workstream 4 — Validation and follow-through

- [x] T9 Run the focused workflow-assets validation command.
- [x] T10 Run the fast validation matrix and review the updated workflow surface for one consistent authority story.

## Deferred follow-up slices

- [x] D1 Tighten CI reproducibility after confirming the lockfile is current.
- [x] D2 Add planning-first API/client contract hardening for response parsing and boundary shape.
- [x] D3 Expand runtime version lineage across input, evidence, and research contract assets.

## Dependencies

- Root workflow docs must be updated in the same slice as `WORKFLOW.md`.
- Prompt binding checks depend on the active root agent file stems remaining the
  supported identifiers.
- Clean-code anchors must stay concise enough to remain practical in the active instruction surface.

## Parallelizable

- [x] P1 Feature-pack docs can be written in parallel with prompt promotion.
- [x] P2 Runtime validation can be added in parallel with the doc updates once
      the target file list is fixed.
- [x] P3 Clean-code wording and workflow-assets assertions can evolve together before the focused test rerun.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
