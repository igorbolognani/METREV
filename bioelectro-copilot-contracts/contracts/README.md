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
