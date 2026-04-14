---
applyTo: "**/*.{test,spec}.{js,jsx,ts,tsx,py,rb}"
description: "Rules for tests, mocks, and validation"
---

## Testing principles
- Prefer behavior-oriented tests.
- Cover happy path, failure path, and edge cases.
- Keep tests deterministic and readable.
- Avoid brittle assertions on internal implementation details.
- Use mocks only where isolation is necessary.
- Prefer shared setup for repeated fixtures.

## Minimum checklist
- valid input
- invalid input
- boundary case
- error path
- regression from recent change

## Mock rules
- Prefer shared mocks/helpers in /tests/mocks when reused.
- Do not create ad-hoc mocks with inconsistent shapes.
- Keep mock data realistic enough to represent real contracts.
- Clearly label mocks as valid, invalid, edge, or failure fixtures.
