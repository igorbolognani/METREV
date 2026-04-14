---
name: intake-normalization
description: Use this skill when converting raw client descriptions into normalized, explicit, and uncertainty-aware case records.
---

# Intake Normalization

Use this skill when the system receives:
- meeting notes
- pilot descriptions
- stack summaries
- partial technical questionnaires
- procurement notes that imply technical constraints

## Goals

- normalize client input into the case schema
- preserve the meaning of raw input
- expose defaults, gaps, and assumptions
- produce confidence-aware case records

## Required workflow

1. read the raw input
2. map terms to canonical ontology names
3. normalize units
4. identify missing, ambiguous, or conflicting inputs
5. apply defaults only when necessary, using [defaults](../../../domain/rules/defaults.yml)
6. validate against [plausible ranges](../../../domain/rules/plausible-ranges.yml)
7. emit:
   - normalized case
   - defaults used
   - missing data
   - assumptions
   - recommended next measurements

## Key resources

- [client case template](../../../domain/cases/templates/client-case-template.yml)
- [property dictionary](../../../domain/ontology/property-dictionary.yml)
- [plausible ranges](../../../domain/rules/plausible-ranges.yml)

## Guardrails

- never hide missing data
- never silently invent values
- never present estimated values as measured values
- reduce confidence when critical parameters are absent

## Success criteria

A successful result is structured, auditable, and safe for downstream inference.
