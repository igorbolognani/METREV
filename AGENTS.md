# METREV Agent Operating Rules

## Workspace layers

- `bioelectrochem_agent_kit/domain/` is the semantic source of truth for domain vocabulary, stack decomposition, evidence semantics, defaults behavior, uncertainty handling, compatibility logic, and scoring intent.
- `bioelectro-copilot-contracts/contracts/` is the authoritative contract boundary for validation, serialization, storage, and future API or database surfaces.
- `copilot_project_starter_detailed/` is a reusable starter and reference kit. Reuse its workflow patterns, but do not treat unresolved placeholders inside it as live project facts.
- `archive/legacy-root-duplicates/`, `bioelectrochem_agent_kit/ALL_FILES_CODE.md`, and binary executable exports are reference-only artifacts, not active source files.

## Active customization rule

- This root `AGENTS.md` and the root `.github/instructions/` directory are the active workspace policy for AI-assisted development.
- The root `.github/copilot-instructions.md` file is an active detailed companion for runtime workflow, tooling, and validation behavior. If it conflicts with this file on source-of-truth rules or domain semantics, this `AGENTS.md` file wins.
- Nested `.github/` folders under `bioelectrochem_agent_kit/` and `copilot_project_starter_detailed/` are reference assets until they are intentionally promoted into the workspace root.

## Default working loop

1. Read the relevant repository context first.
2. Summarize the working assumption and identify the affected layer.
3. Plan before medium or large changes.
4. Implement in small, localized steps.
5. Verify with tests, checks, or direct artifact inspection.
6. Critique the result for drift, missing validation, and integration gaps before concluding.

## Internal feature workflow

- Medium and large changes should use a maintained feature folder under `specs/NNN-feature-slug/`.
- The default durable feature pack is `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`.
- Add `research.md` when external library behavior, architecture uncertainty, version-sensitive setup, or non-trivial integration risk materially affects the plan.
- Add notes under `specs/<feature>/contracts/` only when API, serialization, persistence, adapter, or boundary mappings need explicit design review.
- Recommended semantic branch names should mirror the feature slug, for example `feature/NNN-feature-slug`, `fix/NNN-bug-slug`, or `chore/NNN-workflow-slug`.

## Layering and source-of-truth rules

- Domain semantics start in `bioelectrochem_agent_kit/domain/`.
- Interface shape, rooted field paths, and validation-facing contracts live in `bioelectro-copilot-contracts/contracts/`.
- If those layers disagree, treat the mismatch as a repository defect. Do not resolve it ad hoc in only one layer.
- Do not introduce a second domain vocabulary or rename existing concepts casually.
- Notes under `specs/<feature>/contracts/` are planning artifacts only. They must cite canonical owner files and never override the domain kit or hardened contract boundary.
- If a feature-level contract note implies a canonical change, promote the approved change into `bioelectro-copilot-contracts/contracts/` and aligned tests before considering the work complete.
- When changing ontology, rules, case shape, supplier normalization, or report structure, update the counterpart layer, relevant evals, and tests in the same change when feasible.

## Bioelectrochemical decision-support contract

- The product is an auditable decision-support platform, not a multiphysics simulator-first system.
- Every non-trivial recommendation must separate observed input, normalized input, defaults used, missing data, evidence used, rule-based inference, prioritization logic, unresolved uncertainty, and next tests or measurements.
- Preferred output structure is: current stack diagnosis, prioritized improvement options, impact map, supplier or material shortlist, phased roadmap, assumptions or defaults audit, and confidence or uncertainty summary.

## Modeling and evidence rules

- Keep business rules out of UI layers and narrative summaries.
- Do not treat supplier claims as validated evidence unless explicitly typed that way.
- Do not hide defaults, estimated values, or missing critical data.
- Prefer this order for reasoning: deterministic validation, plausible-range checks, compatibility logic, benchmark comparison, scoring, sensitivity framing, then narrative synthesis.
- If evidence is sparse or conflicting, lower confidence explicitly and recommend the next measurements or tests that would reduce uncertainty.

## Review expectations

Always check:

- domain and contract vocabulary alignment
- defaults and missing-data transparency
- confidence labeling
- report/output contract alignment
- regression risk in tests or eval checklists
- accidental use of archived or generated duplicate files as source material

## Context ingestion rule

- Use `stack.md` as the converted runtime architecture brief until the same decisions are captured in maintained ADR, spec, and quickstart files.
