# Tasks — Analytical Workspace Refactor

## Workstream 1 — Artifacts and design

- [ ] T1 Recast 013 as the maintained umbrella for the analytical-workspace refactor while keeping the approved benchmark as a reference.
- [ ] T2 Capture the view-model seam, task order, and benchmark patterns that can be adapted safely.

## Workstream 2 — Foundations

- [ ] T3 Add explicit presentation mappers for decision workspace posture, readiness, uncertainty, and gaps.
- [ ] T4 Extend the shared workspace primitives and layout rules needed by the decision-first slice.

## Workstream 3 — Decision-first rollout

- [ ] T5 Refactor the decision workspace top fold around next move, posture, readiness, uncertainty, and blockers.
- [ ] T6 Demote raw trace and secondary detail into lower sections or secondary tabs without hiding them.
- [ ] T7 Extend web coverage for the mapper seam and refactored decision workspace states.

## Workstream 4 — Follow-through surfaces

- [ ] T8 Follow through on the input workspace, comparison/history promotion, and evidence-review alignment.
- [ ] T9 Run lint, web tests, build, and local-view manual validation.

## Dependencies

- Existing runtime response shapes remain the baseline unless a real product blocker is proven.
- Provenance, defaults, and uncertainty must stay explicit throughout the uplift.

## Parallelizable

- [ ] P1 Input-workspace and evidence-review alignment can proceed in parallel once the decision mapper seam is stable.
- [ ] P2 Comparison and history promotion can proceed in parallel with later route-specific polish.

## Validation gates

- [ ] docs updated or marked not needed
- [ ] tests run or explicit reason recorded
- [ ] acceptance criteria checked

## Definition of done

- [ ] The feature pack reflects the implemented analytical-workspace slices.
- [ ] The upgraded UI remains traceable and explicit about uncertainty.
- [ ] Manual local validation confirms progress across decision, input, comparison/history, and evidence-review surfaces.
