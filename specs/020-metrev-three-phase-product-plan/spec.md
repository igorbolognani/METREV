# Feature Specification - METREV Three-Phase Product Integration

## Objective

Reframe METREV as a connected product with a public educational layer, a client-facing scientific instrument workspace, and an internal intelligence layer for evidence, research, audit, and ingestion operations.

## Product Model

METREV is an auditable decision-support platform for bioelectrochemical systems. It is not a generic website, a chat-first database browser, or a full multiphysics simulator. The user-facing product should help an engineer configure a system stack, compare it against treated evidence and deterministic rules, inspect outputs and recommendations, generate a report, and ask grounded questions about that report.

## Superseded and Related Specs

- `specs/016-metrev-ui-refactor/` is superseded as active execution and remains historical design-system context only.
- `specs/017-full-big-data-workspace/` remains the completed big-data, persistence, and cockpit baseline.
- `specs/018-evidence-intelligence-workspace/` remains an internal/advanced evidence instrument. Its assistant is not the final report conversation feature.
- `specs/019-research-intelligence-review-table-engine/` remains an internal scientific research-table tool. Full validation must be recorded before treating it as fully closed.

## Scope

### In

- Public landing page that explains the science, obstacles, ODS/SDG impact, METREV value, and the configure-to-report flow.
- Signed-in navigation centered on Dashboard, Configure Stack, Evaluations, and Reports.
- Advanced/Internal grouping for Evidence Explorer, Evidence Review, and Research Tables.
- Dashboard reframed as a workspace home for active cases, recent evaluations, reports, readiness, and next actions.
- Stack configuration cockpit-wizard direction anchored to canonical domain and contract vocabulary.
- Evaluation workspace labels reframed for client clarity: Diagnosis, Recommendations, Modeling, Roadmap & Suppliers, Report, and Audit.
- Modeling surface renders `operating_window` `x/y/z` series as heatmap-style sensitivity output.
- Printable report remains the main deliverable and includes collapsed traceability.
- Report-grounded conversation using backend-built context packages and current LLM modes: `disabled`, `stub`, `ollama`.
- Targeted data/bootstrap hardening for resumability, dedupe, review-state preservation, claim-review consistency, and lineage persistence.

### Out

- Runtime OpenAI provider support.
- A free-form simulator or unconstrained "what-if" chat.
- Client-visible raw evidence database browsing as the primary workflow.
- Hidden defaults, hidden missing data, or unsupported certainty claims.

## Functional Requirements

1. Public visitors must see an educational, professional landing page before logging in.
2. Signed-in users must enter a clean workspace where the main path is configure stack, review evaluations, open reports, and continue recent work.
3. Internal evidence/research surfaces must remain available but moved behind Advanced/Internal navigation.
4. Evaluation results must keep all existing exports, history, comparison, audit, and modeling behavior while using client-facing labels.
5. The report page must expose "Ask this report" without adding chat UI to print output.
6. Report conversation answers must be grounded in a server-built context package, not direct database access.
7. Report conversation must refuse or constrain unsupported requests, guarantees, raw database dumping, and speculative recalculation.
8. Data ingestion/bootstrap work must avoid silently losing analyst review status or breaking citations.

## Acceptance Criteria

- [x] `specs/020-metrev-three-phase-product-plan/` exists with spec, plan, tasks, quickstart, research, and report-conversation boundary note.
- [x] Repository authority docs identify 020 as the active product roadmap.
- [x] README distinguishes client-facing surfaces from internal/advanced surfaces.
- [x] 016/018/019 specs are reconciled so future agents do not treat stale wording as active direction.
- [ ] Public landing tests cover science/value sections and absence of prototype route-map copy.
- [ ] Navigation and dashboard tests reflect client-first IA and Advanced/Internal grouping.
- [ ] Evaluation/report tests cover new tab labels, heatmap rendering, print-safe report, and report conversation UI.
- [ ] Runtime/API tests cover report conversation contracts, stub mode, fallback behavior, and persistence.
- [ ] Bootstrap/data tests cover dry-run, dedupe, review-state preservation, claim-review counts, and lineage persistence.
- [ ] Validation results are recorded in `quickstart.md`.

## Guardrails

- Keep domain vocabulary in `bioelectrochem_agent_kit/domain/`.
- Keep validation and persistence-facing shapes aligned with `bioelectro-copilot-contracts/contracts/` and `packages/domain-contracts`.
- Keep business logic out of the UI.
- Never claim production-like big-data intelligence unless the bootstrap and validation matrix has been run and recorded.
- Keep evidence and audit traceable, but expose them through deliberate "why", "trace", and Advanced/Internal interactions.

