---
name: evidence-curation
description: Use this skill when organizing literature findings, supplier claims, internal benchmark notes, and applicability limits into typed evidence.
---

# Evidence Curation

Use this skill to create a trustworthy evidence layer for the platform.

## Goals

- classify evidence by type
- preserve provenance and applicability conditions
- separate supplier claims from stronger evidence categories
- prepare evidence for deterministic or semi-deterministic reasoning

## Required workflow

1. identify each evidence item
2. classify it using the evidence schema
3. record applicability conditions
4. record uncertainty or weakness
5. map the evidence to relevant stack blocks and subdomains
6. note contradictions or context-transfer problems
7. update or propose updates to:
   - [evidence schema](../../../domain/ontology/evidence-schema.yml)
   - [supplier catalog template](../../../domain/suppliers/supplier-catalog.template.yml)
   - [supplier normalization](../../../domain/suppliers/supplier-normalization.yml)

## Evidence categories

Use at minimum:
- literature_evidence
- internal_benchmark
- supplier_claim
- engineering_assumption
- derived_heuristic

## Guardrails

- do not flatten all evidence into one confidence bucket
- do not treat one benchmark as universal
- do not strip away operating context

## Success criteria

A successful result gives the inference layer structured, typed, and applicability-aware evidence.
