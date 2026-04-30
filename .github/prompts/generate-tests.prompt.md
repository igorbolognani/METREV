---
name: generate-tests
description: 'Generate or update tests for a target behavior with METREV regression and contract expectations.'
argument-hint: 'Describe the behavior, file, endpoint, or bug fix that needs tests'
agent: 'agent'
---

Generate or update tests for the following target:

${input}

Return in this order:

1. target behavior
2. source-of-truth files and touched layers
3. test cases to add or update
4. fixtures, mocks, or shared helpers to reuse
5. regression risk covered
6. remaining gaps or assumptions

Constraints:

- Follow the current test style in `tests/` and prefer shared fixtures.
- Cover happy path, invalid input, and at least one edge case.
- For bug fixes, add a regression test when practical.
- Flag domain or contract drift rather than encoding contradictory fixture data.
- Keep mocks explicit about whether they represent valid, invalid, edge, or
  failure data.
