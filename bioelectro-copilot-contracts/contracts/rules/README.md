# Rules package vocabulary contract

This directory contains rule files that operate against the **canonical contracts vocabulary** defined in this package.

## Authoritative sources

The authoritative vocabulary for this package lives in:

- `bioelectro-copilot-contracts/contracts/ontology/stack.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/property_dictionary.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/relations.yaml`

## How field references must work

Rule files in this folder must reference canonical stack fields using full case-rooted paths, for example:

- `case.technology_family`
- `case.architecture_family`
- `case.primary_objective`
- `case.feed_and_operation.influent_type`
- `case.stack_blocks.anode_biofilm_support.material_family`
- `case.stack_blocks.cathode_catalyst_support.reaction_target`
- `case.stack_blocks.membrane_or_separator.type`
- `case.stack_blocks.balance_of_plant.flow_control`
- `case.stack_blocks.sensors_and_analytics.data_quality`
- `case.stack_blocks.operational_biology.biofilm_maturity`
- `case.cross_cutting_layers.risk_and_maturity.trl`
- `case.cross_cutting_layers.technoeconomics.maintenance_burden`

For measured metrics, use names from `property_dictionary.yaml`, such as:

- `current_density_a_m2`
- `power_density_w_m2`
- `internal_resistance_ohm`
- `cod_removal_pct`

## Non-negotiable rule

This folder is **not** the place to introduce a second compact vocabulary.

Do not use forms such as:

- `anode.material_family`
- `cathode.reaction_target`
- `membrane_separator.type`
- `biology.biofilm_maturity`
- `bop.flow_control`
- `sensors_analytics.data_quality`
- `economics.maintenance_burden`
- `stack.target_outcomes`

Those are shorthand runtime ideas at best, not canonical contract paths.

## Rule-authoring requirement

When changing or adding rule files:

1. Prefer explicit canonical field paths rooted at `case`.
2. Use metric names only from `property_dictionary.yaml`.
3. If the contracts vocabulary is insufficient, update `ontology/stack.yaml` first.
4. Then update the rules.
5. Keep `tests/contracts/test_canonical_vocabulary.py` passing.

## Migration policy

A future merge or consolidation with exploratory domain scaffolding is reasonable only after:

- schema validation is enforced,
- contract names have stabilized through real cases,
- and vocabulary changes are no longer speculative.

Until then, this folder should stay conservative and contract-first.
