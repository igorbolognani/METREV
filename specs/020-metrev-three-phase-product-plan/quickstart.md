# Quickstart - METREV Three-Phase Product Integration

## Local Smoke Path

1. Start the API and web app with `pnpm run dev`.
2. Open the public root page and confirm it explains the science/value story before login.
3. Sign in at `/login`.
4. Confirm the primary navigation shows Dashboard, Configure Stack, Evaluations, and Reports before Advanced/Internal links.
5. Open Dashboard and confirm it focuses on active/recent work, next action, and readiness rather than evidence backlog.
6. Create a new evaluation through Configure Stack.
7. Open the evaluation workspace and inspect Diagnosis, Recommendations, Modeling, Roadmap & Suppliers, Report, and Audit.
8. Open the printable report and use Ask this report.
9. Confirm chat UI is absent from browser print output.

## Report Conversation Modes

- `METREV_LLM_MODE=disabled`: the API returns a scoped disabled response without generated answer text.
- `METREV_LLM_MODE=stub`: the API returns deterministic, report-grounded text.
- `METREV_LLM_MODE=ollama`: the API calls the local Ollama-compatible endpoint and falls back to stub if the request fails.

Do not configure OpenAI runtime mode for this phase.

## Focused Validation Completed

The following focused checks are already passing for the implemented 020 slices, even though the full matrix below is still pending.

| Command                                                                                                                                                                                                                                                                | Status | Notes                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm exec vitest run tests/runtime/api.test.ts`                                                                                                                                                                                                                       | PASS   | Covers workspace report conversation stub, speculative refusal reuse, disabled no-answer posture, and Advanced/Internal route/API access expectations. |
| `pnpm exec vitest run tests/runtime/llm-adapter.test.ts`                                                                                                                                                                                                               | PASS   | Covers report-conversation stub, disabled, and ollama modes, plus the `uncertainty` versus `certain` refusal regression.                               |
| `pnpm exec vitest run --config vitest.postgres.config.ts tests/postgres/persistence.test.ts -t "persists report conversation sessions and turns through Prisma"`                                                                                                       | PASS   | Confirms report-conversation sessions and turns persist through Prisma with grounding, citations, and actor metadata.                                  |
| `pnpm exec vitest run tests/web-ui/public-landing.test.tsx tests/web-ui/navigation.test.tsx tests/web-ui/dashboard-workspace.test.tsx tests/web-ui/evaluation-cockpit.test.tsx tests/web-ui/evaluation-workbench.test.tsx tests/web-ui/printable-report-view.test.tsx` | PASS   | Confirms the current landing, navigation, dashboard, evaluation, modeling, and print-safe report IA for the client-primary path.                       |

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

## Validation Log

Update this table whenever the full implementation is validated.

| Command                                                                                         | Status | Notes                                                                                            |
| ----------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `pnpm run test:python`                                                                          | PASS   | Contract checks passed in the current 020 validation run.                                        |
| `pnpm run test:js`                                                                              | PASS   | Covered inside `validate:fast`; 36 files and 118 tests passed.                                   |
| `pnpm run test:db`                                                                              | PASS   | Postgres persistence suite passed against both Supabase-backed and isolated local runtime flows. |
| `pnpm run build`                                                                                | PASS   | Covered inside `validate:fast`; turbo build completed successfully.                              |
| `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2` | PASS   | Dry-run smoke completed during the 020 follow-through.                                           |
| `pnpm run db:bootstrap:bigdata`                                                                 | PASS   | Full bounded bootstrap completed with 31 runs, 758 stored records, and inventory summary output. |
| `pnpm run test:e2e`                                                                             | PASS   | Playwright E2E entrypoint passed after disabling the unstable Next dev segment explorer path.    |
| `pnpm run validate:fast`                                                                        | PASS   | Lint, JS tests, Python contract checks, and build all passed end to end.                         |
| `pnpm run validate:local`                                                                       | PASS   | Passed against an isolated Docker local-view stack after pinning local runtime and database env. |
