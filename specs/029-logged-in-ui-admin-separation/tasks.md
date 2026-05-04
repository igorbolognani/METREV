# Tasks - Logged-In UI And Admin Separation

## Workstream 1 - Feature pack and framing

- [x] T1 Create the `029` feature pack and define the first signed-in UX slice.
- [x] T2 Record the current problem as input/output confusion plus client/admin surface overlap.

## Workstream 2 - First runtime slice

- [x] T3 Rename the signed-in navigation groups to distinguish client workflow and admin intelligence.
- [x] T4 Refactor the stack configurator support column so the step navigator appears first and remains compact.
- [x] T5 Collapse the preset library so it no longer dominates the cockpit layout.
- [x] T6 Add an explicit preflight/output boundary in the stack configurator.

## Workstream 3 - Validation

- [x] T7 Update focused web tests for the new cockpit framing and navigation grouping.
- [x] T8 Run focused validation, then the standard fast matrix.

## Definition of done for this slice

- [x] client/admin grouping is visible in the signed-in sidebar
- [x] the stack step navigator no longer depends on scrolling past the preset deck
- [x] the configurator clearly distinguishes active inputs from generated outputs
- [x] focused regression coverage passes
