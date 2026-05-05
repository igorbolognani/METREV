# Quickstart - UI, API, Database, and Rule Engine Refactor

## Goals

- Validate the first runtime slice where `EvidenceDecisionContext` is built, returned, audited, and consumed by the rule engine for uncertainty framing.
- Provide an executable baseline before deeper rule-engine scoring and signed-in UI/admin separation work continues.

## Preconditions

- Dependencies installed with `pnpm install`.
- The workspace is using the current runtime code from `main` plus this feature branch/worktree.
- No special database setup is required for the first runtime slice because the focused tests use the in-memory repository path.

## Setup

1. Confirm the runtime test commands are available:

```bash
pnpm exec vitest --version
```

2. Optional: inspect the service entrypoint that now builds the context:

```bash
sed -n '360,520p' apps/api-server/src/services/case-evaluation.ts
```

3. Optional: inspect the rule-engine uncertainty block:

```bash
sed -n '1040,1105p' packages/rule-engine/src/index.ts
```

## Happy path

1. Run the focused runtime tests:

```bash
pnpm exec vitest run tests/runtime/rule-engine.test.ts tests/runtime/case-evaluation-service.test.ts
```

2. Confirm both test files pass and that the service test asserts `evaluation.evidence_decision_context` plus `audit_record.evidence_decision_context`.

3. Confirm the rule-engine test asserts that a context without benchmark ranges surfaces missing benchmark coverage in provenance notes and next-test guidance.

## Failure path

1. If the focused tests fail, inspect editor diagnostics for:
   - `packages/domain-contracts/src/schemas.ts`
   - `apps/api-server/src/services/case-evaluation.ts`
   - `packages/rule-engine/src/index.ts`
   - `packages/audit/src/index.ts`

2. Re-run the single failing test file for faster feedback:

```bash
pnpm exec vitest run tests/runtime/case-evaluation-service.test.ts
```

or

```bash
pnpm exec vitest run tests/runtime/rule-engine.test.ts
```

3. If a later slice changes persistence or public contracts, extend validation to `pnpm run test:python`, `pnpm run test:db`, and `pnpm run build`.

## Edge case

1. The in-memory repository returns an empty benchmark slice, which is intentional for the first slice.
2. The runtime must still emit a valid `EvidenceDecisionContext` with zero ranges, explicit missing dependencies, and a conservative uncertainty note.
3. Legacy payloads without `evidence_decision_context` should still parse because the runtime schema defaults this field to `null`.

## Verification commands and checks

- `pnpm exec vitest run tests/runtime/rule-engine.test.ts tests/runtime/case-evaluation-service.test.ts`
- `pnpm run test:python`
- `pnpm run build`
