# Contracts

This directory contains the normalized contract layer for the METREV bioelectrochemical decision platform.

## Canonical relationship

The operational domain source of truth is:

- `bioelectrochem_agent_kit/domain/`

This `contracts/` directory must stay semantically aligned with that domain kit. It exists to provide a stable, implementation-friendly representation for:

- validation
- storage and serialization
- API and database boundary definitions
- report generation contracts
- future integration testing

## Non-negotiable rule

`contracts/` is not allowed to introduce a second domain vocabulary.
When the domain kit evolves, these contracts must be updated to reflect the same semantics rather than inventing parallel names.

## Sections

- `input_schema.yaml` → normalized case intake contract
- `output_contract.yaml` → normalized decision output contract
- `ontology/` → stack taxonomy, evidence schema, relations, property dictionary
- `rules/` → defaults, compatibility, scoring, ranges, sensitivity, failure modes
- `suppliers/` → supplier normalization and supplier record template
- `reports/` → reporting templates

## Expanded Evidence Boundary

The runtime evidence model is no longer a single compact `evidence_record` with loose JSON fragments.
The hardened contract boundary now needs to stay aligned with six related surfaces:

- `source_document` → the imported or curated external record with provider metadata, access posture, and raw payload retention
- `catalog_item` → the analyst-facing evidence registry record that carries review posture, applicability scope, and intake-facing summary fields
- `evidence_claim` → typed extracted or curated claims with extraction provenance, confidence, review state, and ontology mapping support
- `claim_review` → analyst review facts attached to extracted claims so acceptance posture changes stay attributable
- `ontology_mapping` → advisory mappings that remain challengeable because confidence and mapped-by provenance stay explicit
- `supplier_product` → supplier-linked product records that remain connected to canonical supplier and evidence provenance
- `supplier_document` → source documents linked to supplier and optional product context without bypassing the canonical evidence registry
- `evaluation_lineage` → persisted source and claim usage records showing what a decision run actually used
- `workspace_snapshot` → immutable persisted payloads for evaluation, report, and export replay

The validation-facing boundary also now includes the evidence-review payload family used by the runtime API:

- `external_evidence_catalog_summary`
- `external_evidence_catalog_detail`
- `external_evidence_catalog_list_response`
- `external_evidence_bulk_review_request`
- `external_evidence_bulk_review_response`

This boundary exists so storage, serialization, APIs, and future database integrations can remain explicit about provenance and review posture instead of flattening everything into anonymous evidence blobs.

The repository-level decision that ratifies the dual snapshot-plus-backfill posture, broad corpus scope, and workspace reorganization is recorded in `adr/0004-big-data-snapshot-and-workspace-reorg.md`.

## Runtime Alignment Note

The runtime implementation under `apps/` and `packages/` may widen these shapes to support UI rendering or repository hydration, but it must adapt the same canonical semantics rather than introducing alternate names.

If a field is stored or returned at runtime and it changes validation-facing meaning, the canonical owner is this `contracts/` layer and the counterpart semantic owner in `bioelectrochem_agent_kit/domain/`.

## Migration note

Earlier iterations mixed a compact contract vocabulary with a more operational domain vocabulary.
That drift has been removed here by aligning contracts with the bioelectrochemical domain kit.

## Relationship to feature planning artifacts

Feature folders under `specs/<feature>/contracts/` may contain planning-only notes, examples, mapping tables, or proposed deltas used during review.
Those artifacts:

- are not canonical schemas
- must reuse the current canonical vocabulary or mark proposed terms as proposed
- must cite the canonical owner files in this directory or in `bioelectrochem_agent_kit/domain/`
- must not be consumed directly by runtime validators, generators, or persistence code

Approved contract changes are only complete once they are promoted into this directory and the aligned tests stay green.
