# Quickstart — Wastewater Golden Case Preset

## Goals

- autofill the current intake form with a validated wastewater-treatment demo scenario
- produce a richer deterministic evaluation without changing the runtime contracts or rule engine

## Preconditions

- the authenticated web and API runtime is already reachable
- an analyst account can access `/cases/new`

## Setup

1. Sign in through `/login` with a seeded analyst account.
2. Open `/cases/new`.
3. Keep the current local-view stack running so the evaluation detail page can open after submission.

## Happy path

1. Click `Autofill wastewater golden case`.
2. Review or adjust the visible case-intake and typed-evidence fields.
3. Submit the form and confirm the resulting evaluation surfaces deterministic recommendations that include `imp_001`, `imp_002`, `imp_003`, and `imp_004`.

## Failure path

1. Apply the preset and then clear the visible typed-evidence title and summary fields.
2. Submit the form again.
3. Confirm the runtime still accepts the case, but typed evidence is omitted from the request built from the visible intake state.

## Edge case

1. Apply the preset and clear the visible preferred-suppliers and pain-points inputs.
2. Submit the form.
3. Confirm the visible cleared lists override the preset-backed values while the hidden structural stack context still remains attached.

## Verification commands and checks

- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run build`

## Current validated sample snapshot

- recommendation IDs: `imp_004`, `imp_001`, `imp_002`, `imp_003`
- confidence level: `medium`
- sensitivity level: `low`
