---
name: plan-feature
description: 'Create a dependency-ordered implementation plan and required durable feature artifacts before coding.'
argument-hint: 'Describe the feature, goal, or task to plan'
agent: 'Planner'
---

Plan the requested work for this repository.

Task:
${input}

Return in this order:

1. goal
2. assumptions and unknowns
3. affected layers and source-of-truth files
4. required durable feature artifacts and why
5. decomposition into small steps
6. dependency order
7. validation checklist
8. critique of the first plan
9. refined final plan

Constraints:

- Do not implement yet unless explicitly requested.
- Use `docs/internal-feature-workflow.md` and `specs/_templates/` as the maintained root workflow surface.
- For medium and large changes, plan around a durable feature pack: `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`, and add `research.md` or `contracts/` only when triggered.
- If feature-level contract notes are needed, keep them planning-only, cite canonical owner files, and promote approved changes into the hardened contract boundary before considering the work complete.
- Use the repository source-of-truth rules before proposing runtime changes.
- When relevant, state whether the work touches domain semantics, contract boundary, runtime adapters, UI, infrastructure, docs, or workflow artifacts.
