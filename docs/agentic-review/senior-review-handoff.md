# Senior Review Handoff

## Purpose

This is a compact handoff for future senior or team review. It summarizes the
agentic audit package and points to the supporting documents. It is not approval
to refactor, delete, rewrite, or change architecture.

## Current Branch and Commit History Expected

Branch:

- `experiment/034-agentic-audit-superpowers-coach`

Expected experiment commits so far:

- `cd53e13 docs: add agentic audit baseline`
- `44d9a63 test: pass searchParams props to legacy route tests`
- `6691e7b docs: add agentic review comprehension reports`
- a later docs-only commit for Coach follow-ups, comparison protocol, and this
  handoff if approved

## What Has Been Done So Far

- Created a Phase 1 baseline document in `docs/agentic-review/baseline.md`.
- Built and installed AI Engineer Coach from outside the repository and recorded
  local diagnostic findings.
- Documented the original `validate:fast` failure as baseline data.
- Investigated the failure without edits.
- Applied one minimal test-only fix for direct legacy route page calls.
- Verified that `pnpm run test:js` and `pnpm run validate:fast` passed after the
  fix.
- Created founder-readable comprehension reports under `docs/agentic-review/`.
- Added future-only Coach follow-up and workflow comparison planning docs.

## What Is Validated

Validated during this experiment:

- `pnpm install` in Phase 1 did not modify tracked files.
- `pnpm run test:workflow-assets` passed in Phase 1.
- `pnpm run lint:workflow-semantics` passed in Phase 1.
- The focused legacy redirect test passed after the Phase 2B fix.
- The full `tests/web-ui/advanced-route-pages.test.tsx` file passed after the
  Phase 2B fix.
- `pnpm run test:js` passed after the Phase 2B fix.
- `pnpm run validate:fast` passed after the Phase 2B fix.
- Prettier checks passed for the agentic-review docs created so far.

## What Is Not Validated

Not validated by this handoff:

- `pnpm run validate:local`
- `pnpm run validate:advanced`
- `pnpm run validate:full`
- browser E2E after the documentation phase
- live provider ingestion
- provider-backed LLM extraction
- Superpowers installation or runtime behavior
- any runtime refactor
- any domain or contract change

## What To Preserve

- Domain meaning in `bioelectrochem_agent_kit/domain/`.
- Hardened contract boundary in `bioelectro-copilot-contracts/contracts/`.
- Runtime boundaries between `apps/`, `packages/`, and `tests/`.
- Root governance in `AGENTS.md`, `.github/copilot-instructions.md`, and
  `WORKFLOW.md`.
- `docs/repository-authority-map.md` as the active authority index.
- The evidence-first validation habit used in the baseline and Phase 2B fix.
- The clean separation between observed facts, hypotheses, and future actions.

## What To Inspect First

Suggested first inspection order:

1. `docs/agentic-review/baseline.md`
2. `docs/agentic-review/validation-baseline.md`
3. `docs/agentic-review/repository-map.md`
4. `docs/agentic-review/active-vs-reference-surfaces.md`
5. `docs/agentic-review/architecture-risks.md`
6. `docs/agentic-review/recommended-reconstruction-plan.md`
7. The Phase 2B test diff in `tests/web-ui/advanced-route-pages.test.tsx`

## What Not To Touch Early

Do not touch these early without explicit review:

- domain vocabulary, rules, cases, or evidence semantics
- hardened contract schemas or report contracts
- `packages/domain-contracts/src/loaders.ts`
- `packages/domain-contracts/src/reconciliation.ts`
- database schema or persistence shape
- `.github` instructions, prompts, agents, skills, or workflows
- package scripts or lockfiles
- historical specs or reference kits
- runtime simplification work

## Suggested First PR Review Order

1. Review the baseline commit and confirm it records the before-state honestly.
2. Review the Phase 2B test-only fix and confirm it does not change runtime
   behavior.
3. Review the six comprehension reports for accuracy and authority discipline.
4. Review Coach follow-up candidates as questions, not as approved changes.
5. Decide whether the VS Code Chat vs CLI comparison should be run.
6. Decide whether a formal spec pack is needed before any reconstruction work.

## Open Questions For Senior/Team

1. Does `docs/repository-authority-map.md` correctly represent the active
   authority surfaces today?
2. Should any historical specs be archived more visibly, or is the current map
   enough?
3. Are any domain or contract surfaces mislabeled as active, future-facing, or
   reference-only?
4. Should redirect tests keep asserting Next redirect digests, or should helper
   tests carry more of that behavior?
5. Which validation matrix should block merges at this stage: `validate:fast`,
   `validate:full`, or a staged combination?
6. Should repeated kickoff/review prompts become root prompts or skills?
7. Should Superpowers be installed and compared against VS Code Chat in a
   controlled protocol?

## Recommended Next Safe Branch After This Experiment

Recommended next branch pattern:

- `docs/035-agentic-workflow-comparison`

Use that only if the next task is documentation or comparison protocol work. If
the next task is a runtime fix or cleanup, create a separate branch with a scope
that names the affected layer.

## How To Read The `docs/agentic-review/` Package

Read the package in this order:

1. `baseline.md` for the factual before-state and Coach findings.
2. `validation-baseline.md` for validation status and what each command proves.
3. `repository-map.md` for the major repository areas.
4. `glossary.md` for shared terms.
5. `active-vs-reference-surfaces.md` for a readable guide to the authority map.
6. `architecture-risks.md` for observed risks and hypotheses.
7. `recommended-reconstruction-plan.md` for future reconstruction waves.
8. `coach-findings-followups.md` for Coach-derived future candidates.
9. `vscode-vs-cli-comparison-protocol.md` before running any workflow
   comparison.
10. `senior-review-handoff.md` as the compact review entrypoint.
