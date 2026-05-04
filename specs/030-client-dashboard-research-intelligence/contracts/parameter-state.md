# Parameter State Contract Note

## Purpose

Define a canonical runtime shape for parameter behavior before the stack configurator gains default/include/exclude controls.

## Canonical owner files

- `packages/domain-contracts/src/schemas.ts`
- `bioelectrochem_agent_kit/domain/ontology/property-dictionary.yml`
- `bioelectrochem_agent_kit/domain/rules/defaults.yml`

## Proposed parameter facets

- `included`: whether the parameter is actively considered
- `value_source`: `client`, `system_default`, or `unset`
- `value`: the active parameter value when included
- `unit`: display and audit unit
- `default_rationale`: why the system default exists
- `confidence_impact`: how missing/defaulted/excluded state affects confidence
- `evidence_refs`: optional reviewed evidence support for recommended defaults
- `audit_note`: explicit trace for review and report output

## Notes

- excluded parameters must remain visible in audit output instead of disappearing silently
- defaulted parameters must surface through `defaults_used`, assumptions, and confidence framing
- recommended values must remain backend-owned and provenance-aware
