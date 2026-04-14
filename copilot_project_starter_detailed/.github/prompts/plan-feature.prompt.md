---
name: plan-feature
description: Plan a feature before implementation
argument-hint: Describe the feature, goal, or task
agent: plan
---

You are planning a feature for this repository.

Task:
${input}

Return:
1. objective
2. assumptions
3. affected files/modules
4. implementation steps in order
5. risks and edge cases
6. tests to add or update
7. docs/contracts/ADR updates required

Do not implement yet unless explicitly requested.
Prefer small, reversible changes.
