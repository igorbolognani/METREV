# Active vs Reference Surfaces

## Purpose

This document is explanatory only. It summarizes
`docs/repository-authority-map.md` for easier review, but it does not override
that file. When there is any doubt, use `docs/repository-authority-map.md` as the
maintained authority index.

## Why This Matters

METREV has active runtime code, canonical domain assets, hardened contracts,
historical specs, generated exports, starter kits, and nested reference assets.
Those surfaces are useful, but they do not all have the same authority.

Without a clear active-versus-reference split, an agent or reviewer can
accidentally treat an old plan, generated export, or starter placeholder as live
project truth.

## Active Authority Surfaces

| Concern                         | Active surface                                                                                                                                   | Plain-language role                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Root governance                 | `AGENTS.md`, `.github/copilot-instructions.md`                                                                                                   | Rules for source of truth, workflow, domain semantics, validation, and agent behavior.                                            |
| Internal workflow               | `WORKFLOW.md`, `docs/internal-feature-workflow.md`, `specs/_templates/`, root `.github/prompts/`, root `.github/agents/`, root `.github/skills/` | Maintained process for planning, executing, reviewing, and validating work.                                                       |
| Repository automation           | Root `.github/workflows/`, root `package.json`, `tests/runtime/workflow-assets.test.ts`                                                          | CI, CodeQL, dependency automation, package scripts, and workflow regression checks.                                               |
| Semantic domain meaning         | `bioelectrochem_agent_kit/domain/`                                                                                                               | Canonical meaning of bioelectrochemical vocabulary, evidence semantics, defaults, uncertainty, compatibility, and scoring intent. |
| Hardened contract boundary      | `bioelectro-copilot-contracts/contracts/`                                                                                                        | Canonical validation, serialization, storage, and future API boundary shapes.                                                     |
| Executed runtime loading        | `packages/domain-contracts/src/loaders.ts`, `packages/domain-contracts/src/reconciliation.ts`                                                    | Code that determines which domain and contract assets are loaded or checked by runtime behavior.                                  |
| Runtime implementation          | `apps/`, `packages/`                                                                                                                             | Runnable Next.js, Fastify, worker, database, rule, audit, auth, telemetry, and shared logic code.                                 |
| Top-level runtime ownership     | `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `vitest*.ts`, `playwright.config.ts`, `docker-compose.yml`, root package scripts           | Workspace and validation orchestration for the monorepo.                                                                          |
| Authority regression checks     | `tests/runtime/domain-contracts.test.ts`, `tests/runtime/output-validator.test.ts`, `tests/contracts/test_canonical_vocabulary.py`               | Tests that help detect drift between domain, contracts, and runtime.                                                              |
| Repository cleanup umbrella     | `specs/015-repository-authority-and-structure-consolidation/`                                                                                    | Repository-wide cleanup and consolidation umbrella; interpret scope through the authority map.                                    |
| Active product roadmap          | `specs/020-metrev-three-phase-product-plan/`                                                                                                     | Current product-level roadmap for public, client-facing, and internal intelligence layers.                                        |
| Research integration pack       | `specs/019-research-intelligence-review-table-engine/`                                                                                           | Research-integration execution pack under the 020 roadmap; interpret it through the authority map.                                |
| Active public-route slice       | `specs/021-public-infographic-pages/`                                                                                                            | Current public educational route execution slice.                                                                                 |
| Active signed-in refactor slice | `specs/033-ui-api-database-rule-engine-refactor/`                                                                                                | Current owner for client/admin separation and `EvidenceDecisionContext` promotion.                                                |

## Reference-only or Future-facing Surfaces

| Surface                                                          | How to treat it                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `stack.md`                                                       | Legacy background context only.                                                  |
| `copilot_project_starter_detailed/`                              | Reusable starter scaffolding, not METREV product truth.                          |
| `bioelectrochem_agent_kit/.github/`                              | Antecedent domain-kit workflow reference, not active root workflow authority.    |
| `bioelectrochem_agent_kit/ALL_FILES_CODE.md`                     | Generated export artifact, not live source.                                      |
| `bioelectro-copilot-contracts/contracts/ontology/relations.yaml` | Future-facing until a validated runtime consumer exists.                         |
| Contract report templates                                        | Future-facing until runtime consumes them.                                       |
| `specs/_examples/`                                               | Examples only; use maintained templates and active numbered specs for live work. |
| Historical or superseded specs                                   | Background context unless the authority map marks them active.                   |
| `docs/historical-cleanup-notes.md`                               | Consolidated historical note, not active instruction.                            |

## Practical Rule for Reviewers

When a file says one thing and an active authority surface says another, trust
the active authority surface. If the conflict affects domain semantics or
contract shape, treat it as a repository defect to reconcile deliberately, not
as an invitation to patch only one layer.

## What This Document Does Not Do

This document does not promote, demote, delete, or redefine any repository
surface. It is a readable summary for orientation. Changes to authority must go
through the maintained owner files and human review.
