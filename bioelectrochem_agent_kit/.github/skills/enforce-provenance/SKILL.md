---
name: enforce-provenance
description: Use this skill when validating whether outputs, rules, and recommendations are traceable, confidence-appropriate, and explicit about assumptions.
---

# Enforce Provenance

Use this skill whenever a result is close to being trusted, shared, or encoded into rules.

## Goals

- verify provenance
- verify explicit defaults and missing-data notes
- verify confidence labels
- verify separation of fact, claim, assumption, and inference
- prevent polished hallucination

## Required workflow

1. inspect the output structure
2. check evidence typing
3. check defaults_used and missing_data
4. check whether confidence matches support strength
5. check whether next tests are recommended when uncertainty remains
6. compare against:
   - [bioelectrochem output checklist](../../../evals/bioelectrochem-output-checklist.md)
   - [rule change checklist](../../../evals/rule-change-checklist.md)

## Guardrails

- block unsupported certainty
- block untyped supplier claims
- block hidden assumptions
- block recommendations that bypass deterministic reasoning where deterministic reasoning was expected

## Success criteria

A successful validation pass makes the output more defensible, not merely more verbose.
