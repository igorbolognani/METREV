---
applyTo: "bioelectro-copilot-contracts/contracts/**/*.{yml,yaml,md}"
description: "Use when editing the canonical contracts, ontology, rules, supplier normalization, or report contracts."
---

Apply the root `AGENTS.md` first.

## Contract-layer role
- These files are the authoritative validation and interface boundary for storage, serialization, and future API or database work.
- Keep them semantically aligned with `bioelectrochem_agent_kit/domain/`; do not invent a parallel contract vocabulary.

## Editing rules
- Preserve snake_case naming and rooted canonical field paths.
- Do not reintroduce compact prefixes such as `stack.`, `anode.`, `cathode.`, `membrane_separator.`, `biology.`, `bop.`, `sensors_analytics.`, or `economics.`.
- Keep the output contract aligned with the required sections for diagnosis, prioritization, impact map, shortlist, roadmap, defaults audit, and uncertainty summary.

## Required follow-through
- If contract terminology changes, update the counterpart domain file and any affected tests.
- If rule paths or metric names change, keep `tests/contracts/` aligned in the same patch when feasible.
- If a deliberate contract or domain mismatch must remain temporarily, document it explicitly instead of leaving silent drift.
