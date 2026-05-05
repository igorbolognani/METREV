# Implementation Plan - UI, API, Database, and Rule Engine Refactor

## Summary

Refactor METREV so the signed-in product centers on configuration, evaluation, recommendations, roadmap, and reports, while canonical evidence becomes a first-class decision input through `EvidenceDecisionContext`. The implementation introduces the runtime contract, wires it through evaluation, audit, rule-engine scoring, persistence, and client/admin route separation, and validates the full slice with repository checks.

## Source-of-truth files

- `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`
- `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/evidence-pack.schema.yaml`
- `bioelectro-copilot-contracts/contracts/rules/evidence_score.yaml`
- `packages/domain-contracts/src/schemas.ts`
- `apps/api-server/src/services/case-evaluation.ts`
- `packages/rule-engine/src/index.ts`
- `packages/database/prisma/schema.prisma`
- `apps/web-ui/src/lib/navigation.ts`

## Affected layers and areas

- Runtime contract addition and propagation into evaluation response and audit record.
- Evaluation service orchestration and benchmark-slice translation into decision context.
- Rule-engine consumption of evidence context for uncertainty framing first, then recommendation/scoring changes.
- Database persistence, replay/debug, and later query support for decision contexts.
- Signed-in UI navigation and page hierarchy for client versus internal/admin surfaces.

## Required durable artifacts

- `spec.md`: records scope, constraints, and acceptance criteria.
- `plan.md`: records execution order, owner files, and safety boundaries.
- `tasks.md`: tracks implementation and validation state.
- `quickstart.md`: records reproducible validation and inspection steps.
- `research.md`: records repo inspection findings and validated runtime observations.
- `contracts/`: records temporary planning notes for the contract-promotion path.

## Research inputs

- `docs/repository-authority-map.md`
- `specs/020-metrev-three-phase-product-plan/`
- `specs/029-logged-in-ui-admin-separation/`
- `specs/030-client-dashboard-research-intelligence/`
- `specs/031-production-scale-evidence-ingestion/`
- `specs/032-canonical-evidence-fulltext-hardening/`

## Contracts and canonical owner files

- contracts affected: runtime `packages/domain-contracts/src/schemas.ts`, hardened YAML contracts, and domain-owner ontology files now include `EvidenceDecisionContext`, expanded source types, admissibility rules, and traceability preservation requirements.
- canonical owner files: domain evidence ontology and hardened contract YAML files listed above.
- planning-only notes under `specs/<feature>/contracts/`: `contracts/evidence-decision-context.md`

## Data model or boundary changes

- The implementation stores `evidence_decision_context` in `EvaluationResponse`, `AuditRecord`, and a dedicated Prisma `EvidenceDecisionContextRecord` linked to each persisted evaluation.
- The evaluation service builds context from the benchmark slice query and accepted decision-ready catalog evidence references only.
- The database layer hydrates current and idempotent evaluation reads from the dedicated record with an audit fallback for legacy rows.

## Implementation steps

1. Create the feature pack and record the initial cross-layer direction.
2. Introduce runtime `EvidenceDecisionContext` schemas and attach them to evaluation/audit surfaces.
3. Build the evaluation-service adapter from `getEvidenceBenchmarkSlice(...)` into a structured context.
4. Pass the context into `runCaseEvaluation` and consume it for uncertainty framing.
5. Promote the contract to hardened YAML/domain owners and align runtime loaders/tests.
6. Expand rule-engine use from uncertainty notes into recommendation and score changes backed by focused tests.
7. Refactor signed-in UI navigation and routes so evidence/research tooling becomes internal/admin only.
8. Harden persistence and replay/debug paths for the decision context.
9. Preserve structured full-text and claim locators so decision-ready canonical facts require traceable source spans.
10. Run focused runtime, contract, UI, DB, lint, build, and fast repository validation.

## Validation strategy

- unit: `tests/runtime/rule-engine.test.ts`, `tests/runtime/case-evaluation-service.test.ts`, canonicalization and source-artifact regression tests
- integration: API/runtime evaluation tests and PostgreSQL persistence tests covering the dedicated decision-context record
- UI/RBAC: signed-in navigation, advanced route pages, dashboard, case history, evaluation workbench, evidence selector, explorer, and research review tests
- docs/contracts: this feature pack plus owner-file promotion and Python contract checks

## Critique summary

The main failure mode would be a purely cosmetic UI cleanup that leaves the evidence warehouse disconnected from decision logic. The plan therefore starts in runtime contracts and evaluation flow, then uses the same context to drive UI simplification later. Another failure mode is treating any attached evidence as decision-grade; the runtime contract and builder explicitly keep admissibility and exclusion visible.

## Refined final plan

Use vertical slices that end in executable validation. The complete slice is implemented: `EvidenceDecisionContext` exists, is returned, audited, persisted, consumed by the rule engine for uncertainty and benchmark-backed material recommendations, promoted to owner files, and reflected in client/admin UI separation.

## Rollback / safety

- The current runtime slice is additive: omitting `evidence_decision_context` in legacy payloads still parses because the schema defaults to `null`.
- If the new context becomes unstable, evaluation can temporarily fall back to the previous benchmark observation path without deleting existing audit snapshots.
- UI route refactors have removed legacy client-facing evidence/research pages after the internal/admin paths settled; rollback would restore only the deleted redirect stubs, not duplicate client-facing evidence tooling.
