---
name: design-case-eval-tests
description: Design tests and golden cases for domain logic, scoring, and validation behavior.
argument-hint: Describe the rule, case type, or output behavior to validate.
agent: agent
---

Design tests for the following bioelectrochemical evaluation behavior:

${input}

Requirements:
- prioritize behavior-level validation
- include valid path, invalid path, and at least one edge case
- include confidence and uncertainty behavior where relevant
- include default-handling and missing-data behavior where relevant
- propose golden cases when useful

Return:
1. test objective
2. cases to cover
3. expected outputs or assertions
4. golden-case candidates
5. remaining blind spots
