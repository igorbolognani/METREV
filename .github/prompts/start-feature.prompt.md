---
name: start-feature
description: 'Bootstrap a new internal feature pack with naming, required artifacts, and cross-links before detailed planning or implementation.'
argument-hint: 'Describe the feature or change to bootstrap'
---

Start a new feature in this repository using the internal workflow.

Task:
${input}

Work in this order:

1. choose the recommended feature slug and feature folder path
2. choose the recommended branch name
3. identify the required durable artifacts to create from `specs/_templates/`
4. identify optional artifacts and the trigger conditions for each one
5. identify the source-of-truth files that constrain the feature
6. create or update the feature folder and durable artifacts when asked to scaffold them
7. finish with a bootstrap checklist and any blockers

Constraints:

- Use `docs/internal-feature-workflow.md` and `specs/_templates/` as the maintained root workflow surface.
- Do not rely on external Spec Kit tooling or `specify init`.
- If feature-level contract notes are needed, keep them planning-only and list canonical owner files.
- Do not implement application code yet unless explicitly requested.
