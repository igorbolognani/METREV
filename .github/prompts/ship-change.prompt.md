---
name: ship-change
description: 'Autonomously drive a repository change end to end with the internal feature workflow, from clarification through validation.'
argument-hint: 'Describe the bug, feature, refactor, or integration change to deliver end to end'
agent: 'workflow-orchestrator'
---

Execute the requested work in this repository end to end.

Input:
${input}

Work in this order:

1. clarify the goal and explicit assumptions
2. identify source-of-truth files, affected layers, and required durable artifacts
3. if needed, create or update `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`, plus conditional `research.md` or planning-only `contracts/` notes
4. define the smallest safe implementation plan
5. implement the change
6. run objective validation commands or tests
7. review the result for drift, regressions, and unsupported assumptions
8. refine the implementation if validation or review finds issues
9. finish with a clear final verification summary and any residual blockers

Constraints:

- Preserve the root repository truth model and internal spec-first workflow.
- Use `docs/internal-feature-workflow.md` and `specs/_templates/` instead of external Spec Kit tooling.
- Keep feature-level contract notes planning-only, cite canonical owner files, and do not bypass `bioelectro-copilot-contracts/contracts/`.
- Preserve the currently validated runtime invariants unless the task explicitly changes them and re-validates the affected flow.
- Prefer minimal diffs and explicit validation.
- Do not claim success for checks that were not actually run.
