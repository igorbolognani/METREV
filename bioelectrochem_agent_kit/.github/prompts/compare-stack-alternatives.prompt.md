---
name: compare-stack-alternatives
description: Compare candidate material or architecture options for a bioelectrochemical stack.
argument-hint: Describe the current stack and the alternatives to compare.
agent: agent
---

Compare the following stack alternatives:

${input}

Requirements:
- use the project ontology and decision posture
- avoid presenting a single “best” answer without trade-offs
- compare technical fit, operational implications, evidence strength, and likely implementation complexity
- surface blockers, dependencies, and uncertainty
- keep narrative aligned with deterministic reasoning where possible

Return:
1. comparison objective
2. candidate options
3. strengths and weaknesses of each option
4. key trade-offs
5. preliminary ranking with rationale
6. uncertainties and tests needed
