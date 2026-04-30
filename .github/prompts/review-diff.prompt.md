---
name: review-diff
description: 'Review current changes for correctness, regression risk, workflow drift, and missing validation.'
agent: 'reviewer'
---

Review the current changes in this repository.

Return in this order:

1. critical findings
2. medium concerns
3. low-priority improvements
4. missing tests or validation
5. smallest safe correction path

Constraints:

- Lead with bugs, unsupported assumptions, and drift.
- Check domain or contract alignment before style concerns.
- Call out missing objective validation explicitly.
- State clearly when no findings are present.
