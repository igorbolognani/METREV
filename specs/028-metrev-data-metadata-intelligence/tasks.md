# Tasks — METREV Data Metadata Intelligence

## Workstream 1 — Feature pack and research inputs

- [x] T1 Create the `028` feature pack and planning boundary note.
- [x] T2 Distill the three local PDFs into implementation-facing findings without committing article text.
- [x] T3 Record the retained concepts and explicit non-goals for this slice.

## Workstream 2 — Removal and semantic replacement

- [x] T4 Remove the `022` feature pack, legacy manifest, seed script, and package wiring.
- [x] T5 Replace external project semantics in the domain taxonomy with METREV-owned research and metadata readiness vocabulary.
- [x] T6 Align the research contract boundary and runtime Zod schemas.

## Workstream 3 — Runtime and UI

- [x] T7 Refactor local-source metadata quality and evidence veracity handling to use generic context/reference penalties.
- [x] T8 Add deterministic research extraction for data and metadata readiness and propagate it into evidence packs.
- [x] T9 Remove article-specific local PDF defaults and old wording from the UI.

## Workstream 4 — Validation and regression

- [x] T10 Replace the old scoring regression with generic context-reference coverage.
- [x] T11 Add a regression guard against reintroducing the old label or article-default filenames in active source files.
- [x] T12 Run focused tests, contract checks, lint, and build.
      Current status: focused runtime tests passed, Python contract checks passed,
      `pnpm run lint` passed, `pnpm run build` passed, and the promoted
      `pnpm run validate:fast` matrix passed after the readiness extraction
      trace fix.

## Dependencies

- The domain and contract updates must stay aligned in the same slice.
- The runtime extraction shape must be validated before evidence-pack propagation is trusted.

## Parallelizable

- [x] P1 The feature pack and temporary PDF extraction can proceed in parallel with removal of the old spec pack.
- [x] P2 Domain/contract alignment and UI copy cleanup can proceed in parallel once the new vocabulary is settled.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected in behavior or marked as deferred
- [x] planning-only contract notes are promoted, retired, or marked not needed
