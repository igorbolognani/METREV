# Quickstart — External Evidence Review And Intake Gate

## Goals

- review imported catalog evidence in the authenticated runtime before it enters a decision run
- attach only accepted catalog evidence to the case-intake flow as explicit typed evidence

## Preconditions

- the runtime is already bootstrapped with a reachable API, web app, and database
- at least one imported catalog item exists from Crossref or OpenAlex ingestion

## Setup

1. Start the runtime with the validated local-view or standard dev flow.
2. Sign in through `/login` with an analyst account.
3. Keep one imported catalog item in `pending` status for review validation.

## Happy path

1. Open the evidence review queue and inspect a pending catalog item.
2. Accept the item and confirm it moves into the accepted set.
3. Open `/cases/new`, select the accepted catalog evidence, submit the form, and confirm the resulting evaluation still shows typed evidence explicitly.

## Failure path

1. Open a pending or rejected catalog item and go to `/cases/new`.
2. Confirm the intake selector does not offer that item for inclusion.
3. Confirm the existing manual typed-evidence path still works.

## Edge case

1. Select one accepted catalog item and also enter a manual typed-evidence record in the intake form.
2. Submit the case.
3. Confirm both evidence sources are preserved in the outgoing typed-evidence bundle without hidden replacement.

## Verification commands and checks

- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run build`
