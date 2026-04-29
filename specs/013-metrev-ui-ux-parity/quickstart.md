# Quickstart — Analytical Workspace Refactor

Execution note: use [020-metrev-three-phase-product-plan](../020-metrev-three-phase-product-plan/quickstart.md) for the active product validation flow. Treat [014-local-first-professional-workspace](../014-local-first-professional-workspace/quickstart.md) as antecedent local-first background context only.

## Goals

- validate the analytical workspace against the approved benchmark and the decision-first product goals
- confirm that the refactor still preserves provenance, defaults, uncertainty, and local-only evidence framing

## Preconditions

- local runtime is up with `pnpm run local:view:up`
- at least one seeded analyst account is available

## Setup

1. Run `pnpm run local:view:status`.
2. Open `http://localhost:3012/login`.
3. Sign in as an analyst.

## Happy path

1. Review the dashboard landing surface and confirm it behaves like a workspace home.
2. Open the input deck, inspect the drafting tabs and side rail, and submit a valid case.
3. Inspect the resulting decision workspace and confirm the top fold surfaces next move, posture, readiness, uncertainty, and blockers before trace detail.
4. Reopen the saved run through history and compare one prior evaluation.
5. Visit evidence review and confirm it matches the same visual system.

## Failure path

1. Submit a sparse case with missing operating anchors.
2. Confirm the decision workspace stays readable and the model state degrades explicitly rather than disappearing.
3. Confirm defaults, missing data, and blockers remain visible even after progressive disclosure changes.

## Edge case

1. Inspect the upgraded surfaces on a narrower viewport.
2. Confirm page hierarchy, chips, cards, and tabs remain readable and actionable.
3. Confirm no route loses access to key provenance detail because of the denser layout.

## Verification commands and checks

- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run build`
- `pnpm run local:view:status`
