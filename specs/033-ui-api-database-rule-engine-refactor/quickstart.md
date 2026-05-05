# Quickstart - UI, API, Database, and Rule Engine Refactor

## Goals

- Validate the complete runtime slice where `EvidenceDecisionContext` is built, returned, audited, persisted, and consumed by the rule engine for uncertainty framing and benchmark-backed recommendations.
- Provide an executable baseline for the signed-in client/admin separation and traceability hardening work.

## Preconditions

- Dependencies installed with `pnpm install`.
- The workspace is using the current runtime code from `main` plus this feature branch/worktree.
- PostgreSQL-backed validation requires the active `DATABASE_URL`/`DIRECT_URL` database to have current Prisma migrations and local seed users applied.

## Setup

1. Confirm the runtime test commands are available:

```bash
pnpm exec vitest --version
```

1. Apply pending database migrations when running PostgreSQL-backed validation:

```bash
pnpm run db:migrate:deploy
```

1. Optional: inspect the service entrypoint that now builds the context:

```bash
sed -n '360,520p' apps/api-server/src/services/case-evaluation.ts
```

1. Optional: inspect the rule-engine uncertainty block:

```bash
sed -n '1040,1105p' packages/rule-engine/src/index.ts
```

## Happy path

1. Run the focused runtime tests:

```bash
pnpm exec vitest run tests/runtime/evidence-decision-context-builder.test.ts tests/runtime/refresh-evidence-benchmarks.test.ts tests/runtime/llm-adapter.test.ts tests/runtime/rule-engine.test.ts tests/web-ui/command-palette.test.tsx
```

1. Confirm the focused tests pass and cover builder admission, benchmark refresh filters, LLM bounded context summaries, rule-engine confidence/scoring effects, and command-palette RBAC.

1. Confirm the Postgres persistence test asserts `evidence_decision_context` on create/fetch and the dedicated `EvidenceDecisionContextRecord` relation.

1. Confirm the web build route map contains `/admin/intelligence/...` evidence/research routes and does not contain legacy `/evidence/*` or `/research/*` pages.

## Failure path

1. If the focused tests fail, inspect editor diagnostics for:
   - `packages/domain-contracts/src/schemas.ts`
   - `apps/api-server/src/services/case-evaluation.ts`
   - `packages/rule-engine/src/index.ts`
   - `packages/audit/src/index.ts`

1. Re-run the single failing test file for faster feedback:

```bash
pnpm exec vitest run tests/runtime/case-evaluation-service.test.ts
```

or

```bash
pnpm exec vitest run tests/runtime/rule-engine.test.ts
```

1. If persistence or public contracts fail, re-run the smallest affected check first, then finish with `pnpm run test:python`, `pnpm run test:db`, and `pnpm run build`.

## Edge case

1. The in-memory repository returns an empty benchmark slice, which is intentional for the first slice.
1. The runtime must still emit a valid `EvidenceDecisionContext` with zero ranges, explicit missing dependencies, and a conservative uncertainty note.
1. Legacy payloads without `evidence_decision_context` should still parse because the runtime schema defaults this field to `null`.

## Verification commands and checks

- `pnpm exec vitest run tests/runtime/rule-engine.test.ts tests/runtime/case-evaluation-service.test.ts`
- `pnpm exec vitest run tests/runtime/evidence-decision-context-builder.test.ts tests/runtime/refresh-evidence-benchmarks.test.ts tests/runtime/llm-adapter.test.ts tests/web-ui/command-palette.test.tsx`
- `pnpm run test:python`
- `pnpm run test:db`
- `pnpm run evidence:benchmark:refresh`
- `pnpm run build`
- `pnpm run validate:fast`
- `pnpm run validate:advanced`
- `PLAYWRIGHT_BASE_URL='http://localhost:3012' PLAYWRIGHT_API_BASE_URL='http://localhost:4012' pnpm exec playwright test tests/e2e/local-first-workspace.spec.ts --grep "covers review, intake, submitting, result, exports, report, history, and comparison"`
