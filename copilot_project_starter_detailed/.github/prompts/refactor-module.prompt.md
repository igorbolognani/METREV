---
name: refactor-module
description: Refactor a module safely without changing behavior
argument-hint: Describe the module and the refactor objective
agent: agent
---

You are refactoring an existing module.

Input:
${input}

Goals:
- preserve behavior
- reduce complexity
- improve readability and cohesion
- avoid unnecessary abstraction

Return:
1. current problems
2. refactor strategy
3. migration-safe steps
4. validation plan
5. tests to protect behavior
