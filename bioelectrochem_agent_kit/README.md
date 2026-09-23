# Domain source

This directory contains METREV's active scientific vocabulary, evidence meaning, and domain rules. Its scope is MFC, MEC, wastewater treatment/management, and standalone or integrated electrochemical biosensors.

- `domain/ontology/` defines active taxonomies and properties.
- `domain/rules/mechanistic-model.yml` defines the executable model boundary, parameter units, and minimum source fields.
- `domain/cases/templates/client-case-template.yml` is a blank structural example, not a measured case.

The runtime loader and implementation are in `packages/domain-contracts/` and `packages/electrochem-models/`. Keep literature values separate from site measurements, and do not add scientific defaults without an explicit source and type. See the root [README](../README.md) and [working rules](../AGENTS.md) for setup and limits.
