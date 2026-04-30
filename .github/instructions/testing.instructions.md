---
applyTo: 'tests/**/*.{py,js,jsx,ts,tsx,rb}'
description: 'Use when editing tests, validation checks, or regression coverage in this workspace.'
---

Apply the root `AGENTS.md` first.

## Testing principles

- Prefer behavior-oriented tests over implementation-detail assertions.
- Cover happy path, failure path, and at least one edge case.
- Keep tests deterministic and explicit about fixtures and expected behavior.

## Minimum checklist

- valid input
- invalid input
- boundary or edge condition
- error path
- regression for the most recent bug or drift fix

## Contract and rule expectations

- For contract or rule changes, cover valid input, invalid input, and missing-data or defaults behavior when relevant.
- Prefer tests that catch cross-layer drift between domain semantics and contract boundary files.
- Keep fixture data realistic enough to reflect the canonical ontology and report structure.

## Mock and fixture rules

- Prefer shared fixtures under `tests/fixtures/` or package-level fixture folders when a scenario is reused.
- Keep mock data explicit about whether it is valid, invalid, edge, or failure data.
- Do not create ad-hoc fixture shapes that contradict the current contracts or normalized runtime schema.

## Regression expectations

- When a bug or drift issue is fixed, add or update a regression test where practical.
- Agent-authored behavior changes should add the most focused regression or behavior check available before broader suite runs.
- Do not silently weaken existing validation coverage to accommodate a change.
- If a repeated failure reveals a missing process rule, update the relevant spec, ADR, eval, or instruction file in the same workstream when practical.
