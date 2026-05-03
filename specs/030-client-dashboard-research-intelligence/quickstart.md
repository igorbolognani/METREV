# Quickstart - Client Dashboard And Research Intelligence

## Local runtime

1. Start the canonical local runtime with `pnpm run local:view:up`.
2. Open `http://localhost:3012/login` and sign in with a seeded local account.
3. Use the guarded evaluation reset command only in the local runtime after the implementation lands.

## Intended first-slice verification

1. Capture the current local state from `/dashboard`, `/evaluations`, and `/reports`.
2. Run the new local evaluation reset command in dry-run mode and confirm only evaluation-owned records would be removed.
3. Run the actual local reset command and reload the signed-in workspace.
4. Confirm `/dashboard` shows a clean client workspace without stale evaluation counts or oversized synthetic graphs.
5. Confirm the Dashboard reports tab exposes recent reports or an intentional empty state.
6. Confirm `/reports` still works as a route fallback and includes obvious navigation back to the dashboard workspace.
7. Confirm `/evaluations` renders a clean empty state with clear next actions.

## Focused automated validation

1. `pnpm exec vitest run tests/web-ui/dashboard-workspace.test.tsx tests/web-ui/evaluations-list-view.test.tsx tests/web-ui/printable-report-view.test.tsx tests/web-ui/navigation.test.tsx`
2. Add and run a focused reset-path test command once the script lands.
3. For runtime/API changes, run `pnpm exec vitest run tests/runtime/api.test.ts tests/runtime/research-api.test.ts`.

## Follow-on validation for later slices

1. Parameter-state work must include focused case-form and mapping tests.
2. Research-intelligence scale work must include controlled 30,000-record queueing, ingestion, and review-gate checks before any warehouse totals are treated as accepted structured evidence.
