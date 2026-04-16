# Quickstart — Analyst Cockpit And Preset Registry

## Goals

- validate both golden-case presets from the intake UI
- confirm the evaluation detail route now reads like a decision cockpit

## Preconditions

- the local runtime is running and reachable through the validated local-view ports
- an analyst account can access `/cases/new`

## Setup

1. Sign in through `/login` with a seeded analyst account.
2. Open `/cases/new`.
3. Keep the local-view stack running so each evaluation redirects into the detail route.

## Happy path

1. Load the wastewater preset, submit the intake form, and inspect the top-of-page decision posture.
2. Load the nitrogen-recovery preset, submit again, and compare the resulting top recommendations and confidence drivers.
3. Confirm the detail route surfaces actionability and comparison ahead of narrative and audit detail.

## Failure path

1. Reset the intake form after loading one preset.
2. Confirm the visible fields return to the blank baseline.
3. Confirm loading the other preset restores the expected visible scenario data without stale state leakage.

## Edge case

1. Load a preset and then clear the visible evidence title and summary fields.
2. Submit the intake form.
3. Confirm the visible edit authority still removes the typed-evidence record from the built payload.

## Verification commands and checks

- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run build`
