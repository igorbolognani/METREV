---
name: mcp-assisted-research
description: Use this skill when MCP is used to retrieve structured external or internal context without bypassing ontology, evidence typing, or validation.
---

# MCP-Assisted Research

Use this skill when MCP tools are available and can reduce retrieval friction responsibly.

## Goals

- retrieve relevant context from approved MCP sources
- preserve provenance
- normalize retrieved content into internal schemas
- avoid letting MCP become unreviewed decision logic

## Required workflow

1. identify the research need
2. identify the approved MCP source
3. retrieve only the minimum useful context
4. classify the retrieved content:
   - evidence candidate
   - supplier metadata candidate
   - workflow context
   - implementation context
5. normalize the content into project structures
6. state what still requires human or rule-based validation

## Preferred early MCP uses

- GitHub implementation context
- internal evidence index lookup
- internal supplier metadata lookup

## Guardrails

- do not let MCP output directly set scores
- do not treat raw MCP output as final evidence
- do not bypass missing-data or confidence logic
- prefer read-only retrieval in early phases

## Success criteria

A successful MCP-assisted result reduces manual effort while preserving the project’s decision contract.
