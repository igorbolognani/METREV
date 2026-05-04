# Tasks - Canonical Evidence Full-Text Hardening

## Workstream 1 - Artifacts and design

- [x] T1 Capture the implementation scope and safety boundaries in a feature pack.
- [x] T2 Record the initial migration validation and current research findings.

## Workstream 2 - Implementation

- [x] T3 Harden the canonical evidence migration SQL for PostgreSQL-oriented tooling.
- [x] T4 Add policy-aware full-text hydration and optional persistence for accepted evidence.
- [x] T5 Add Ollama-only schema-validated canonical evidence supplementation.
- [x] T6 Tighten benchmark refresh filtering for incomplete benchmark rows.

## Workstream 3 - Validation and follow-through

- [x] T7 Add focused regression tests for hydrate, LLM validation, and benchmark refresh.
- [x] T8 Update README and quickstart commands to reflect the new runtime path.
- [x] T9 Run focused verification and record outcomes.

## Dependencies

- [x] docs updated or marked not needed
- Hydrate implementation depends on the existing research full-text hydrator and source-artifact persistence pattern.
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Parallelizable

- [ ] P1 Benchmark refresh hardening can proceed while the hydrate helper is being implemented.
- [ ] P2 README and quickstart updates can proceed once CLI flags and validation commands are settled.

## Validation gates

- [ ] docs updated or marked not needed
- [ ] contract owner files updated or marked not needed
- [ ] tests run or explicit reason recorded
- [ ] acceptance criteria checked

## Definition of done

- [ ] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [ ] `research.md` findings are reflected or marked not needed
- [ ] planning-only contract notes are promoted, retired, or marked not needed
