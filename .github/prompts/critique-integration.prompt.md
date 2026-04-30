---
name: critique-integration
description: 'Critique integration work for source-of-truth drift, missing validation, weak tooling setup, and incomplete runtime alignment.'
argument-hint: 'Describe the change set, runtime plan, or integration concern to review'
agent: 'reviewer'
---

Critique the following integration work as a strict repository reviewer:

${input}

Focus on:

- source-of-truth drift
- missing adapter mappings
- weak validation or test coverage
- tooling or setup gaps
- hidden deployment or infrastructure assumptions
- incomplete critique or refine loops

Return in this order:

1. critical blockers
2. medium concerns
3. low-priority improvements
4. missing tests or docs
5. final verdict
