---
name: build-stack-ontology
description: Use this skill when defining or revising the ontology, canonical names, component relationships, or property schema for MFC, MEC, and MET stack evaluation.
---

# Build Stack Ontology

Use this skill when the task is about domain structure rather than code generation alone.

## Goals

- define stable stack blocks
- define canonical names and aliases
- define property semantics and required fields
- define relationships between components and cross-cutting layers
- keep the ontology decision-oriented and implementation-safe

## Required workflow

1. identify the decision problem the ontology must support
2. identify the entities and relationships required
3. update or propose updates to:
   - [stack-taxonomy](../../../domain/ontology/stack-taxonomy.yml)
   - [component-graph](../../../domain/ontology/component-graph.yml)
   - [property-dictionary](../../../domain/ontology/property-dictionary.yml)
   - [evidence-schema](../../../domain/ontology/evidence-schema.yml)
4. check downstream effects on:
   - intake schema
   - rules
   - report templates
5. recommend spec or ADR updates if the change is structural

## Guardrails

- do not collapse important distinctions into vague buckets
- do not treat economics as a hardware block
- do not hide biology inside generic process terms
- do not introduce terms that the rest of the pipeline cannot reuse consistently

## Success criteria

A successful result:
- improves naming consistency
- improves interoperability across files
- supports rule writing and report generation
- reduces ambiguity in future sessions
