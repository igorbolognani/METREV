---
applyTo: 'apps/**/*.{ts,tsx,js,jsx}, packages/**/*.{ts,tsx,js,jsx}, tests/**/*.{ts,tsx,js,jsx}'
description: 'Use when editing runtime application code, shared packages, or TypeScript test files in the METREV monorepo.'
---

Apply `AGENTS.md` and `.github/copilot-instructions.md` first.

## General code rules

- Keep business logic in shared packages or domain services, not in the UI layer.
- Prefer explicit types, readable naming, and small modules.
- Use specific, grepable names instead of generic placeholders when a narrower name exists.
- Keep modules focused enough that one local edit slice can be understood and validated without broad repo rereads.
- Keep route handlers thin: validate, delegate, return.
- Keep React components focused on presentation, user interaction, and API orchestration.
- Prefer shallow control flow and early returns when practical.
- Keep non-obvious comments for intent, provenance, or upstream constraints; avoid redundant narration of obvious code.
- Inject or parameterize external I/O boundaries when it materially improves testability.
- Prefer structured logging with contextual fields when adding runtime diagnostics or observability output.
- Do not mix unrelated refactors into a behavior change unless the same validation proves the combined diff safe.
- Preserve explicit separation between normalization, validation, inference, scoring, audit, and narrative generation.

## Runtime stack rules

- Use TypeScript strictness rather than broad `any` escape hatches.
- Reuse the shared runtime contracts package for schemas and types.
- Keep API request and response shapes aligned with the contract boundary.
- Do not invent new domain vocabulary in runtime code.

## Verification expectations

Always check:

- the narrowest focused validation before broader matrices
- null, empty, and boundary conditions
- error handling and user-facing failure paths
- hidden coupling between packages
- missing tests
- mismatch between runtime code and repository contracts
