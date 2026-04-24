# Tasks — Authority Runtime Hardening

Execution note: 015 is the umbrella consolidation pack. Keep this task list for the detailed authority-runtime sub-slice only.

## Workstream 1 — Artifacts and design

- [x] T1 Record the accepted authority split in an ADR and a maintained feature pack.
- [x] T2 Add planning-only authority-boundary notes that cite the canonical owner files.

## Workstream 2 — Implementation

- [x] T3 Add explicit runtime authority metadata for executed and non-executed assets.
- [x] T4 Add regression tests for canonical file loading, output-section alignment, and Prisma posture.

## Workstream 3 — Validation and follow-through

- [x] T5 Update root docs to demote `stack.md`, clarify MCP defaults, and explain the current Prisma 7 setup.
- [x] T6 Run test, generate, build, and targeted local-tooling validation and record the outcome.

## Dependencies

- The runtime loaders and reconciliation metadata must remain the only shared code-level authority notes.
- Prisma command validation must stay aligned with the committed migration wrapper.

## Parallelizable

- [x] P1 Draft docs and ADR content while authority metadata and tests are being implemented.
- [x] P2 Validate `README.md` and `docs/runtime-tooling-setup.md` changes independently from the test additions.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
