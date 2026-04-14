---
applyTo: "**/*.{js,jsx,ts,tsx,py,java,go,rs,rb,sh}"
description: "General implementation and review rules for source code"
---

Apply repository-wide instructions first.

## Implementation rules
- Prefer incremental edits over broad rewrites.
- Keep interfaces stable unless change is explicitly requested.
- Avoid mixing feature work, refactor, and cleanup in one patch unless necessary.
- Keep edits compatible with the existing architecture and stack choices.
- Prefer code that is obvious to a junior developer who reads the module later.
- Preserve backward compatibility where feasible.

## Review rules
Always check:
- naming clarity
- null / empty / boundary conditions
- error handling
- hidden coupling
- missing validation
- missing tests
- regression risk
- mismatch with current architecture

## Escalation
If the task touches auth, billing, persistence, migrations, or infrastructure:
- summarize assumptions
- identify risks
- propose verification before implementation
