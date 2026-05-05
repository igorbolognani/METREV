# Contract Note - EvidenceDecisionContext

## Status

Retired. The planning bridge has been promoted into runtime schemas, hardened contract YAML, domain ontology, persistence, rule-engine consumption, and regression tests.

## Purpose

Record the temporary planning bridge between the runtime introduction of `EvidenceDecisionContext` and its promotion into the canonical owner files in the domain kit and hardened contract boundary.

## Current runtime owner

- `packages/domain-contracts/src/schemas.ts`
- `apps/api-server/src/services/case-evaluation.ts`
- `packages/rule-engine/src/index.ts`
- `packages/audit/src/index.ts`

## Canonical owner files promoted in this feature

- `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`

Adjacent research-pack and evidence-score contracts remain canonical for their own surfaces; this note does not override them.

## Runtime shape introduced in this batch

- `case_id`
- `technology_family`
- `system_type`
- `primary_objective`
- `query`
- `benchmark_ranges`
- `matched_evidence`
- `material_comparisons`
- `operating_window_signals`
- `failure_mode_signals`
- `cost_signals`
- `supplier_signals`
- `uncertainty_summary`
- `provenance_note`
- `source_refs`
- `builder_version`

## Admissibility rule in current runtime slice

The current builder only admits decision-ready benchmark aggregates and accepted, reviewed, traceable catalog evidence derived from the benchmark slice query. Pending, rejected, supplier-only, closed-access, low-quality, untraceable, or otherwise non-decision-ready evidence remains excluded and is represented only through uncertainty and exclusion summaries.

## Promotion rule

This note is retained only as historical planning context. Runtime code is not the long-term source of truth for evidence-decision semantics; the active semantics are now carried by the domain ontology and hardened contract boundary, with runtime schemas/tests aligned to those owners.
