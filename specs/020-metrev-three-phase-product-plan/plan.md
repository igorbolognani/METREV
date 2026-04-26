# Implementation Plan - METREV Three-Phase Product Integration

## Summary

Ship the product in three connected layers:

1. Public educational landing page.
2. Scientific instrument workspace for stack configuration, evaluations, dashboards, recommendations, and report delivery.
3. Internal intelligence layer for evidence, research, ingestion, audit, and report-grounded explanation.

## Source-of-Truth Files

- Domain semantics: `bioelectrochem_agent_kit/domain/`
- Hardened contracts: `bioelectro-copilot-contracts/contracts/`
- Runtime schemas: `packages/domain-contracts/src/schemas.ts`
- Runtime services and presenters: `apps/api-server/src/`
- Persistence: `packages/database/`
- LLM adapter: `packages/llm-adapter/`
- Web UI: `apps/web-ui/src/`
- Tests: `tests/runtime/`, `tests/web-ui/`, `tests/e2e/`

## Phase 0 - Repository Consolidation

- Create this 020 feature pack.
- Mark 016 as historical and superseded.
- Clarify 018 as an internal/advanced evidence workspace, not final report chat.
- Record 019 validation status honestly.
- Update `docs/repository-authority-map.md` and README so 020 becomes the active product roadmap.

## Phase 1 - Public Landing Page

- Replace route-map copy with an educational science/value narrative.
- Include sections for problem, technology primer, stack map, variables map, comparisons, ODS/SDG impact, JTBDs, METREV flow preview, and CTA.
- Keep claims conservative and avoid simulator promises.
- Keep unauthenticated access and signed-in redirect behavior unchanged.

## Phase 2 - Scientific Instrument Workspace

- Reorder signed-in navigation around Dashboard, Configure Stack, Evaluations, Reports.
- Move Evidence Explorer, Evidence Review, and Research Tables under Advanced/Internal.
- Reframe dashboard as workspace home and remove evidence/research as primary client actions.
- Keep cockpit-wizard submission compatible with `RawCaseInput`.
- Rename evaluation tabs to Diagnosis, Recommendations, Modeling, Roadmap & Suppliers, Report, Audit.
- Render `operating_window` series as a heatmap while preserving line charts for other series.
- Keep report as the primary deliverable with trace/audit collapsed by default.

## Phase 3 - Report-Grounded Conversation

- Add runtime schemas for request, response, turns, citations, grounding, and metadata.
- Build a backend-only report context from printable report, normalized case, decision output, assumptions/defaults, confidence, lineage, snapshots, suppliers, and simulation summary.
- Add `generateReportConversationAnswer` to the LLM adapter using current `disabled`, `stub`, and `ollama` modes.
- Persist conversations/turns in runtime storage.
- Add report-side drawer with citations, uncertainty, trace disclosure, and print exclusion.

## Data Bootstrap / Pipeline Hardening

- Prefer checkpointed/resumable bootstrap execution.
- Strengthen dedupe with DOI/title/hash strategies.
- Preserve accepted/rejected review state on re-ingestion.
- Preserve claim IDs when possible.
- Create/update claim-review state when catalog items are accepted.
- Record bootstrap summaries in quickstart/docs.

## Validation Order

1. `pnpm run test:python`
2. `pnpm run test:js`
3. `pnpm run test:db`
4. `pnpm run build`
5. `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`
6. `pnpm run db:bootstrap:bigdata`
7. `pnpm run test:e2e`
8. `pnpm run validate:fast`
9. `pnpm run validate:local` when Docker/local-view acceptance is required

## Risk Controls

- Keep changes additive where possible.
- Update tests alongside UI/API changes.
- Use existing local/stub/Ollama LLM posture.
- Do not expose raw warehouse internals to client chat.
- Record any validation command that cannot be run.

