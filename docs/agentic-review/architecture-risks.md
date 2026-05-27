# Architecture Risks

## Purpose

This report separates observed facts from hypotheses and review concerns found
so far in the agentic-review work. It does not approve fixes, introduce new
architecture, or override active repository authority.

## Observed Facts

### Instruction and context bloat

The baseline Coach analysis reported a Context Health score of 70 and agentic
readiness of 65. It detected many agent-facing context assets and flagged
`.github/copilot-instructions.md` as exceeding a 4000-character truncation
threshold for code review contexts.

The repo has substantial guidance because it has real authority complexity:
domain, contracts, runtime, specs, workflow, and reference surfaces all need
careful separation.

### Long-session drift

The baseline Coach analysis reported a Context Management score of 58 and
observed full compaction events. It also surfaced session-hygiene patterns such
as slow responses, runaway loops, session drift, and a mega-session signal.

This matters because long AI sessions can lose crisp boundaries between
baseline facts, current instructions, and future recommendations.

### Repeated kickoff and review prompts

The baseline Coach analysis found repeated-work clusters, including a strong
implementation kickoff pattern. That suggests some recurring workflows may
eventually deserve maintained prompts or skills.

No prompt or skill consolidation has been executed in this phase.

### Duplicate authority risk

The repository intentionally contains active root workflow assets plus nested
reference assets in older kits. `docs/repository-authority-map.md` already marks
which surfaces are active and which are reference-only or future-facing.

The risk is that future agents may read a reference-only file and treat it as
live instruction.

### Active versus historical spec confusion

The active product roadmap is `specs/020-metrev-three-phase-product-plan/`.
`specs/021-public-infographic-pages/` is an active public-route execution slice,
and `specs/033-ui-api-database-rule-engine-refactor/` is the active signed-in
client/admin refactor slice. Older specs still contain useful context, but some
are superseded or historical.

Without the authority map, it is easy to reopen stale direction.

### Domain-contract-runtime drift

The repo's central invariant is that domain meaning starts in
`bioelectrochem_agent_kit/domain/`, contract boundaries start in
`bioelectro-copilot-contracts/contracts/`, and runtime code in `apps/` plus
`packages/` adapts those layers.

Any mismatch across those layers is a repository defect. It should not be fixed
ad hoc in only one layer.

### Tests coupled to framework internals

The Phase 1 baseline failure involved a test assertion against a Next redirect
error digest. That style is already used elsewhere in the repo, but it is still
close to framework internals.

The actual Phase 2B fix did not change the digest assertion. It corrected the
test invocation so the page function reached the redirect behavior being
asserted.

## Hypotheses and Review Concerns

### Context should move toward progressive disclosure

Hypothesis: the repo likely benefits from keeping short, always-on instructions
small and moving path-specific detail into scoped instruction files, prompts,
skills, specs, or docs. This should be reviewed before any `.github` edits.

### Some repeated prompts may deserve maintained assets

Hypothesis: recurring kickoff, review, and audit workflows could become
`.prompt.md` files or skills. This should happen only after repeated patterns
are reviewed for usefulness and overlap with existing root prompts.

### Historical material should be easier to identify

Hypothesis: future review will go faster if historical, reference-only, and
active execution packs are visibly separated in founder-readable docs. The
authority map already does this formally; this report set makes it easier to
understand.

### Runtime simplification should wait for authority clarity

Hypothesis: the repo can probably be simplified, but runtime simplification
should not happen before the team agrees which domain and contract surfaces are
active, future-facing, or deprecated.

## Senior Review Needed

Senior or team review is especially important before:

- editing domain vocabulary or evidence semantics
- changing contract schemas or output shapes
- changing `packages/domain-contracts` loaders or reconciliation behavior
- moving or deleting historical specs
- pruning nested reference assets
- changing root prompts, skills, instructions, or agent workflows
- replacing framework-coupled tests with lower-level helper tests
- simplifying runtime code that may encode product semantics

## What Not To Do Yet

- Do not delete historical material just because it is confusing.
- Do not shorten instructions by removing constraints without preserving the
  durable rule somewhere appropriate.
- Do not change domain, contracts, runtime, and tests independently.
- Do not treat Coach findings as proof that a repository change is correct.
- Do not claim the full validation matrix is green unless the relevant commands
  have actually been run in the current slice.
