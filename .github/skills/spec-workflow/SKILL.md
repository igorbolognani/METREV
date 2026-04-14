---
name: spec-workflow
description: 'Use this skill when planning a medium or large feature with a spec, implementation plan, task list, validation checklist, critique, and refinement loop.'
---

# Spec Workflow

Use this skill for medium and large features.

## Workflow

1. clarify the goal, assumptions, and missing decisions
2. identify source-of-truth files, affected layers, and the required durable artifact pack
3. write or update `spec.md`, `plan.md`, `tasks.md`, and `quickstart.md`
4. add `research.md` when external docs, uncertainty, or architecture tradeoffs materially affect the plan
5. add planning-only notes under `specs/<feature>/contracts/` when boundary mappings need explicit review
6. define validation criteria
7. run one critique pass on the plan
8. refine the plan before implementation
9. implement incrementally
10. update ADR, docs, evals, contracts, or tests when the change teaches a durable lesson

## Required outputs

- spec
- implementation plan
- task list
- quickstart
- validation checklist
- critique summary
- refined final plan

## Conditional outputs

- research notes when technical uncertainty or external dependencies affect the work
- planning-only contract notes when API, serialization, persistence, or adapter boundaries need review
