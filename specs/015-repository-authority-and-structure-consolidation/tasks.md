# Tasks — Repository Authority And Structure Consolidation

## Workstream 1 — Authority artifacts and classification

- [x] T1 Create `specs/015-repository-authority-and-structure-consolidation/` as the umbrella pack for the remaining repository-wide cleanup.
- [x] T2 Publish a maintained authority map that classifies active, reference-only, and local-optional surfaces.

## Workstream 2 — Root convergence and reference cleanup

- [x] T3 Converge root governance and tooling docs on the new authority map and remove duplicate MCP ownership from the optional template.
- [x] T4 Demarcate nested starter and domain-kit workflow references, then retire safe duplicate archive copies whose owning source files still exist elsewhere.

## Workstream 3 — Structural follow-through

- [x] T5 Define the target physical normalization plan for `apps/`, `packages/`, `tests/`, and root config surfaces as a documentation-first ownership map while the active runtime worktree remains in motion.
- [x] T6 Run the final validation pass, close the remaining supersession notes, and document the intentional reference-only, historical, and local-optional surfaces that must remain.

## Dependencies

- The domain-versus-contract split and the runtime loader anchors must remain intact.
- Structural normalization should follow the authority cleanup rather than compete with ongoing runtime feature work.

## Parallelizable

- [x] P1 Root doc convergence and nested reference labeling can proceed in parallel.
- [x] P2 Structural target-map design can proceed once the authority map and archive cleanup are landed.

## Validation gates

- [x] docs updated or marked not needed
- [x] contract owner files updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md` are consistent
- [x] `research.md` findings are reflected or marked not needed
- [x] planning-only contract notes are promoted, retired, or marked not needed
- [x] the structural follow-through is documented as a target ownership map, later mechanical moves are explicitly deferred with reasons, and the final validation wave is recorded
