---
name: enforce-provenance
description: 'Use this skill when validating whether outputs, rules, recommendations, or reports are traceable, confidence-appropriate, and explicit about assumptions.'
---

# Enforce Provenance

Use this skill whenever a result is close to being trusted, shared, persisted, or encoded into rules.

## Workflow
1. inspect the output structure
2. check evidence typing
3. check defaults and missing-data visibility
4. check whether confidence matches support strength
5. check whether next tests are recommended when uncertainty remains
6. compare the result against the active output and rule-change checklists
7. produce a critique pass and a refined recommendation if needed

## Guardrails
- block unsupported certainty
- block hidden assumptions
- block supplier claims presented as established fact
- block recommendations that bypass deterministic reasoning when deterministic reasoning is expected
