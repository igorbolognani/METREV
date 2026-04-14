---
applyTo: "bioelectrochem_agent_kit/domain/**/*.{yml,yaml}"
description: "Use when editing the bioelectrochemical domain ontology, rules, cases, or supplier normalization files."
---

Apply the root `AGENTS.md` first.

## Domain-layer role
- These files define semantic product truth for ontology, case structure, defaults behavior, rule intent, and decision-support framing.
- Preserve canonical domain naming and block decomposition unless the change is explicitly intended to revise the ontology.

## Editing rules
- Keep defaults, assumptions, missing data, and confidence effects explicit.
- Do not mix literature evidence, internal benchmark data, supplier claims, engineering assumptions, and heuristic inference.
- Keep rule inputs, outputs, and confidence behavior auditable.
- Avoid introducing alternative names for concepts that already exist in the ontology.

## Required follow-through
- When a domain change affects contract shape or validation terminology, update the corresponding file under `bioelectro-copilot-contracts/contracts/`.
- When a domain change affects output shape, also update report templates and relevant eval checklists.
- When a rule changes required inputs, edge behavior, or missing-data handling, update or add tests under `tests/contracts/` when feasible.
