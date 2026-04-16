---
applyTo: '**/*.{md,mdx}'
description: 'Use when editing documentation, specs, ADRs, prompts, or quickstart material in this repository.'
---

Apply `AGENTS.md` and `.github/copilot-instructions.md` first.

## Documentation rules

- Prefer maintained Markdown artifacts over ad-hoc notes or binary source documents.
- Explain why a decision exists, not only what changed.
- Keep setup steps executable and ordered.
- When describing architecture, always state the source-of-truth split between domain semantics and runtime contract boundary.
- When editing workflow assets, preserve the root-owned internal workflow as the supported replacement for external Spec Kit tooling in this repository.
- When documentation touches the current runtime path, keep the validated Supabase, Prisma, Auth.js, telemetry, and quickstart invariants aligned with the live repository behavior.

## Required follow-through

- Update `adr/` when architecture or tool-integration decisions change.
- Update `specs/` when feature scope or acceptance criteria change.
- Update quickstarts or tooling docs when local setup or validation steps change.
- If a recurring mistake is discovered, write the lesson in the most durable document that governs that behavior.
