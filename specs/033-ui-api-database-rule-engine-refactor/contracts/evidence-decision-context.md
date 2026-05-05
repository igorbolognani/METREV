# Contract Note - EvidenceDecisionContext

## Purpose

Record the temporary planning bridge between the runtime introduction of `EvidenceDecisionContext` and its promotion into the canonical owner files in the domain kit and hardened contract boundary.

## Current runtime owner

- `packages/domain-contracts/src/schemas.ts`
- `apps/api-server/src/services/case-evaluation.ts`
- `packages/rule-engine/src/index.ts`
- `packages/audit/src/index.ts`

## Canonical owner files to update

- `bioelectrochem_agent_kit/domain/ontology/evidence-schema.yml`
- `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/evidence-pack.schema.yaml`
- `bioelectro-copilot-contracts/contracts/rules/evidence_score.yaml`

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

The initial builder only admits decision-ready benchmark aggregates and accepted catalog evidence references derived from the existing benchmark slice query. Pending, rejected, supplier-only, or otherwise non-decision-ready evidence remains excluded and is represented only through the uncertainty/exclusion summary.

## Promotion rule

This note must be retired once the owner files above define the same shape or the approved canonical equivalent and the runtime loaders/tests are aligned. Runtime code must not become the long-term source of truth for evidence-decision semantics.
