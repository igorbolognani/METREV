---
name: debug-bug
description: "Turn a bug report into ranked hypotheses, checks, a smallest-safe-fix strategy, and a verification plus critique loop."
argument-hint: "Describe the bug, failing behavior, stack trace, or broken flow"
agent: "agent"
---

Debug the following problem for this repository:

${input}

Return in this order:
1. goal and observed failure
2. likely causes ranked by probability
3. files and checks to inspect first
4. smallest safe fix strategy
5. regression risks
6. tests to add or update
7. critique of the fix strategy
8. refined final recommendation

Constraints:
- Prefer root-cause analysis over patching symptoms.
- Make validation explicit before recommending code changes.
- Call out any contract, domain, or runtime drift involved in the bug.
