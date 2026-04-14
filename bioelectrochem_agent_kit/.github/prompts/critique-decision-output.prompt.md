---
name: critique-decision-output
description: Critique a draft decision output for provenance, uncertainty, and technical defensibility.
argument-hint: Provide the draft output or recommendation package to critique.
agent: agent
---

Critique the following decision output as a strict domain reviewer:

${input}

Focus on:
- missing provenance
- hidden defaults
- overclaiming
- weak causal logic
- contradictions between sections
- missing economic or dependency framing
- missing next-test recommendations

Return:
1. critical blockers
2. medium concerns
3. lower-priority improvements
4. missing evidence or tests
5. final verdict: approve | approve with fixes | rework needed
