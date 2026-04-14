---
name: review-diff
description: Review current changes like a strict senior reviewer
agent: agent
---

Review the current changes as a strict senior reviewer.

Focus on:
- correctness
- regression risk
- missing validation
- missing tests
- architecture drift
- performance risk
- security risk
- unnecessary complexity

Return:
1. critical issues
2. medium issues
3. low-priority improvements
4. tests missing
5. final verdict: approve | approve with fixes | rework needed
