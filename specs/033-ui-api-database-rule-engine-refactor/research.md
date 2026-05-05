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
- The in-memory repository benchmark query intentionally returns an empty slice, which is useful for verifying conservative fallback behavior.
- The signed-in navigation already distinguishes client workspace from admin intelligence conceptually, but the dashboard and several client-adjacent components still expose evidence metrics or admin deep links.
- The first runtime slice is now implemented: `EvidenceDecisionContext` exists in runtime schemas, is returned on `EvaluationResponse`, is stored in `AuditRecord`, and is passed to `runCaseEvaluation`.
- The rule engine now consumes the context for uncertainty framing by surfacing benchmark coverage or absence in provenance notes and next-test guidance.

## Decisions

- Start implementation in runtime contracts and evaluation orchestration before touching signed-in UI hierarchy, so the UI simplification has a real evidence-aware backend to depend on.
- Keep the first slice additive and low-risk: no hard scoring changes yet, but explicit context propagation and rule-engine consumption are now in place.
- Treat empty benchmark coverage as an explicit condition that should remain visible to the user through uncertainty guidance rather than disappearing silently.

## Open blockers

- Hardened YAML/domain-owner promotion of `EvidenceDecisionContext` and admissibility semantics is still pending.
- The client/admin route re-housing policy has not yet been implemented, so evidence tooling still exists in the current signed-in app structure.

## Impact on plan

- The next runtime slice should deepen rule-engine usage from uncertainty notes into recommendation and score changes backed by tests.
- The next UI slice should remove evidence-operation metrics and deep links from client-facing routes while keeping internal/admin tooling available behind explicit analyst/admin navigation.

## Validation executed in this implementation batch

- PASS `pnpm exec vitest run tests/runtime/case-evaluation-service.test.ts`
- PASS `pnpm exec vitest run tests/runtime/rule-engine.test.ts tests/runtime/case-evaluation-service.test.ts`
