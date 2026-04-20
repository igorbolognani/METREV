# Quickstart — Analyst UX System

## Goals

- validate the analyst workbench under the current authenticated runtime
- confirm that comparison, evidence, model state, and provenance remain visible and coherent

## Preconditions

- the local runtime is configured and seeded
- at least one analyst account can sign in locally

## Setup

1. Run `pnpm run local:view:up`.
2. Run `pnpm run local:view:status`.
3. Sign in with a seeded analyst account.

## Happy path

1. Open `/cases/new` and submit a valid case.
2. Review the resulting evaluation in summary, evidence, modeling, and audit views.
3. Confirm the history rail and compare dock remain usable and the key signals stay visible.

## Failure path

1. Submit a case with insufficient operating anchors for modeling.
2. Open the modeling view.
3. Confirm the workbench shows degraded or unavailable model state without hiding the deterministic decision output.

## Edge case

1. Open the workbench on a narrow viewport.
2. Switch across summary, evidence, modeling, and audit tabs.
3. Confirm the primary decision signals remain visible without horizontal breakage.

## Verification commands and checks

- `pnpm run test`
- `pnpm run build`
- `pnpm run local:view:status`
