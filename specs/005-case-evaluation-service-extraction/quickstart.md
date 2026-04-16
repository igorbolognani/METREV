# Quickstart — Case Evaluation Service Extraction

## Goals

- keep the existing evaluation API behavior intact while extracting orchestration into a service
- validate the refactor with automated checks and a ready-to-open local runtime

## Preconditions

- the workspace dependencies are installed
- the current runtime test suite already passes before the refactor

## Setup

1. Run `pnpm install` if dependencies are not already present.
2. Use the existing local runtime env baseline from `.env.example`.
3. Keep the current `local:view:*` scripts as the manual runtime entrypoint.

## Happy path

1. Run `pnpm run lint`.
2. Run `pnpm run test:js`.
3. Run `pnpm run build`.
4. Start the local-view stack with `pnpm run local:view:up`.
5. Open `/login` and use a seeded account for manual follow-through.

## Failure path

1. If the route or service test fails, inspect the orchestration order first.
2. Confirm the route still validates input before delegating.
3. Confirm the service still persists the resulting evaluation after orchestration.

## Edge case

1. Run the existing API runtime flow tests after the extraction.
2. Confirm the route still rejects anonymous or underprivileged callers.
3. Confirm the created evaluation remains fetchable through the list and history routes.

## Verification commands and checks

- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run build`
- `pnpm run local:view:status`
