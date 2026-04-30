# METREV Workflow Contract

## Purpose

This file is the repo-owned operational contract for agentic execution in METREV.
It complements `AGENTS.md` and `.github/copilot-instructions.md` by defining how
tasks move from request to verified change.

## Task Units

- Small, localized fixes may proceed directly when the source-of-truth files and
  verification path are obvious.
- Medium and large changes must use `specs/NNN-feature-slug/` with `spec.md`,
  `plan.md`, `tasks.md`, and `quickstart.md`.
- `research.md` and planning-only `contracts/` notes are conditional artifacts,
  not default ones.

## Default Execution Loop

1. Explore the request in repository context.
2. Plan against the source-of-truth files and required validation.
3. Approve the plan before broad implementation.
4. Implement in small, reversible slices.
5. Validate with the narrowest objective checks first.
6. Review for drift, regressions, and unsupported assumptions.
7. Capture durable learning only after human review.

## Roles

- `workflow-orchestrator`: drives a change end to end.
- `planner`: decomposes work and defines validation.
- `reviewer`: critiques correctness, regression risk, and architectural fit.
- `validation-sentinel`: audits provenance, defaults, uncertainty, and trust.

## Guardrails

- Keep work aligned to `bioelectrochem_agent_kit/domain/` and
  `bioelectro-copilot-contracts/contracts/`.
- Use file-stem agent identifiers in prompt front matter: `planner`,
  `reviewer`, `validation-sentinel`, and `workflow-orchestrator`.
- Keep `AGENTS.md` human-curated. Agents may propose learnings, but humans
  approve promotion.
- Prefer one file owner per active task. Do not let parallel agents edit the
  same file.
- Do not run more than 3-5 active agent tasks per reviewer unless the
  validation surface is already automated.

## Multi-Agent Pattern

- Parallelize read-only exploration, inventory, and validation planning when it
  reduces ambiguity without multiplying file ownership.
- Keep implementation ownership file-scoped. If one agent edits a file, no
  other active agent should edit that same file in parallel.
- Use `planner` to decompose work, `workflow-orchestrator` to sequence slices,
  `reviewer` to challenge correctness and regression risk, and
  `validation-sentinel` to audit trust and provenance before promotion.
- Prefer joining parallel work at an executable validation gate instead of at a
  prose summary.

## Agent Clean-Code Rules

- Prefer explicit types and avoid broad `any` escape hatches.
- Keep modules and functions small, focused, and easy to validate in one slice.
- Use specific, grepable names instead of generic placeholders when a narrower
  name exists.
- Keep handlers, adapters, and presenters thin; move business rules to shared
  packages or domain services.
- Prefer dependency injection or parameterized I/O boundaries when that keeps
  tests focused and deterministic.
- Favor shallow control flow, early returns, and contextual error messages or
  structured logging.
- Keep comments for why, provenance, upstream constraints, or non-obvious
  tradeoffs; avoid narrating the obvious.
- Do not mix unrelated refactors into a behavior change unless the same
  validation proves both safely.
- Run the narrowest focused validation before broader matrices.

## Validation Gates

- Workflow asset checks: `pnpm run test:workflow-assets`
- Fast repo matrix: `pnpm run validate:fast`
- Workflow formatting gate: `pnpm run format:workflow-assets`
- Local acceptance when needed: `pnpm run validate:local`
- Advanced deterministic matrix when needed: `pnpm run validate:advanced`

## Failure Policy

- Reject a plan that omits source-of-truth files, validation, or rollback
  thinking.
- If an agent repeats the same failed approach 3 times, stop, rescope, or hand
  off.
- A task is not complete while validation is failing or unrun.
- Review findings outrank style cleanups.

## Learning Capture

- Record candidate learnings in the active feature pack, review notes, or task
  summary first.
- Promote only durable, verified rules into `AGENTS.md`, Copilot instructions,
  or path instructions.
- Do not create duplicate authority surfaces for the same rule.

## Current Non-Goals

- No always-on task scheduler or budget engine yet.
- No per-issue worktree daemon yet.
- No Paperclip-style company control plane inside METREV.
