# Implementation plan

## Phase 1 — scope and scientific contracts

- Make MFC, MEC, electrochemical biosensor, wastewater treatment, and biosensing the only active intake/research concepts.
- Keep legacy values in persisted/runtime read compatibility only; update domain vocabulary, serialized contract descriptions, prompts, audit metric groups, and regression assertions together.
- Define source-backed SI scientific parameters, wastewater quality fields, mechanistic input schema, biosensor deployment/calibration/performance schema, and explicit model-result labels.
- Add a machine-readable mechanistic model definition as the domain-side input/unit/range authority loaded by the runtime.

## Phase 2 — coupled baseline

- Add deterministic 0D state evolution for COD, attached electroactive biomass, MFC oxygen transfer, and anode/cathode pH.
- Couple biological uptake to electrochemical current and material-active area; solve electrode overpotentials using Butler–Volmer and close the circuit with ohmic losses plus the MFC load or MEC applied voltage.
- Report electricity/auxiliary demand for MFC, electrical input and gross/captured hydrogen for MEC, and mark every result as a model output.
- Add standalone and integrated amperometric sensor output with power sufficiency checks and explicit unsupported/incomplete states.
- Keep the executable boundary and known omissions in the model and docs.

## Phase 3 — focused input and literature plumbing

- Replace active preset menu with five unpopulated MFC/MEC/biosensor configurations.
- Add typed JSON intake for mechanistic parameters, biosensor specification, and wastewater quality; normalize only explicit units.
- Define bounded literature queries for MFC/MEC wastewater reactors, component/material and biological kinetics, and standalone/integrated biosensors.
- Set defaults to 500 planned literature records, 20 queries, and hard bound 5,000. Do not apply the earlier 30k/500k targets.
- Add offline planning modes that produce a plan without DB/provider access; keep actual ingestion explicit.

## Phase 4 — verification and integration

- Add tests for MFC, MEC, integrated and standalone sensor cases, missing inputs, units, range/architecture failures, finite outputs, mass/state bounds, hydrogen closure, and power shortfall.
- Add taxonomy alignment assertions so active scopes cannot silently broaden.
- Typecheck changed packages/apps; run targeted JS and Python contract tests, then broader lint/test/build checks where dependencies allow.
- Exercise the offline queue and provider-bootstrap planning paths with spies proving no database/provider side effects.
- Generate the repository functional export after edits if that file remains a maintained generated deliverable.
- Commit to a focused branch and open a review PR; do not merge automatically.

## Rollback and data safety

The change does not migrate or delete PostgreSQL rows. Legacy inputs remain readable by compatibility adapters while active forms, query plans, extraction prompts, and evidence eligibility are narrowed. The old 30k query config is removed from active storage; historical specs remain intact. Do not run migration, seed, or live ingestion commands against an unspecified database.
