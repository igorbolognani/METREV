# Feature Specification - UI, API, Database, and Rule Engine Refactor

## Objective

Refactor METREV so the client-facing product is a decision workspace only, while canonical evidence becomes API-first decision infrastructure through `EvidenceDecisionContext` and related runtime/database integrations. Evidence Explorer, Evidence Review, and Research Tables must stop acting as client product surfaces and remain only as internal/admin tooling when still needed for curation and debug.

## Why

The current repository already contains a serious evidence warehouse, research workflow, benchmark refresh path, and evaluation stack, but the center of gravity is still split. The signed-in UI leaks evidence operations into the client workspace, and the evaluation service currently reduces canonical benchmark retrieval to an informational observation instead of a structured decision context. This refactor moves METREV toward the intended product shape: configuration in, evidence-aware decision output out, narrative last.

## Primary users

- Client-facing analysts who need a clean workflow for stack configuration, evaluation, report reading, and action planning.
- Internal analysts and engineering reviewers who need admin-only evidence curation, provenance inspection, and decision-context debugging.

## Affected layers

- domain semantics: `bioelectrochem_agent_kit/domain/` remains the semantic owner for evidence meaning, uncertainty framing, and admissibility intent.
- contract boundary: `bioelectro-copilot-contracts/contracts/` remains the hardened owner for storage-facing and validation-facing shapes that must eventually include `EvidenceDecisionContext`.
- runtime adapters: `apps/api-server/`, `packages/domain-contracts/`, `packages/database/`, `packages/rule-engine/`, `packages/audit/`
- UI: `apps/web-ui/` client routes and internal/admin evidence routes
- infrastructure: Prisma persistence and local validation commands where the context becomes queryable or replayable
- docs and workflow: this feature pack plus authority docs if execution ownership needs to be surfaced

## Scope

### In

- Introduce `EvidenceDecisionContext` into runtime contracts and evaluation flow.
- Route canonical evidence through the API and rule engine instead of keeping it as an attached benchmark-count side note.
- Remove evidence/research workspace surfaces from the client workflow and keep them internal/admin only.
- Preserve strict admissibility: pending, rejected, supplier-only, or non-decision-ready evidence cannot influence scoring as if it were validated benchmark evidence.
- Keep LLM output downstream of deterministic validation and provenance-aware scoring.

### Out

- Promise or attempt coverage of all papers, patents, or supplier documents in existence.
- Treat article browsing as a client-facing workflow.
- Replace the domain kit or hardened contract boundary with runtime-only vocabulary.

## Functional requirements

1. The evaluation service MUST build an `EvidenceDecisionContext` after normalization and before `runCaseEvaluation`.
2. The runtime response and audit record MUST persist the current decision context so later UI, reports, and replay/debug paths can consume it deterministically.
3. Only accepted, decision-ready, traceable evidence MAY populate the decision context as benchmark-supporting evidence.
4. The rule engine MUST consume the decision context at least for uncertainty framing immediately, and then for recommendation/scoring changes as the refactor progresses.
5. Client-facing navigation and pages MUST not foreground Evidence Explorer, Evidence Review, or Research Tables as part of the normal decision workflow.
6. Internal/admin evidence tooling MUST remain role-gated and clearly separated from the client workspace.
7. LLM narrative generation MUST explain validated outputs and context summaries only; it MUST NOT invent facts or bypass admissibility rules.

## Acceptance criteria

- [x] `EvidenceDecisionContext` is defined in runtime contracts and promoted to the hardened contract boundary and aligned domain owner files.
- [x] `createPersistedCaseEvaluation` builds, persists, and returns the decision context for new evaluations.
- [x] `runCaseEvaluation` uses the decision context to alter confidence, next-test guidance, and at least one recommendation/scoring pathway under test.
- [x] Viewer/client routes no longer expose evidence/research tools or evidence-operation metrics as primary workflow surfaces.
- [x] Analyst/admin users retain access to internal evidence tooling through explicit internal/admin navigation.
- [x] Focused tests prove that non-decision-ready evidence is excluded and that benchmark context changes user-visible decision output.

## Resolved implementation decisions

- Runtime contracts, hardened contract YAML, and domain owner files are aligned around `EvidenceDecisionContext` and evidence admissibility.
- Persistence uses a dedicated `EvidenceDecisionContextRecord` model linked one-to-one with `EvaluationRecord`, while audit snapshots still carry the same context for replay.
- Admin route migration uses analyst-gated `/admin/intelligence/...` pages as the only evidence/research UI routes; legacy `/evidence/*` and `/research/*` pages were removed and now resolve as 404s in the rebuilt local stack.
- Specs `002` through `033` are consolidated in `integration-audit.md`; historical route mentions in older specs are superseded by this feature rather than treated as active route requirements.

## Risks / unknowns

- If UI cleanup happens without evidence-context promotion, the product will look simpler but still lack evidence-aware decisions.
- If evidence-context promotion happens without strict admissibility rules, supplier claims or low-quality artifacts could be mistaken for validated scientific support.
- If persistence is added only as opaque JSON and never promoted, admin replay/debug may remain weaker than the product direction requires.
