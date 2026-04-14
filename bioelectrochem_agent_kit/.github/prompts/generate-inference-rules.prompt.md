---
name: generate-inference-rules
description: Draft or refine deterministic rules, scoring logic, and sensitivity framing for the domain engine.
argument-hint: Describe the rule target, comparison logic, or scenario to encode.
agent: agent
---

Design or refine deterministic inference logic for the following domain problem:

${input}

Requirements:
- start from structured inputs and expected outputs
- prefer interpretable rules over opaque heuristics
- define inputs, thresholds or categories, logic steps, outputs, and caveats
- identify where benchmark comparison is required
- identify where sensitivity analysis should be applied
- note which cases should reduce confidence

Return:
1. rule objective
2. required inputs
3. decision logic
4. scoring or prioritization implications
5. sensitivity implications
6. known limitations
7. recommended tests or golden cases
