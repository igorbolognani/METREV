# 016 Metrev UI Refactor Quickstart

## Purpose

Use this workflow to validate each refactor stage in the METREV runtime workspace while preserving the repository's domain and contract authority split.

## Stage 0 Validation

1. Install dependencies from the workspace root.
   `pnpm install`
2. Build the web workspace.
   `pnpm --filter @metrev/web-ui build`
3. Inspect that the shared wrappers exist under `apps/web-ui/src/components/ui/` and that `globals.css` contains the new token layer.

## Local Run

1. Install workspace dependencies.
   `pnpm install`
2. Start only the web UI when iterating on pure frontend work.
   `pnpm run dev:web`
3. Start the full local-first stack when validating integrated runtime behavior.
   `pnpm run local:view:up`
4. Check the stack status.
   `pnpm run local:view:status`
5. Open the login screen.
   `pnpm run local:view:open`
6. Shut the stack down when done.
   `pnpm run local:view:down`

## Happy Path Smoke Test

1. Log in and confirm the dashboard shell renders.
2. Open the input deck and create a draft through the wizard flow.
3. Continue through submission and open the resulting evaluation.
4. Verify tabs, exports, compare navigation, and print-safe report behavior.
5. Review an evidence item from the queue and confirm detail disclosure fallbacks.
6. Open case history and confirm audit payload disclosure works without losing structured summary.

## Ongoing Stage Validation

1. Apply only the files allowed by the active stage.
2. Run the smallest objective validation command that proves the stage is sound.
3. Stop before the next stage if the current build, route behavior, or interaction model regresses.

## Current Runtime Notes

- `apps/web-ui/` is the runtime UI surface for this feature.
- Domain semantics stay in `bioelectrochem_agent_kit/domain/`.
- Runtime contracts stay in `bioelectro-copilot-contracts/contracts/` and the TypeScript contract package.
- Tailwind is not part of this refactor path.
