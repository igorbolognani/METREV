---
name: refactor-module
description: "Refactor a module safely with invariants, decomposition, migration-safe steps, verification, critique, and refinement."
argument-hint: "Describe the module, package, or refactor objective"
agent: "agent"
---

Refactor the requested code in a behavior-preserving way.

Input:
${input}

Return in this order:
1. goal
2. behavior invariants to preserve
3. current problems
4. decomposition into small refactor steps
5. verification plan
6. tests that protect behavior
7. critique of refactor risk
8. refined final strategy

Constraints:
- Avoid unnecessary abstraction.
- Prefer migration-safe steps.
- Call out any risk of changing runtime-contract or domain semantics.
