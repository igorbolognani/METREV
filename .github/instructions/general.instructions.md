---
applyTo: "apps/**/*.{ts,tsx,js,jsx}, packages/**/*.{ts,tsx,js,jsx}, tests/**/*.{ts,tsx,js,jsx}"
description: "Use when editing runtime application code, shared packages, or TypeScript test files in the METREV monorepo."
---

Apply `AGENTS.md` and `.github/copilot-instructions.md` first.

## General code rules
- Keep business logic in shared packages or domain services, not in the UI layer.
- Prefer explicit types, readable naming, and small modules.
- Keep route handlers thin: validate, delegate, return.
- Keep React components focused on presentation, user interaction, and API orchestration.
- Preserve explicit separation between normalization, validation, inference, scoring, audit, and narrative generation.

## Runtime stack rules
- Use TypeScript strictness rather than broad `any` escape hatches.
- Reuse the shared runtime contracts package for schemas and types.
- Keep API request and response shapes aligned with the contract boundary.
- Do not invent new domain vocabulary in runtime code.

## Verification expectations
Always check:
- null, empty, and boundary conditions
- error handling and user-facing failure paths
- hidden coupling between packages
- missing tests
- mismatch between runtime code and repository contracts
