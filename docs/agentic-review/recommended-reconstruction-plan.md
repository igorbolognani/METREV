# Recommended Reconstruction Plan

## Purpose

This is a future-facing strategy for preparing METREV for senior or team review.
It is not an execution record and does not approve changes. It should be used as
a planning aid after the current documentation-only phase is reviewed.

## Principles

- Preserve the domain-contract-runtime split.
- Keep changes small, reversible, and validated.
- Do documentation and investigation before correction when authority is unclear.
- Do not delete or rewrite historical material until active replacements are
  confirmed.
- Keep deterministic validation before narrative or LLM output.
- Treat Coach findings as signals for review, not as commands.

## Wave 1: Understanding and Documentation

Goal: make the repository understandable without changing behavior.

Preserve:

- `AGENTS.md`, `WORKFLOW.md`, `README.md`, and `docs/repository-authority-map.md`
  as the primary orientation surface.
- `docs/agentic-review/baseline.md` as the recorded before-state.
- The Phase 2B test fix as a separate minimal correction.

Inspect:

- Whether the six comprehension reports are accurate enough for founder and
  senior-review use.
- Whether validation status in documentation matches commands actually run.
- Whether older specs are clearly labeled by active, historical, or reference
  role.

Avoid touching early:

- Domain files, contract files, runtime loaders, package scripts, and workflow
  files.

Requires human approval:

- Promoting any report language into formal authority docs.
- Moving these reports outside `docs/agentic-review/`.

## Wave 2: Authority Cleanup

Goal: reduce confusion without losing important history.

Preserve:

- The active authority model in `docs/repository-authority-map.md`.
- Root-owned workflow surfaces under `WORKFLOW.md`, `docs/internal-feature-workflow.md`,
  root `.github/`, and `specs/_templates/`.
- Reference kits as background until a deletion or archive decision is reviewed.

Inspect:

- Nested `.github/` folders that are reference-only.
- Historical specs that are superseded but still useful.
- Generated exports that should never be treated as live source.

Avoid touching early:

- Any file whose authority role is ambiguous.
- Any spec that is still named active in the authority map.

Requires human approval:

- Deleting, moving, or archiving reference material.
- Editing `AGENTS.md`, `.github/copilot-instructions.md`, or
  `docs/repository-authority-map.md`.

## Wave 3: Validation Hardening

Goal: make validation status easy to trust.

Preserve:

- `pnpm run validate:fast` as the first broad gate.
- `pnpm run test:workflow-assets` and `pnpm run lint:workflow-semantics` as
  focused workflow/governance checks.
- `validate:advanced` and `validate:local` as separate heavier matrices.

Inspect:

- Tests that assert framework internals, such as Next redirect digest behavior.
- Tests that call route wrappers directly and need accurate App Router props.
- Any validation command that depends on Docker, local ports, or external
  provider availability.

Avoid touching early:

- Package scripts and CI workflow definitions unless the validation behavior
  itself is the approved scope.

Requires human approval:

- Reclassifying a red validation gate as acceptable.
- Changing CI or promoted validation scripts.

## Wave 4: Domain-Contract Alignment

Goal: verify semantic and contract alignment before product behavior changes.

Preserve:

- `bioelectrochem_agent_kit/domain/` as semantic source of truth.
- `bioelectro-copilot-contracts/contracts/` as hardened contract boundary.
- `packages/domain-contracts/src/loaders.ts` and
  `packages/domain-contracts/src/reconciliation.ts` as executed runtime loading
  and reconciliation surfaces.

Inspect:

- Domain vocabulary used by runtime UI labels and API responses.
- Contract fields used in persistence, validation, and reports.
- Any adapter that translates between domain terminology and runtime shapes.

Avoid touching early:

- Ontology, rules, case templates, supplier normalization, report contracts, and
  evidence semantics unless the review explicitly includes counterpart updates
  and regression tests.

Requires human approval:

- Any change to domain vocabulary, contract shape, output schema, or persistence
  shape.

## Wave 5: Runtime Simplification

Goal: simplify runnable code only after authority and validation are clear.

Preserve:

- Runtime boundaries: deployables in `apps/`, shared libraries in `packages/`,
  tests in `tests/`, orchestration in root config.
- Client/admin separation from `specs/033-ui-api-database-rule-engine-refactor/`.
- Evidence admissibility and provenance discipline.

Inspect:

- UI code that may contain business rules better owned by packages.
- API handlers that may need thinner validate/delegate/return flow.
- Database paths that persist audit or evidence context.
- Route compatibility wrappers and test patterns.

Avoid touching early:

- Multi-layer runtime flows unless focused tests already exist or are added in
  the same approved slice.

Requires human approval:

- Any refactor that changes user-facing routes, API response shape, persistence,
  or decision output.

## Wave 6: Prompt, Agent, and Skill Consolidation

Goal: reduce agentic friction without creating more authority noise.

Preserve:

- Root-owned prompt, agent, skill, and instruction surfaces.
- Human approval before promoting durable learning.

Inspect:

- Repeated kickoff and review prompts from Coach findings.
- Oversized always-on instructions.
- Prompt files with weak structure or non-imperative phrasing.
- Long-session drift and compaction patterns.

Avoid touching early:

- `.github/copilot-instructions.md` or root prompt/skill files without a focused
  approved plan.

Requires human approval:

- Creating new prompts or skills.
- Changing global instructions.
- Removing existing guidance.

## Wave 7: Senior/Team Review Package

Goal: give reviewers a compact, evidence-backed package.

Include:

- `docs/agentic-review/baseline.md`
- this six-report comprehension set
- latest `git log --oneline` for the experiment branch
- validation results, including which commands were run and which were not
- a list of active authority surfaces and reference-only surfaces
- the known architecture risks and open questions
- recommended first code review target, likely the already-fixed route test
  mismatch and any adjacent redirect-test coupling

Avoid:

- Asking reviewers to infer active authority from file names alone.
- Presenting future reconstruction waves as already approved work.
- Hiding the fact that validation status is command-specific.

Requires human approval:

- Turning this plan into a formal spec pack.
- Opening PRs or merging into `main`.
- Scheduling deletion or broad refactor work.

## Suggested First Senior Review Questions

1. Does the authority map correctly reflect what the team wants active today?
2. Are any domain or contract assets mislabeled as future-facing or active?
3. Is `EvidenceDecisionContext` now represented in all necessary layers?
4. Which validation matrix should block merges for this stage of the project?
5. Which historical specs should remain as context, and which should be archived
   more visibly?
6. Which repeated agentic workflows deserve prompts or skills, and which should
   stay as human judgment?
