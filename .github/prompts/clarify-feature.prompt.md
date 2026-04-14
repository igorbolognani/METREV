---
name: clarify-feature
description: 'Clarify underspecified feature requests, separate assumptions from blocking decisions, and decide which durable artifacts are required before planning.'
argument-hint: 'Describe the feature, change, or uncertainty to clarify'
agent: 'Planner'
---

Clarify the requested work for this repository before planning or implementation.

Task:
${input}

Return in this order:

1. goal
2. blocking questions
3. safe assumptions if answers are not available yet
4. affected layers and source-of-truth files
5. required durable artifacts and why
6. readiness-to-plan summary

Constraints:

- Do not invent a second domain vocabulary.
- Use `docs/internal-feature-workflow.md` and `specs/_templates/` as the maintained root workflow surface.
- If request or response shape, serialization, persistence, or adapter mappings need review, mark feature-level `contracts/` as planning-only and cite canonical owner files.
- Do not implement yet.
