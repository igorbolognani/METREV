# Tasks — Analytical Workspace Refactor

## Workstream 1 — Artifacts and design

- [x] T1 Recast 013 as the antecedent reference pack for the analytical-workspace refactor while keeping the approved benchmark as a reference.
- [x] T2 Capture the view-model seam, task order, and benchmark patterns that can be adapted safely.

## Workstream 2 — Foundations

- [x] T3 Add explicit presentation mappers for decision workspace posture, readiness, uncertainty, and gaps through the successor execution packs.
- [x] T4 Extend the shared workspace primitives and layout rules needed by the decision-first slice through the successor execution packs.

## Workstream 3 — Decision-first rollout

- [x] T5 Refactor the decision workspace top fold around next move, posture, readiness, uncertainty, and blockers through the successor execution packs.
- [x] T6 Demote raw trace and secondary detail into lower sections or secondary tabs without hiding them through the successor execution packs.
- [x] T7 Extend web coverage for the mapper seam and refactored decision workspace states through the successor execution packs.

## Workstream 4 — Follow-through surfaces

- [x] T8 Follow through on the input workspace, comparison/history promotion, and evidence-review alignment through the successor execution packs.
- [x] T9 Run lint, web tests, build, and local-view manual validation through the successor execution packs.

## Dependencies

- Existing runtime response shapes remain the baseline unless a real product blocker is proven.
- Provenance, defaults, and uncertainty must stay explicit throughout the uplift.

## Parallelizable

- [x] P1 Input-workspace and evidence-review alignment can proceed in parallel once the decision mapper seam is stable.
- [x] P2 Comparison and history promotion can proceed in parallel with later route-specific polish.

## Validation gates

- [x] docs updated or marked not needed
- [x] tests run or explicit reason recorded
- [x] acceptance criteria checked

## Definition of done

- [x] The feature pack reflects the implemented analytical-workspace slices.
- [x] The upgraded UI remains traceable and explicit about uncertainty.
- [x] Manual local validation confirms progress across decision, input, comparison/history, and evidence-review surfaces.
