# Planning Note — Authority Boundaries

## Status

Planning-only and non-authoritative.

## Canonical owner files

- semantic ownership: `bioelectrochem_agent_kit/domain/`
- hardened contract boundary: `bioelectro-copilot-contracts/contracts/`
- runtime loader surface: `packages/domain-contracts/src/loaders.ts`

## Current state

`temporary adapter`

The current runtime adapts domain semantics into a contract-first executed rule path. That is the active behavior of the shipped code, but the repository still needs explicit reconciliation and tests to keep the split honest.

## Mapping summary

| Concern                                    | Canonical semantic source                                                  | Executed runtime source                                      | Current posture                      |
| ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| vocabulary and stack blocks                | `bioelectrochem_agent_kit/domain/ontology/*`                               | normalization and validation adapters                        | semantic source remains domain-first |
| case template                              | `bioelectrochem_agent_kit/domain/cases/templates/client-case-template.yml` | runtime-loaded directly                                      | active runtime input                 |
| defaults and missing-data policy           | `bioelectrochem_agent_kit/domain/rules/defaults.yml`                       | `bioelectro-copilot-contracts/contracts/rules/defaults.yaml` | contract-first executed rule         |
| deterministic diagnostics and improvements | domain rules and ontology context                                          | contract rule YAMLs plus runtime engine                      | contract-first executed rule         |
| report templates and relation notes        | contract reference files                                                   | no runtime consumer yet                                      | future-facing reference              |

## Validation required before retirement

- runtime tests prove the executed file list and required output sections
- ADR 0003 remains aligned with the live code path
- README and tooling docs do not imply a second active authority surface
