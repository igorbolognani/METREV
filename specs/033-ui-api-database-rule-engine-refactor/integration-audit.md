# Integration Audit - Specs 002 Through 033

## Purpose

Verify that feature pack `033-ui-api-database-rule-engine-refactor` consolidates the earlier runtime, UI, evidence intelligence, API, database, and rule-engine plans without leaving a second active product direction.

## Source-of-truth split

- Domain semantics remain owned by `bioelectrochem_agent_kit/domain/`.
- Hardened validation and storage-facing contract boundaries remain owned by `bioelectro-copilot-contracts/contracts/`.
- Runtime code in `apps/` and `packages/` adapts those owner layers rather than introducing a third vocabulary.
- Earlier specs remain historical delivery records. When an older spec names a legacy client route such as `/evidence/explorer`, `/evidence/review`, or `/research/reviews`, `033` supersedes the route placement with `/admin/intelligence/...` and the deleted legacy pages.

## Consolidated Spec Map

| Spec                                                 | Prior intent                                                                        | 033 integration decision                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 002-runtime-monorepo-foundation                      | Establish Next.js, Fastify, Prisma, packages, and testable monorepo runtime.        | Preserved as the runtime base; `033` adds evidence context through existing app/package boundaries.                                               |
| 003-root-workflow-autonomy                           | Root workflow, specs, validation, and agent operating rules.                        | Preserved; `033` follows the durable feature-pack workflow and records validation.                                                                |
| 004-evaluation-detail-completion                     | Evaluation detail, report, audit, and trace display completion.                     | Preserved; `033` feeds richer persisted context into evaluation/report surfaces.                                                                  |
| 005-case-evaluation-service-extraction               | Extract evaluation orchestration into API service boundaries.                       | Preserved; `033` extends `createPersistedCaseEvaluation` with the context builder before rule-engine execution.                                   |
| 006-wastewater-golden-case-preset                    | Stable wastewater case preset and regression baseline.                              | Preserved as fixture/preset context for runtime validation.                                                                                       |
| 007-analyst-cockpit-and-preset-registry              | Analyst cockpit and preset registry.                                                | Preserved; client workflow remains decision-first while evidence tooling moves to admin intelligence.                                             |
| 008-external-evidence-ingestion-foundation           | Initial external evidence ingestion and review-pending posture.                     | Preserved as ingestion foundation; `033` admits only accepted/reviewed/traceable records into decision context.                                   |
| 009-external-evidence-review-and-intake-gate         | Review and intake gates for evidence records.                                       | Preserved; review remains internal/admin and no longer appears as client product navigation.                                                      |
| 010-authority-runtime-hardening                      | Repository authority, Prisma/runtime, and contract invariants.                      | Preserved; `033` aligns domain YAML, hardened YAML, runtime schemas, and Python drift checks.                                                     |
| 011-analyst-ux-system                                | Shared workbench language across evaluation, comparison, and review.                | Preserved for internal analyst surfaces; client-facing navigation is narrowed to decision workflow.                                               |
| 012-workflow-doc-reconciliation                      | Root workflow and documentation consistency.                                        | Preserved; `033` adds this integration audit to make supersession explicit.                                                                       |
| 013-metrev-ui-ux-parity                              | Analytical workspace parity and decision-first UX language.                         | Preserved; `033` completes the decision-first client direction.                                                                                   |
| 014-local-first-professional-workspace               | Local-first professional workflow and E2E runtime.                                  | Preserved; `033` validates via rebuilt local-view stack and local-first Playwright flow.                                                          |
| 015-repository-authority-and-structure-consolidation | Authority and structure consolidation.                                              | Preserved; source-of-truth split remains unchanged.                                                                                               |
| 016-metrev-ui-refactor                               | Broad UI refactor including evidence review and dashboard density.                  | Superseded where it treated evidence review as a client route; retained for admin/internal component quality and dashboard density goals.         |
| 017-full-big-data-workspace                          | Big-data-ready evidence review, dashboard, evaluation, report, and replay surfaces. | Preserved as infrastructure scale target; client dashboard no longer exposes evidence-operation metrics.                                          |
| 018-evidence-intelligence-workspace                  | Evidence explorer and assistant workspace.                                          | Rehoused: Evidence Explorer survives only under `/admin/intelligence/evidence/explorer`; legacy `/evidence/explorer` pages are deleted.           |
| 019-research-intelligence-review-table-engine        | Research review tables and extraction workflow.                                     | Rehoused: Research Tables survive only under `/admin/intelligence/research/reviews`; legacy `/research/reviews` pages are deleted.                |
| 020-metrev-three-phase-product-plan                  | Product integration direction and report-centered client experience.                | Preserved; `033` implements the decision-first client surface and keeps LLM narrative downstream.                                                 |
| 021-public-infographic-pages                         | Public informational pages.                                                         | Unchanged; outside the signed-in evidence-engine refactor.                                                                                        |
| 022-metadata-evidence-intelligence                   | Metadata/evidence intelligence continuity.                                          | Preserved as evidence metadata background; runtime admission now requires traceable, decision-ready facts.                                        |
| 023-agentic-engineering-hardening                    | Schema-backed client/runtime boundaries and workflow hardening.                     | Preserved; `033` adds contract and runtime tests for the new context boundary.                                                                    |
| 024-agent-ci-governance-hardening                    | CI and agent governance.                                                            | Unchanged; validation commands remain rooted in package scripts.                                                                                  |
| 025-ci-security-automation                           | Security automation.                                                                | Unchanged by `033`.                                                                                                                               |
| 026-ci-local-smoke-validation                        | Docker-backed local smoke validation.                                               | Preserved; `033` uses `local:view:up` and Playwright local-first validation.                                                                      |
| 027-ci-workflow-semantic-lint                        | Workflow semantic lint.                                                             | Preserved; workflow asset tests remain green.                                                                                                     |
| 028-metrev-data-metadata-intelligence                | Data/metadata intelligence.                                                         | Preserved; source and locator metadata support decision-ready context traceability.                                                               |
| 029-logged-in-ui-admin-separation                    | Signed-in client/admin separation.                                                  | Implemented by `033`: admin evidence/research routes are analyst-gated and absent from VIEWER navigation/command palette.                         |
| 030-client-dashboard-research-intelligence           | Compact client dashboard and research intelligence.                                 | Consolidated: client dashboard is decision-focused; research intelligence is internal/admin, not client workflow.                                 |
| 031-production-scale-evidence-ingestion              | Production-scale evidence ingestion and server-backed filters.                      | Preserved as ingestion infrastructure; `033` excludes supplier-only, low-quality, closed, pending, rejected, or untraceable records from scoring. |
| 032-canonical-evidence-fulltext-hardening            | Full-text canonicalization, locator, page/table/cell traceability.                  | Preserved and enforced by `033` admission: source hash and locator are required before evidence enters decision context.                          |
| 033-ui-api-database-rule-engine-refactor             | Integrated UI/API/database/rule-engine evidence refactor.                           | Active consolidated implementation.                                                                                                               |

## Final Concordance Result

- `EvidenceDecisionContext` is canonical across domain ontology, hardened contract YAML, and runtime Zod schema.
- Source types cover papers, reviews, patents, datasheets, manuals/SOPs, technical reports, supplier documents, case studies, market reports, regulatory reports, and curated/internal source classes.
- Supplier claims remain separate from validated evidence and cannot increase scoring confidence without corroboration.
- Context persistence is dedicated per evaluation and still snapshotted in audit records.
- The API builder runs after normalization and before deterministic scoring.
- Rule-engine behavior changes recommendation/confidence output only from admissible benchmark context.
- LLM narrative receives a bounded summary and remains downstream of deterministic output.
- Client UI no longer exposes evidence/research pages, command palette entries, or dashboard evidence-operation metrics to VIEWER users.
- Admin evidence/research tooling remains under `/admin/intelligence/...` for analyst/admin workflows.

## Residual Notes

Historical specs intentionally retain the route names and implementation details that were true at the time they shipped. This audit is the durable reconciliation point: future implementation should follow `033` for product route placement and evidence-engine ownership unless a later feature explicitly supersedes it.
