# Coach Findings Follow-ups

## Purpose

This document summarizes the AI Engineer Coach findings from
`docs/agentic-review/baseline.md` as future follow-up candidates only. It does
not approve changes to instructions, prompts, skills, agents, runtime code,
domain files, contracts, specs, or workflows.

Coach findings are useful signals about local agentic work patterns. They are
not proof that a proposed repository change is correct.

## What Coach Actually Did In This Experiment

The experiment built and installed AI Engineer Coach from a temporary checkout
outside the METREV repository. The baseline recorded the Coach source commit,
the VSIX build, extension installation, and a local diagnostic extraction scoped
to the METREV workspace.

The recorded automated extraction used local Coach parsing and analyzer data.
The baseline notes that optional Copilot-LM-assisted Coach features were
approved, but the recorded findings used local analyzer output rather than AI
triage of prompt content.

Superpowers has not yet been installed, configured, or applied as an active tool
inside this repository. The work so far has used a similar disciplined workflow:
small scopes, explicit constraints, read-first planning, focused validation, and
documentation-first decisions.

## Findings From Baseline

The baseline captured these Coach signals:

- Context Health score: 70.
- Agentic readiness score: 65.
- Context Management score: 58.
- Anti-pattern occurrences: 581.
- Practice group scores: prompt quality 76, session hygiene 69, code review 93,
  tool mastery 86.
- Repeated-work clusters: 5 clusters, 24 repetitions, estimated 48 minutes of
  reusable-work opportunity.
- Full compactions observed: 5.

These numbers describe observed local usage patterns. They should guide review
questions, not automatically dictate repository edits.

## Instruction and Context Bloat

Coach flagged `.github/copilot-instructions.md` as exceeding a 4000-character
code-review truncation threshold and noted multiple agent-facing context files.

This does not mean the current instructions are wrong. It means the repo should
eventually review whether always-on guidance can be shorter while path-specific
rules move into maintained scoped instruction files, prompts, skills, specs, or
docs.

No `.github` instruction files should be edited from this finding without a
separate approved plan.

## Session Drift and Compaction Risk

Coach observed long-session signals, full compactions, slow responses, runaway
agent loops, and session drift.

The practical risk is that a long session can blur the line between baseline
facts, current instructions, future recommendations, and attempted fixes. For a
repository like METREV, that drift is dangerous because active authority,
reference material, runtime code, domain semantics, and contracts must stay
separate.

Future work should consider shorter slices, clearer stop points, and handoff
notes when work spans sessions.

## Repeated Kickoff and Review Prompt Clusters

Coach found repeated kickoff and review-like prompt patterns. The strongest
local cluster involved implementation kickoff phrasing with 12 occurrences
across 4 sessions.

This suggests future candidates for maintained `.prompt.md` files or skills,
but only after reviewing overlap with existing root prompts and workflow assets.
Creating prompt or skill files tonight is explicitly out of scope.

## Tool Mastery and Validation Discipline

Coach reported a tool-mastery score of 86. It also flagged no slash-command
usage, auto-model avoidance, some agentic turns without tools, premium model
waste, and stale context files.

The Phase 1 and Phase 2B work used objective checks: focused Vitest commands,
`pnpm run test:js`, and `pnpm run validate:fast`. That pattern should be
preserved. Validation discipline should remain command-specific and evidence
based, not inferred from confidence or narrative quality.

## What Not To Change Yet

Do not change these surfaces from Coach findings alone:

- `.github/copilot-instructions.md`
- `.github/instructions/`
- `.github/prompts/`
- `.github/skills/`
- `.github/agents/`
- workflow files
- package scripts
- runtime code
- domain files
- contract files
- specs

Also do not create new prompts or skills tonight. The current phase records
follow-up candidates only.

## Candidate Future Actions

Possible future actions, each requiring separate approval:

1. Review always-on instruction size and decide whether any scoped rules should
   move to path-specific instruction files.
2. Inventory repeated kickoff and review prompts against existing root prompts.
3. Draft one candidate prompt or skill only after confirming repeated use and
   clear ownership.
4. Add a lightweight session-handoff convention for long work.
5. Compare VS Code Chat and CLI/agentic workflow using the protocol in
   `docs/agentic-review/vscode-vs-cli-comparison-protocol.md`.
6. Re-run Coach after future workflow changes to see whether the same risks
   remain.

## Human Approval Required

Human approval is required before:

- editing any `.github` instruction, prompt, skill, or agent file
- installing or configuring Superpowers inside this repository
- treating Coach findings as team-wide facts
- changing validation gates or package scripts
- promoting this document into a repository authority surface
- deleting or archiving reference material
