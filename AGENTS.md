# METREV working rules

Read `README.md` for bootstrap and the authority map. Read `governance/PROJECT_STATE.yaml`, `ROADMAP.yaml`, `DEPENDENCY_GRAPH.yaml`, `CAPABILITY_MATRIX.yaml`, and `ACCEPTANCE_GATES.yaml` before choosing work. Confirm the live remote `main` HEAD and a clean tree before editing. `main` is the release source of truth and `dev` is the persistent development baseline; keep `dev` fast-forwarded to the latest verified `main`. Use one short-lived branch for a coherent PR and target it directly at `main`.

The full, unabridged 40-point brief is `governance/MASTER_EXECUTION_TASK.md`. A roadmap item is complete only after every requirement in its referenced section and every required gate is evidenced. Run `pnpm run governance:check` after changing the catalog, roadmap, maturity or gates. Never promote a capability just because code compiles or a test passes. Move through dependencies; expose blockers and execute prerequisites first. Keep high-cost architectural decisions in focused ADRs only.

## Active scope and owners

- Product scope: MFC, MEC, wastewater treatment/management, and standalone or integrated electrochemical biosensors. MEC hydrogen remains secondary.
- `bioelectrochem_agent_kit/domain/` owns scientific meaning, active taxonomies, and domain rules.
- `bioelectro-copilot-contracts/contracts/` owns validation and serialization shapes.
- `packages/domain-contracts/` loads, normalizes, and reconciles those sources; `packages/`, `apps/`, and `tests/` implement and verify runtime behavior.
- Keep legacy enum values only where required to read stored cases. Do not offer them as new choices, classify unknown technology as MET, or reactivate out-of-scope applications.

## Scientific input and output rules

- Never invent, backfill, or silently default a scientific measurement or parameter.
- Never silently lower requested fidelity (including 3D→2D→1D→0D). Report missing data and unsupported physics separately with exact module and boundary requirements.
- Each scientific parameter must retain `value`, `unit`, `source_kind`, and `source_ref`. Distinguish measured, literature, default, assumption, and test-fixture values; fixtures are test data only.
- Validate units and ranges at the boundary. Missing or inconsistent critical inputs in a user-case simulation return `insufficient_data`; selecting a catalogued profile with no executable equations returns `not_implemented`. Neither status may block model implementation, software verification, or reproduction of a published study case.
- Development runs may use source-traced candidate literature values and observations while human source review is pending. Preserve exact locators, extraction method, units, study conditions, dataset role, and extraction uncertainty; mark comparisons provisional and keep them out of accepted evidence and decision recommendations.
- Human review is not a prerequisite for extracting equations, choosing model structures, implementing solvers, running numerical verification, or doing provisional calibration/development comparisons. Keep review as a later gate for curated evidence, independent validation claims, and decision eligibility.
- Keep wastewater measurements, model inputs, modeled outputs, development observations, and independent observations distinct. Literature search results are not case measurements; a paper's experimental data can still be a development benchmark when represented as a separate study case.
- Describe the case-runner model as lumped 0D and isothermal. The standalone Gatti 1D development solver resolves fractional substrate by slice index. The standalone porous-anode 1D solver resolves steady substrate reaction/transport across electrode thickness with local porosity and accessible volumetric area; its membrane resistance is a diagnostic, not a coupled membrane/cathode field. The standalone 1D membrane ion solver uses declared membrane-side boundary concentrations and an imposed potential, without Donnan equilibrium, fixed charge, convection, or coupled charge conservation. None of these is the broader direct-transfer, 2D, or 3D research profile. Do not claim independent calibration, uncertainty propagation, or experimental validation without evidence.
- The restricted planar 1D development cell couples porous-anode reaction/transport, an electroneutral binary membrane reduction, cathode polarization, and an MFC load or MEC applied-voltage boundary through one current. It is callable through `runConfiguredElectrochemicalModel` and through persisted case evaluation only with a complete source-backed `cell_1d`. Its outputs remain informational development results; it is not a general 1D/2D/3D profile. Its optional uniform-binary-ideal-donnan-v1 membrane closes fixed pore-liquid charge and NP current only for identical electroneutral monovalent solution reservoirs, uniform partitions and a common pore-factor path; unequal ion diffusivities are supported. When selected, species boundary concentrations are solution-side, not membrane-side. Its imposed anode material potential offsets, steady operation, and binary/uniform membrane boundary are explicit restrictions; numerical closure is not empirical calibration.
- MEC electrical input is not generated energy. Report gross and captured hydrogen separately and keep auxiliary/sensor loads explicit.
- Preserve model and data limits in the UI, API, and reports. A test of an invariant does not establish predictive accuracy.
- Separate implemented physics, numerical verification, development comparison, calibration, independent validation, and product integration. A conceptual SVG is never a numerical mesh. Cell, stack, pore and nano scales require declared transfer maps; do not mesh them together by default.
- For every changed physics module declare equation ID, domain, state variables, SI units, sign convention, boundary conditions, assumptions, supported dimensions and unsupported physics; test conservation and limiting cases. Keep experimental observations out of the modeled-output namespace.

## Change and data safety

- Put business rules in domain/runtime packages, not UI copy or LLM narrative. Keep route handlers thin and types/contracts aligned.
- Keep large spatial arrays in versioned artifact storage; persist metadata, hashes and scalar summaries in PostgreSQL. Do not run large spatial solves synchronously in Fastify. The LLM cannot override deterministic solver/evidence states.
- For behavior changes, add focused regression coverage for valid, missing, unit/range-invalid, and boundary cases as applicable.
- Run the narrowest relevant test/typecheck/lint first, then broader available checks. Report blocked gates accurately.
- Dry-run/planning commands must stay offline and must not initialize PostgreSQL or call providers. Do not run real ingestion, migration, seed, pruning, or database writes unless the task explicitly calls for a configured target database.
- Keep copyrighted full text local unless redistribution rights permit committing it. Preserve source access/license metadata and do not present supplier claims as validated measurements.
- Update this file or `README.md` only when operating rules or bootstrap steps change. Keep authoritative equations, evidence and maturity in their linked registries instead of duplicating them in agent prose.
