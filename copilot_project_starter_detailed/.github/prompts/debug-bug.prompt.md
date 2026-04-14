---
name: debug-bug
description: Turn a bug report or failing behavior into hypotheses, checks, and a fix plan
argument-hint: Describe the bug, error, stack trace, or failing behavior
agent: agent
---

Analyze the following bug report:

${input}

Return:
1. likely causes ranked by probability
2. files/modules to inspect first
3. commands/tests/logs to run
4. smallest safe fix strategy
5. regression risks
6. tests that should be added after the fix

Do not jump straight to a patch unless asked.
