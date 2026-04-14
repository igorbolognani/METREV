---
applyTo: "**/*.{md,mdx}"
description: "Documentation rules"
---

## Documentation style
- Be concise but explicit.
- Explain why, not only what.
- Keep docs aligned with the current implementation.
- Prefer decision-oriented language over vague summaries.

## Required updates
If the change affects architecture, contracts, setup, or developer workflow, mention which docs must be updated:
- /adr
- /specs
- /evals
- README
- quickstart or validation notes

## Drift prevention
When a bug exposed a missing assumption or process gap, document the lesson in the most stable place available.
