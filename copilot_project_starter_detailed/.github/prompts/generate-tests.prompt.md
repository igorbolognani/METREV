---
name: generate-tests
description: Generate or update tests for a target behavior
argument-hint: File, function, endpoint, or behavior to test
agent: agent
---

Generate tests for the following target:
${input}

Requirements:
- follow the current test style in the repo
- cover happy path, invalid input, and at least one edge case
- avoid brittle implementation-detail assertions
- include a short note explaining what is covered and what remains untested
- mention assumptions if the target behavior is ambiguous
