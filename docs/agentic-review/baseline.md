# Agent Audit Baseline

## Scope

This is the documentation-only diagnostic baseline for the experiment branch. It
records the repository state before any agentic-audit changes are made. No
runtime, product, workflow, package-script, domain, contract, or spec files were
modified in this phase.

## Baseline Metadata

| Field                  | Value                                                        |
| ---------------------- | ------------------------------------------------------------ |
| Date                   | 2026-05-26T23:31:40+02:00                                    |
| Branch                 | experiment/034-agentic-audit-superpowers-coach               |
| Initial commit         | 7226495d9aecbcfbaae3e5935a14956913da290e                     |
| Initial commit summary | feat: add Spec 037 for Evidence & Research Quality Expansion |
| Raw log directory      | /tmp/metrev-agentic-review-logs/                             |
| Experiment mode        | Documentation-only diagnostic baseline                       |

## Commands Run

| Command                                                          | Status | Duration | Raw log                                                          | Notes                                                                                                                                                         |
| ---------------------------------------------------------------- | ------ | -------: | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git checkout main`                                              | PASS   |      n/a | terminal output                                                  | Already on `main`; branch was up to date.                                                                                                                     |
| `git pull --ff-only`                                             | PASS   |      n/a | terminal output                                                  | Already up to date. Used fast-forward-only pull to avoid a merge commit.                                                                                      |
| `git checkout -b experiment/034-agentic-audit-superpowers-coach` | PASS   |      n/a | terminal output                                                  | Created the isolated experiment branch.                                                                                                                       |
| `pnpm install`                                                   | PASS   |    2.82s | `/tmp/metrev-agentic-review-logs/01-pnpm-install.log`            | Lockfile was up to date. Prisma Client generated successfully. `git status --short` was clean immediately after install.                                      |
| `pnpm run test:workflow-assets`                                  | PASS   |    0.89s | `/tmp/metrev-agentic-review-logs/02-test-workflow-assets.log`    | 1 test file passed; 9 tests passed.                                                                                                                           |
| `pnpm run lint:workflow-semantics`                               | PASS   |    0.59s | `/tmp/metrev-agentic-review-logs/03-lint-workflow-semantics.log` | Completed without actionlint or Docker-related failure.                                                                                                       |
| `pnpm run validate:fast`                                         | FAIL   |   15.18s | `/tmp/metrev-agentic-review-logs/04-validate-fast.log`           | `pnpm run lint` passed with 17 successful turbo tasks. Failure occurred during `pnpm run test:fast`, inside `pnpm run test:js`; `pnpm run build` did not run. |

## Passed Commands

- `git checkout main`
- `git pull --ff-only`
- `git checkout -b experiment/034-agentic-audit-superpowers-coach`
- `pnpm install`
- `pnpm run test:workflow-assets`
- `pnpm run lint:workflow-semantics`

## Failed Commands

- `pnpm run validate:fast`

## Main Errors

`pnpm run validate:fast` failed in the JavaScript test phase:

- Failing test file: `tests/web-ui/advanced-route-pages.test.tsx`
- Failing test: `advanced route pages > redirects legacy evidence and research routes to admin intelligence pages`
- Expected: an object with a digest containing `/admin/intelligence/evidence/explorer`
- Received: `TypeError: Cannot destructure property 'searchParams' of 'undefined' as it is undefined.`
- Vitest summary: 1 failed test file, 60 passed test files; 1 failed test, 247 passed tests.
- Classification: repository test/runtime logic failure, not an environment-only Docker/actionlint failure.

No lockfile, package metadata, generated tracked file, or unexpected tracked file
was modified by `pnpm install` or validation before this baseline document was
created.

## Initial Repository Hypothesis

The repository is mostly operational for workflow-governance checks: dependency
installation is clean, workflow asset tests pass, and workflow semantic linting
passes in this environment. The broader fast validation baseline is not green
because an existing web UI route test fails before the build phase. That failure
should be treated as part of the pre-experiment state and not corrected in this
documentation-only phase.

The repo appears legible to agents because it has explicit root authority files,
instructions, prompts, agents, skills, an authority map, and focused workflow
tests. The main diagnostic risk is not missing guidance; it is volume and drift:
the active instruction surface is large, some prompt files need better structure,
and long sessions can compress or blur important constraints.

## AI Engineer Coach Setup

| Step                                | Status | Evidence                                                                                                        |
| ----------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| Clone Coach outside METREV          | PASS   | Cloned to `/tmp/metrev-agentic-review-logs/coach-src.hJYTM9`.                                                   |
| Coach commit                        | PASS   | `1fef41a18ac0a074edefc916500c180fa286fd62` (`docs: add rule/metric authoring guide (#25) (#59)`).               |
| `npm install` in Coach checkout     | PASS   | `/tmp/metrev-agentic-review-logs/06-coach-npm-install.log`; 758 packages installed, 0 vulnerabilities reported. |
| `npm run package` in Coach checkout | PASS   | `/tmp/metrev-agentic-review-logs/07-coach-npm-package.log`; produced `ai-engineer-coach-0.1.0.vsix`.            |
| Install VSIX                        | PASS   | `/tmp/metrev-agentic-review-logs/08-coach-code-install-extension.log`; extension installed successfully.        |
| Open dashboard                      | PASS   | Ran VS Code command `aiEngineerCoach.open`; command completed.                                                  |
| Local diagnostic extraction         | PASS   | `/tmp/metrev-agentic-review-logs/10-coach-metrev-analysis.json`; local analyzer scoped to the METREV workspace. |

VS Code version used for installation: 1.120.0.

The optional Copilot-LM-assisted Coach features were approved for this phase, but
the recorded automated extraction used local Coach parsing/analyzer data only.
Skill Finder observations below come from local workflow clustering, not from AI
triage of prompt content.

## AI Engineer Coach Diagnostic Observations

| Screen or metric       | Baseline observation                                                                                                                                                                                                                                                                                                                                | Interpretation for METREV                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context Health         | Score 70; agentic readiness 65. Coach detected instructions, prompts, agents, skills, and MCP configuration. It did not detect hooks or a devcontainer.                                                                                                                                                                                             | METREV is readable for agents, but the context surface is heavy. Root authority exists, yet the always-on instruction payload is large enough to create truncation and drift risk.                |
| Context Health details | Coach counted 23 context/config files for the METREV workspace. It flagged `.github/copilot-instructions.md` as exceeding the 4000-character code-review truncation threshold and suggested moving scoped rules into `.github/instructions/*.instructions.md`. It also flagged a few prompt files for weak imperative phrasing or missing headings. | The issue is not lack of guidance. The issue is maintaining clear authority and progressive disclosure as agent-facing guidance grows.                                                            |
| Anti-Patterns          | 581 total occurrences. Group scores: prompt quality 76, session hygiene 69, code review 93, tool mastery 86. Top issues included slow responses, runaway loops, repeated prompts, verbose output, and instruction bloat.                                                                                                                            | The experiment should watch for overly broad requests and long agent loops. Review behavior looks comparatively healthier, but workflow discipline still depends on explicit validation evidence. |
| Skill Finder           | 5 repeated-work clusters, 24 total repetitions, estimated 48 minutes of reusable-work opportunity. The strongest local cluster was implementation kickoff phrasing with 12 occurrences across 4 sessions.                                                                                                                                           | Repeated kickoff and audit/review prompts are candidates for future `.prompt.md` files or skills. Do not create them in this phase; record them as follow-up candidates only.                     |
| Session Hygiene        | Context Management score 58. Coach observed 5 full compactions, 0 simple compactions, 18 sessions, and token data for 2 sessions. Session-hygiene patterns included slow responses, runaway agent loops, session drift, and one mega-session signal.                                                                                                | Sessions are sometimes long enough for context drift and compaction risk. Future workflow should prefer shorter slices, clearer stop points, and handoff notes when work spans sessions.          |
| Code Review            | Code-review group score was 93. The surfaced issue was unsandboxed terminal execution, not a direct finding that changes were accepted without evidence.                                                                                                                                                                                            | Keep using objective checks as gates. For this baseline, the failed `validate:fast` result is deliberately recorded rather than fixed, which is the desired evidence-first behavior.              |
| Tool Mastery           | Tool-mastery score was 86. Coach flagged no slash-command usage, auto-model avoidance, some agentic turns without tools, premium model waste, and stale context files.                                                                                                                                                                              | Agents are using repository files and tests in many cases, but repeated work could be better captured in reusable prompts/skills and sessions should keep context freshness explicit.             |

## Follow-Up Candidates

These are diagnostic candidates only, not actions taken in this phase.

- Review whether `.github/copilot-instructions.md` can be shortened by moving scoped rules into existing `.github/instructions/*.instructions.md` files.
- Convert repeated implementation-kickoff and audit/review prompts into maintained `.prompt.md` files or skills after a separate plan is approved.
- Add a session-handoff convention for long work to reduce drift after compaction.
- Investigate the existing `validate:fast` failure in a later non-baseline branch.
- Consider a devcontainer or equivalent sandbox if terminal auto-approval becomes part of regular agent workflows.

## Final Baseline State

Expected repository changes for this phase are limited to this file:

- `docs/agentic-review/baseline.md`

Raw logs, Coach clone, generated VSIX, temporary scripts, and analyzer JSON were
kept outside the repository under `/tmp/metrev-agentic-review-logs/`.
