# Contract rules

Rule files use the canonical names and case-rooted paths in `../ontology/stack.yaml` and metrics in `../ontology/property_dictionary.yaml`. Domain intent is defined in `bioelectrochem_agent_kit/domain/rules/`; runtime behavior is implemented in `packages/rule-engine/` and `packages/evidence-audit/`.

When a rule changes, update its domain counterpart when relevant and run `tests/contracts/` plus the focused runtime tests. Do not use this directory for an alternate or shortened domain vocabulary.
