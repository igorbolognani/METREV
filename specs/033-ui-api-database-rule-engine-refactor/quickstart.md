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
pnpm exec vitest run tests/runtime/rule-engine.test.ts tests/runtime/case-evaluation-service.test.ts
```

1. Confirm both test files pass and that the service test asserts `evaluation.evidence_decision_context` plus `audit_record.evidence_decision_context`.

1. Confirm the rule-engine test asserts that a context without benchmark ranges surfaces missing benchmark coverage in provenance notes and next-test guidance.

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
- `pnpm run test:python`
- `pnpm run test:db`
- `pnpm run build`
- `pnpm run validate:fast`
