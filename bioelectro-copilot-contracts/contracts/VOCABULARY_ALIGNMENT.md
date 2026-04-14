# Vocabulary Alignment

This document records the contract unification decision.

## Canonical domain vocabulary
Use these names across prompts, rules, schemas, tests, and implementation:

- `technology_family`
- `architecture_family`
- `primary_objective`
- `business_context`
- `technology_context`
- `feed_and_operation`
- `stack_blocks`
- `cross_cutting_layers`
- `evidence_type`
- `strength_level`
- `applicability_scope`

## Legacy to canonical mapping

| Legacy term | Canonical term |
|---|---|
| `stack_type` | `technology_family` |
| `architecture` | `architecture_family` |
| `target_outcomes` | `primary_objective` plus supporting business and technical priorities |
| `anode` | `stack_blocks.anode_biofilm_support` |
| `cathode` | `stack_blocks.cathode_catalyst_support` |
| `membrane_separator` | `stack_blocks.membrane_or_separator` |
| `biology` | `stack_blocks.operational_biology` |
| `bop` | `stack_blocks.balance_of_plant` |
| `sensors_analytics` | `stack_blocks.sensors_and_analytics` |
| `economics` | `cross_cutting_layers.technoeconomics` |
| `source_type` | `evidence_type` with provenance metadata |
| `evidence_strength` | `strength_level` |
| `applicability` | `applicability_scope` |

## Rule
New files must extend the canonical vocabulary instead of adding synonyms.
