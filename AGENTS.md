# METREV working rules

Read `README.md` for the current scope, model boundary, input policy, setup, and checks. Do not create numbered feature specs, plans, ADRs, or parallel workflow documents; keep essential operating guidance here and in the code contracts/tests.

## Active scope and owners

- Product scope: MFC, MEC, wastewater treatment/management, and standalone or integrated electrochemical biosensors. MEC hydrogen remains secondary.
- `bioelectrochem_agent_kit/domain/` owns scientific meaning, active taxonomies, and domain rules.
- `bioelectro-copilot-contracts/contracts/` owns validation and serialization shapes.
- `packages/domain-contracts/` loads, normalizes, and reconciles those sources; `packages/`, `apps/`, and `tests/` implement and verify runtime behavior.
- Keep legacy enum values only where required to read stored cases. Do not offer them as new choices, classify unknown technology as MET, or reactivate out-of-scope applications.

## Scientific input and output rules

- Never invent, backfill, or silently default a scientific measurement or parameter.
- Each scientific parameter must retain `value`, `unit`, `source_kind`, and `source_ref`. Distinguish measured, literature, default, assumption, and test-fixture values; fixtures are test data only.
- Validate units and ranges at the boundary. Missing or inconsistent critical inputs in a user-case simulation return `insufficient_data`; selecting a catalogued profile with no executable equations returns `not_implemented`. Neither status may block model implementation, software verification, or reproduction of a published study case.
- Development runs may use source-traced candidate literature values and observations while human source review is pending. Preserve exact locators, extraction method, units, study conditions, dataset role, and extraction uncertainty; mark comparisons provisional and keep them out of accepted evidence and decision recommendations.
- Human review is not a prerequisite for extracting equations, choosing model structures, implementing solvers, running numerical verification, or doing provisional calibration/development comparisons. Keep review as a later gate for curated evidence, independent validation claims, and decision eligibility.
- Keep wastewater measurements, model inputs, modeled outputs, development observations, and independent observations distinct. Literature search results are not case measurements; a paper's experimental data can still be a development benchmark when represented as a separate study case.
- Describe the implemented model as lumped 0D and isothermal. Do not claim spatial resolution, independent calibration, uncertainty propagation, or experimental validation without evidence.
- MEC electrical input is not generated energy. Report gross and captured hydrogen separately and keep auxiliary/sensor loads explicit.
- Preserve model and data limits in the UI, API, and reports. A test of an invariant does not establish predictive accuracy.

## Change and data safety

- Put business rules in domain/runtime packages, not UI copy or LLM narrative. Keep route handlers thin and types/contracts aligned.
- For behavior changes, add focused regression coverage for valid, missing, unit/range-invalid, and boundary cases as applicable.
- Run the narrowest relevant test/typecheck/lint first, then broader available checks. Report blocked gates accurately.
- Dry-run/planning commands must stay offline and must not initialize PostgreSQL or call providers. Do not run real ingestion, migration, seed, pruning, or database writes unless the task explicitly calls for a configured target database.
- Keep copyrighted full text local unless redistribution rights permit committing it. Preserve source access/license metadata and do not present supplier claims as validated measurements.
- Update this file or `README.md` only when the operating rules or bootstrap steps actually change; do not add decision-history documents.
