# Research Notes - UI, API, Database, and Rule Engine Refactor

## Goal

Confirm the concrete runtime and UI starting point before implementing a full refactor that removes evidence tooling from the client workflow and promotes canonical evidence into API-first decision infrastructure.

## Questions

- Where does the current evaluation flow actually consume benchmark evidence, and how much of it is structured versus informational only?
- Which signed-in UI surfaces still leak evidence/research operations into the client-facing workspace?

## Inputs consulted

- docs:
  - `docs/repository-authority-map.md`
  - `.github/copilot-instructions.md`
  - `AGENTS.md`
- repo files:
  - `apps/api-server/src/services/case-evaluation.ts`
  - `packages/domain-contracts/src/schemas.ts`
  - `packages/rule-engine/src/index.ts`
  - `packages/audit/src/index.ts`
  - `packages/database/src/index.ts`
  - `apps/web-ui/src/lib/navigation.ts`
  - `apps/web-ui/src/components/dashboard-workspace.tsx`
  - `apps/web-ui/src/components/case-form.tsx`
  - `tests/runtime/case-evaluation-service.test.ts`
  - `tests/runtime/rule-engine.test.ts`
- experiments:
  - `pnpm exec vitest run tests/runtime/case-evaluation-service.test.ts`
  - `pnpm exec vitest run tests/runtime/rule-engine.test.ts tests/runtime/case-evaluation-service.test.ts`

## Findings

- Before this feature started, `createPersistedCaseEvaluation` fetched a benchmark slice and only converted it into a derived observation plus provenance note; the rule engine did not receive a structured evidence context.
- `EvidenceDecisionContext` now exists in runtime schemas, is returned on `EvaluationResponse`, is stored in `AuditRecord`, is persisted through `EvidenceDecisionContextRecord`, and is hydrated on evaluation fetch.
- The builder independently admits only accepted, reviewed, traceable, non-low-quality benchmark evidence; rejected records are represented through exclusion summaries rather than scoring inputs.
- The database benchmark slice and refresh SQL now filter out pending/rejected, supplier-only, closed-access, low-quality, untraceable, or non-normalized evidence before decision context construction.
- The rule engine consumes the context for benchmark-backed material recommendations, confidence reduction when context remains low-confidence, provenance notes, and next-test guidance.
- LLM narrative generation receives only a bounded context summary after deterministic validation and cannot use the full evidence corpus as a decision source.
- Signed-in client navigation and route hierarchy now keep evidence/research tooling under `/admin/intelligence/...`; legacy `/evidence/*` and `/research/*` pages were removed rather than left as client-visible redirects.

## Decisions

- Start implementation in runtime contracts and evaluation orchestration before touching signed-in UI hierarchy, so the UI simplification has a real evidence-aware backend to depend on.
- Keep runtime evidence admissibility defensive in both the database query and the context builder so malformed slices cannot silently admit non-decision-ready records.
- Treat empty benchmark coverage as an explicit condition that should remain visible to the user through uncertainty guidance rather than disappearing silently.
- Remove legacy evidence/research route stubs after the admin route map and E2E flow validated, making the old paths resolve as 404s instead of compatibility redirects.

## Open blockers

- None for this feature pack after final validation.

## Impact on plan

- The implementation plan is closed for feature `033`: owner contracts are promoted, runtime context is persisted and consumed, client routes are decision-first, admin tooling is role-gated, and legacy evidence/research pages are gone.
- Future enhancements should be new scoped features, not unfinished phases of this refactor.

## Validation executed in this implementation batch

- PASS `pnpm exec vitest run tests/runtime/case-evaluation-service.test.ts`
- PASS `pnpm exec vitest run tests/runtime/rule-engine.test.ts tests/runtime/case-evaluation-service.test.ts`
- PASS `pnpm exec vitest run tests/runtime/evidence-decision-context-builder.test.ts tests/runtime/refresh-evidence-benchmarks.test.ts tests/runtime/llm-adapter.test.ts tests/runtime/rule-engine.test.ts tests/web-ui/command-palette.test.tsx`
- PASS `pnpm exec vitest run tests/runtime/refresh-evidence-benchmarks.test.ts`
- PASS `pnpm run evidence:benchmark:refresh`
- PASS `pnpm run test:python`
- PASS `pnpm run test:db`
- PASS `pnpm run validate:fast`
- PASS `pnpm run validate:advanced`
- PASS `pnpm run local:view:up`
- PASS `PLAYWRIGHT_BASE_URL='http://localhost:3012' PLAYWRIGHT_API_BASE_URL='http://localhost:4012' pnpm exec playwright test tests/e2e/local-first-workspace.spec.ts --grep "covers review, intake, submitting, result, exports, report, history, and comparison"`
- PASS legacy route check: `/evidence/explorer`, `/evidence/review`, and `/research/reviews` return `404` on the rebuilt local stack.
