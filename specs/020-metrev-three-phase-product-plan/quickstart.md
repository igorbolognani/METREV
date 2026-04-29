# Quickstart - METREV Three-Phase Product Integration

## Local Smoke Path

1. Start the validated local-view stack with `pnpm run local:view:start` or `pnpm run local:view:up`.
2. Open the public root page and confirm it explains the science/value story before login.
3. Sign in at `/login`.
4. Confirm the primary navigation shows Dashboard, Configure Stack, Evaluations, and Reports before Advanced/Internal links.
5. Open Dashboard and confirm it focuses on active/recent work, next action, and readiness rather than evidence backlog.
6. Create a new evaluation through Configure Stack.
7. Open the evaluation workspace and inspect Diagnosis, Recommendations, Modeling, Roadmap & Suppliers, Report, and Audit.
8. Open the printable report, use Ask this report, and confirm a follow-up question keeps the report section grounding through the persisted conversation ID.
9. Confirm chat UI is absent from browser print output.

## Report Conversation Modes

- `METREV_LLM_MODE=disabled`: the API returns a scoped disabled response without generated answer text.
- `METREV_LLM_MODE=stub`: the API returns deterministic, report-grounded text.
- `METREV_LLM_MODE=ollama`: the API calls the local Ollama-compatible endpoint and falls back to stub if the request fails.

Unsupported runtime modes fall back deterministically. The supported local-first modes for this phase are `disabled`, `stub`, and `ollama`.

## Focused Validation Completed

The following focused checks and the deterministic advanced matrix are already passing for the implemented 020 slices.

- PASS `pnpm exec vitest run tests/runtime/api.test.ts`: Covers workspace report conversation stub, speculative refusal reuse, disabled no-answer posture, and Advanced/Internal route/API access expectations.
- PASS `pnpm exec vitest run tests/runtime/llm-adapter.test.ts`: Covers report-conversation stub, disabled, and ollama modes, plus the `uncertainty` versus `certain` refusal regression.
- PASS `pnpm exec vitest run --config vitest.postgres.config.ts tests/postgres/persistence.test.ts -t "persists report conversation sessions and turns through Prisma"`: Confirms report-conversation sessions and turns persist through Prisma with grounding, citations, and actor metadata.
- PASS `pnpm exec vitest run tests/web-ui/public-landing.test.tsx tests/web-ui/navigation.test.tsx tests/web-ui/dashboard-workspace.test.tsx tests/web-ui/evaluation-cockpit.test.tsx tests/web-ui/evaluation-workbench.test.tsx tests/web-ui/printable-report-view.test.tsx`: Confirms the current landing, navigation, dashboard, evaluation, modeling, and print-safe report IA for the client-primary path.
- PASS `pnpm run validate:advanced`: Runs the deterministic advanced research and big-data matrix, including focused worker/API/UI coverage plus the curated-manifest-only bootstrap dry-run.

When schema-backed persistence changes land, regenerate the Prisma client and apply committed migrations before relying on Postgres-backed report-conversation validation:

1. `pnpm --filter @metrev/database prisma:generate`
2. `pnpm --filter @metrev/database prisma:migrate:deploy`

## Bootstrap Notes

Repository-safe fixtures remain small. Full local intelligence requires:

```bash
pnpm run db:bootstrap:bigdata
```

Dry-run smoke:

```bash
pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2
```

Checkpointed resume uses the latest source/query checkpoint recorded under the `bigdata_bootstrap` trigger mode, so repeated bounded runs can continue from the last stored provider cursor instead of restarting from page one.

## Validation Log

Update this list whenever the validation baseline changes.

Current repository-owned CI promotion decision: keep `validate:advanced` as a separate deterministic post-fast gate in parallel with `validate:local`, and use `pnpm run validate:full` when a local operator wants the full promoted matrix in one command.

- PASS `pnpm run test:python`: Contract checks passed in the current 020 validation run.
- PASS `pnpm run test:js`: Covered inside `validate:fast`; 36 files and 118 tests passed.
- PASS `pnpm run test:db`: Postgres persistence suite passed against both Supabase-backed and isolated local runtime flows.
- PASS `pnpm run build`: Covered inside `validate:fast`; turbo build completed successfully.
- PASS `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`: Dry-run smoke completed during the 020 follow-through.
- PASS `pnpm run db:bootstrap:bigdata`: Full bounded bootstrap completed with 31 runs, 758 stored records, and inventory summary output.
- PASS `pnpm run validate:advanced`: Deterministic advanced matrix passed with focused research/big-data tests plus the curated-manifest-only bootstrap dry-run.
- PASS `pnpm run test:e2e`: Playwright E2E entrypoint passed after disabling the unstable Next dev segment explorer path.
- PASS `pnpm run validate:fast`: Lint, JS tests, Python contract checks, and build all passed end to end.
- PASS `pnpm run validate:local`: Passed against an isolated Docker local-view stack after pinning local runtime and database env; this is now the second CI gate after `validate:fast`.
