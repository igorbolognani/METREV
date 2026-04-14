---
name: run-case-evaluation
description: Use this skill to execute the full case-evaluation pipeline from normalized case input to structured decision output.
---

# Run Case Evaluation

Use this skill when a client case needs a full decision-support pass.

## Pipeline

1. confirm the case is normalized
2. check defaults and missing-data exposure
3. identify candidate decision paths
4. apply compatibility logic
5. apply scoring logic
6. frame sensitivity and confidence
7. prepare structured output for reporting

## Required inputs

- normalized client case
- ontology files
- rules
- evidence objects
- supplier metadata when relevant

## Required outputs

- diagnosis
- prioritized options
- impact map
- shortlist
- phased roadmap
- confidence and next tests

## Key resources

- [client case template](../../../domain/cases/templates/client-case-template.yml)
- [compatibility rules](../../../domain/rules/compatibility-rules.yml)
- [scoring model](../../../domain/rules/scoring-model.yml)
- [sensitivity presets](../../../domain/rules/sensitivity-presets.yml)
- [consulting report template](../../../reports/templates/consulting-report-template.md)

## Guardrails

- do not skip validation
- do not rank options without rationale
- do not suppress sensitivity issues
- do not present a single best path when the case is materially under-specified

## Success criteria

A successful run is structured, ranked, uncertainty-aware, and directly usable for a consulting-style report.
