# Quickstart — Evaluation Detail Completion

## Goals

- render the full stored decision package on the evaluation detail page
- validate the page without changing the current auth, API, or persistence boundaries

## Preconditions

- the runtime is already bootstrapped with a reachable API, web app, and PostgreSQL database
- at least one evaluation exists or can be created through the authenticated analyst flow

## Setup

1. Copy `.env.example` to `.env` if the runtime is not already configured.
2. Run `pnpm install` and `pnpm run db:bootstrap` if local data is not ready yet.
3. Start the runtime with `pnpm run dev` or the validated local-view flow.

## Happy path

1. Sign in through `/login` with a seeded analyst or viewer account.
2. Open an existing evaluation or create a new case evaluation through `/cases/new`.
3. Confirm the evaluation detail page renders diagnosis findings, prioritized options, impact map, supplier shortlist, phased roadmap, provenance, and case history navigation.

## Failure path

1. Open an evaluation that has empty lists for one or more decision-output sections.
2. Confirm the page shows explicit explanatory empty states instead of blank panels.
3. Confirm the page still renders the remaining sections normally.

## Edge case

1. Open case history from an evaluation page that already contains multiple stored evaluations for the same case.
2. Follow a related evaluation link from the history section.
3. Confirm the navigation opens the intended evaluation detail page without breaking the authenticated session.

## Verification commands and checks

- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run build`
