# Internal Feature Workflow

## Purpose

This repository uses a root-owned internal workflow to deliver Spec-Kit-like ergonomics without introducing external tooling.
The workflow exists to make feature work predictable, reviewable, and aligned to the repository's source-of-truth split.
`WORKFLOW.md` is the repo-owned operational contract for how agentic work should
move through that surface.

## Source-of-truth guardrails

- Domain meaning starts in `bioelectrochem_agent_kit/domain/`.
- Validation-facing and persistence-facing contract shapes start in `bioelectro-copilot-contracts/contracts/`.
- Runtime code in `apps/` and `packages/` adapts those layers rather than replacing them.
- Notes under `specs/<feature>/contracts/` are planning-only artifacts. They can explain mappings, examples, and proposed deltas, but they are not canonical schemas.

## When to use a feature pack

- Small, localized fixes may stay inside the existing implementation and validation flow if they do not need a new maintained feature folder.
- Medium and large changes should use a maintained feature folder under `specs/NNN-feature-slug/`.
- When in doubt, prefer a durable feature folder if the change spans multiple files, changes behavior, touches the contract boundary, or needs design review.

## Required and conditional artifacts

The default durable feature pack is:

- `spec.md`
- `plan.md`
- `tasks.md`
- `quickstart.md`

Add `research.md` when:

- current library or framework behavior needs verification
- version-sensitive setup affects the plan
- architecture tradeoffs or integration risks are still open
- external documentation materially changes implementation decisions

Add planning-only notes under `specs/<feature>/contracts/` when:

- request or response shape needs review
- serialization or persistence boundaries are changing
- adapter mappings need to stay explicit across layers
- proposed contract deltas need review before promotion into the hardened contract boundary

## Naming rules

- Feature folders should use `specs/NNN-feature-slug/`.
- The numeric prefix should increment from the highest active numeric folder under `specs/`.
- `_templates/` and `_examples/` are not active feature numbers.
- Recommended semantic branch names should mirror the feature slug, for example `feature/NNN-feature-slug`, `fix/NNN-bug-slug`, or `chore/NNN-workflow-slug`.

## Root templates

The maintained templates live under `specs/_templates/`.
Use them instead of copying files from `copilot_project_starter_detailed/` directly.

Available template surfaces:

- `spec-template.md`
- `plan-template.md`
- `tasks-template.md`
- `quickstart-template.md`
- `research-template.md`
- `contracts/planning-contract-template.md`

## Recommended feature layout

```text
specs/
  NNN-feature-slug/
    spec.md
    plan.md
    tasks.md
    quickstart.md
    research.md                # only when triggered
    contracts/                 # only when triggered
      planning-contract.md
```

## Prompt surface

Use the root prompts in these groups when helpful.

Staged workflow prompts:

1. `.github/prompts/clarify-feature.prompt.md`
2. `.github/prompts/start-feature.prompt.md`
3. `.github/prompts/plan-feature.prompt.md`
4. `.github/prompts/ship-change.prompt.md`

Specialist prompts:

- `.github/prompts/debug-bug.prompt.md` for root-cause triage and smallest-safe-fix planning
- `.github/prompts/refactor-module.prompt.md` for behavior-preserving refactors with explicit invariants
- `.github/prompts/critique-integration.prompt.md` for strict integration review focused on drift, validation, and setup gaps

The default autonomous one-shot entrypoint is `.github/prompts/ship-change.prompt.md`.
That prompt is backed by the root `workflow-orchestrator` agent and should compose the staged workflow for medium and large changes without external Spec Kit tooling.
The staged prompts remain the manual path when tighter control over clarification, bootstrap, or planning is preferable.
The specialist prompts are optional overlays for debugging, refactoring, critique,
test generation, and diff review once the main workflow path is already clear.

- `.github/prompts/review-diff.prompt.md` for strict change review through the
  `reviewer` agent
- `.github/prompts/generate-tests.prompt.md` for focused regression and behavior
  test generation

## Agent and skill surface

The root-owned workflow also includes specialized agent and skill surfaces that should stay discoverable in the maintained docs.

Agents:

- `workflow-orchestrator` for autonomous staged execution across the maintained workflow
- `planner` for decomposition, dependency ordering, and implementation planning
- `reviewer` for correctness, regression, architectural fit, and missing-validation review
- `validation-sentinel` for provenance, defaults, uncertainty, and trustworthiness checks

Use parallel agents only when they can stay read-only or hold separate file
ownership. Prefer convergence at a validation gate such as
`pnpm run test:workflow-assets`, `pnpm run validate:fast`,
`pnpm run validate:local`, or `pnpm run validate:advanced` instead of merging
conflicting edit branches by hand.

Skills:

- `spec-workflow` for medium and large feature delivery
- `enforce-provenance` when outputs, recommendations, or persisted results need trust review
- `use-context7` when implementation depends on current framework or library documentation

If `specify` or `specify init` is not installed locally, that is expected here.
This internal workflow plus `WORKFLOW.md` replaces external Spec Kit tooling in
this repository.

## Workflow steps

1. Clarify the change.
   Use the clarification prompt to separate assumptions from blocking decisions and to identify which durable artifacts are required.
2. Bootstrap the feature folder.
   Choose the feature slug, branch name, and root templates before planning implementation details.
3. Research only when triggered.
   Record concrete questions, findings, decisions, and blockers in `research.md`.
4. Plan the change.
   Translate the feature into implementation steps, source-of-truth files, and validation strategy.
5. Break down tasks.
   Keep task ordering explicit, preserve safe parallel work, and include docs, contracts, and tests as first-class work.
6. Implement incrementally.
   Update the durable artifacts as the implementation learns something real.
7. Validate.
   Run objective checks and record what was actually verified.
8. Promote approved canonical changes.
   If planning-only contract notes imply real schema or vocabulary changes, promote them into `bioelectro-copilot-contracts/contracts/`, aligned tests, and any affected docs before calling the work complete.

## Runtime invariants the autonomous path should preserve

- Supabase remains supported as hosted PostgreSQL for the current runtime, not as an Auth.js replacement.
- Prisma migrations keep preferring `DIRECT_URL` through `packages/database/scripts/run-prisma-with-direct-url.mjs`.
- `packages/database/prisma/schema.prisma` and `packages/database/prisma.config.ts` stay aligned around runtime `DATABASE_URL` and migration `DIRECT_URL` semantics.
- `apps/web-ui/src/instrumentation.ts` stays no-op until web telemetry work is explicitly in scope and validated.
- API telemetry remains active through `packages/telemetry/src/node-sdk.ts` unless telemetry work is explicitly requested.
- The validated quickstart and local-view scripts in `package.json` remain functional unless a change explicitly reworks and re-validates them.

## Planning-only contract rule

Every note under `specs/<feature>/contracts/` should state:

- that it is planning-only and non-authoritative
- which canonical owner files govern the topic
- whether the current state is `no canonical change`, `canonical change required`, or `temporary adapter`
- what validation or review must pass before the note can be retired

Planning-only notes should prefer examples, mapping tables, and proposed deltas over copied full schemas.

## Review checklist

- The feature pack exists when the change size requires it.
- `research.md` exists only when triggered, and its findings are reflected in `plan.md`.
- Planning-only contract notes cite canonical owner files and do not introduce a parallel vocabulary.
- `quickstart.md` is runnable or inspection-ready for the feature being delivered.
- `tasks.md` includes docs, contracts, tests, and validation gates where relevant.
- Canonical contract changes are promoted into `bioelectro-copilot-contracts/contracts/` and aligned tests.
- Final verification states what was actually run and what remains unverified.
