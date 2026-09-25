# Contracts

These files define the validation and serialization boundary used by METREV. They must match the scientific meaning in `bioelectrochem_agent_kit/domain/`; runtime validators and adapters live in `packages/domain-contracts/`.

- `input_schema.yaml` and `output_contract.yaml`: normalized case and decision-output shapes.
- `ontology/`: stack, evidence, property, and relation vocabulary.
- `rules/`: compatibility, defaults, scoring, ranges, diagnostics, and evidence rules.
- `research/`: literature, extraction, evidence-pack, and review payload schemas.
- `evaluation/`: model-to-observation comparison request and result schemas.
- `reports/`: output templates referenced by contract reconciliation.
- `suppliers/`: supplier normalization and record template.

Scientific parameters require a numeric value, unit, source kind, and non-empty source reference. Keep modeled values, measurements, literature candidates, assumptions, and fixtures distinguishable. Update the corresponding domain file and focused contract/runtime tests when a boundary changes.

The evaluation comparison contract is YAML encoded JSON Schema Draft 2020-12. Its root `$ref` validates a comparison request; consumers can validate a result through `#/$defs/ComparisonResult`. Runtime Zod validators are kept in parity with that schema by contract tests.
