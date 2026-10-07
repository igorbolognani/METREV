# Restricted structured cell development runtime

This batch resumes the interrupted spatial implementation on main PR #112. The exact earlier transient patch could not be recovered. This implementation has its own versioned profile and does not promote the catalog's general 2D/3D research models.

The equation authority is `bioelectrochem_agent_kit/domain/ontology/structured-cell-equations.yaml`; serialization authority is `bioelectro-copilot-contracts/contracts/spatial_cell_input_v1.yaml`. TypeScript and Python reject missing provenance, wrong SI units, inconsistent dimensions, and unbalanced stoichiometry. The test fixture is a synthetic redox couple, not a microbial or wastewater measurement.

The solver assembles simultaneous species, liquid potential, electrode solid potentials and the MFC/MEC circuit in a sparse analytic Jacobian. Damped Newton uses SciPy sparse LU and positivity-limited backtracking. This batch does **not** implement the previously discussed PETSc SNES or a full electroneutral DAE. Each internal face flux is evaluated once with opposite contributions. 2D has an explicit physical depth; 3D uses the declared third length. Field summaries integrate over geometric area/volume, while balance diagnostics and circuit current use physical volume.

Convergence requires both the admitted scaled nonlinear tolerance and local/global species, liquid/solid charge, collector and load closure tolerances. A nonconverged run is failed, with verified fields, mesh and diagnostics retained. Solver process errors, timeout, cancellation and integrity failures follow the existing bounded worker lifecycle. No solve executes inside the HTTP request.

## Runtime/protocol version and queued-run compatibility

The numerical solver identifier remains `structured-cell-fv-v1`; the separately versioned process protocol is `structured-cell-process-v8`. Version 4 added volumetric `faradaic_current_density` and prescribed convective transport; version 5 added prescribed Darcy face flow; version 6 added the boundary-driven Darcy pressure solve; version 7 reports cell pressure only for that solved mode and rejects new admission of mesh-sized prescribed `cell_pressure` arrays; version 8 adds an optional source-backed neutral membrane/separator partition law. Older protocol results remain readable, while the active executor claims only runs queued for its exact runtime version.

Queue claims match both the persisted solver and runtime versions exactly. Keep matching v4, v5, v6, and v7 executor/sidecar pairs deployed until their queues drain, or explicitly cancel a legacy run and create a new run from its immutable input with a new idempotency key. Never rewrite persisted version fields. The v8 executor rejects older directly supplied runs before starting the sidecar.

## Explicit prescribed-flow transport

An optional `advection` block with version `structured-cell-prescribed-flow-v1` declares superficial face-normal velocities in m/s with source provenance. `structuredCellTransportFaces(input)` in the domain contracts returns the exact interior/boundary ordering also used by Python: lexicographic cell order, then coordinate axis. Interior signs point from left cell to right cell; boundary signs point outward. Every face must be supplied, including zero walls. `inlet_concentrations` covers each inflowing named transverse boundary and every species in sourced mol/m³.

Admission verifies local incompressible volume balance before solving. All membrane-incident faces and exterior collector faces require zero velocity. Diffusive boundaries remain separately and explicitly selected by `reservoir_faces`; omitted faces have zero diffusive flux. The conservative upwind flux uses sourced inlet states, solved outlet states and opposite contributions at each shared interior face. Species conservation diagnostics include the total diffusive and advective boundary flux. The analytic sparse Jacobian contains the upwind derivatives, and positivity-limited Newton remains unchanged.

This mode prescribes velocity; it does not solve Stokes or Darcy pressure. No pressure, membrane water transport, membrane partition or flow regime is inferred. Synthetic tests cover forward/reverse flow, exact zero-flow reduction, constant-state preservation, analytic reaction/advection/diffusion refinement in 2D/3D (including z direction), high Peclet positivity, directional Jacobian, sourced input rejection and retained failed diagnostics. These are mathematical checks, not empirical validation.

## Darcy pressure and cell transport

The `hydraulics` contract supports two explicit modes. `structured-cell-prescribed-darcy-v1` evaluates face flow from source-backed pressure at every ordered cell plus transverse boundary pressures. `structured-cell-darcy-pressure-solve-v1` assembles the orthogonal finite-volume conductance matrix from positive, source-backed regional permeability, dynamic viscosity, boundary pressures and impermeable faces, then solves for cell-center pressure. At least one transverse pressure boundary anchors the solve. There are no volumetric hydraulic sources.

The prescribed mode remains parseable for immutable v6 records, but v7 admission rejects it for new runs because its mesh-sized provenance array would be copied into the PostgreSQL JSON snapshot and sidecar request. New hydraulic runs use the boundary-driven solve. Both modes use the same face transmissibilities, check local incompressible volume balance, require sourced concentrations for every inflowing boundary, and pass the resulting Darcy velocity into the conservative upwind species flux. The solved pressure and reconstructed velocity components are persisted as cell fields and included in the modeled-field report. The pressure-solved mode is a restricted, steady, single-phase Darcy calculation. It does not implement bulk-to-porous interface laws, Brinkman/Navier–Stokes flow, variable/tensor permeability, membrane water transport, or a full-cell hydraulic product solver. Linear homogeneous 2D/3D cases verify the boundary-driven solve; this is mathematical software verification, not empirical validation.

## Neutral membrane partition interface

An optional `interface_partition` block declares a positive, source-backed equilibrium right/left concentration ratio for selected neutral species on an adjacent interface that touches a membrane or separator. Positive flux is oriented along increasing x. For a face with half-cell distances `h_L` and `h_R`, diffusivities `D_L` and `D_R`, area `A`, and partition ratio `K_RL`, the steady diffusive flux is `A * (c_L - c_R / K_RL) / (h_L / D_L + h_R / (K_RL * D_R))`. At equilibrium `c_R = K_RL * c_L`, this flux is zero; the same flux is added to one cell and subtracted from the other. Unlisted species keep the existing continuous-concentration law.

The law is limited to neutral species in this supporting-electrolyte profile. It does not solve Donnan equilibrium, fixed-charge membrane electroneutrality, charged-ion partition, membrane convection or water transport. Input validation binds units and provenance, the equation graph records the interface and coefficient path, and the runtime version prevents an older worker from claiming the new input.

## Explicit development configuration

Install Python numerical requirements and normal workspace dependencies. The pinned sidecar container also includes SciPy. Run the existing spatial worker CLI separately from API and web. API and worker must use the same private artifact root and configured PostgreSQL repository. With a TypeScript loader, set both module paths to the absolute path of `packages/spatial-worker/src/structured-cell-development-adapter.ts`:

- `METREV_SPATIAL_WORKER_EXECUTOR_MODULE`
- `METREV_SPATIAL_API_RUNTIME_MODULE`
- `METREV_SPATIAL_DEVELOPMENT_ARTIFACT_ROOT`: shared private directory
- `METREV_SPATIAL_SIDECAR_PYTHON`: Python executable
- `METREV_SPATIAL_SIDECAR_MODULE_DIR`: absolute `apps/spatial-sidecar` directory
- Optional `METREV_SPATIAL_SIDECAR_IMAGE`: explicitly configured restricted container image

The default API remains closed to spatial execution until an operator supplies an admission adapter. The development adapter only admits this precise model. The `/modeling/spatial` workbench accepts complete source-backed JSON, queues work, reloads/cancels jobs and downloads digest-verified fields and numerical mesh. Its XY view is a numerical cell slice; 3D selection changes the actual z slice. The workbench downloads deterministic JSON/Markdown development reports with source-backed input, mesh/field references, conservation, precise termination and explicit decision ineligibility. Each run declares mesh refinement unassessed; broader case-runner/decision reports remain pending. Run/digest-bound field state prevents stale geometry during reload, and numerical cells support mouse/keyboard probes.

## Verification and remaining gates

Focused checks: native equilibrium in 2D/3D, analytic directional Jacobian, extruded physical current consistency, MEC input-energy sign, prescribed and boundary-solved Darcy flow in 2D/3D, local volume balance, nonconvergence retention, input rejection, real subprocess worker persistence and authenticated artifact download. Legacy process/container/API checks remain compatibility regressions; workers do not claim runs queued for another runtime version.

These checks are mathematical software verification only. A synthetic nonuniform 18/72/288-cell study and tolerance sensitivity are checked in `tests/contracts/test_spatial_cell_verification.py`; larger-mesh robustness, bulk/porous hydraulic interface coupling, full electroneutral ionic closure, selective charged-membrane interfaces, independent empirical validation and durable production artifact storage remain open. Cell-specific PostgreSQL and browser gates require successful runs on the exact PR head. General roadmap capabilities are not marked complete. No merge is part of this batch.

### Batch checkpoint, 2026-10-01

Local focused checks passed: seven native Python mathematical tests (including mass-action/Monod reactions across heterogeneous diffusion interfaces), TypeScript checks for API, worker and web, 43 focused contract/process/artifact/native-cell checks, and the preceding 53 passing regression checks (three DOLFINx native cases skipped without Docker). Governance validation and changed-file lint passed. The worker tests invoke Python for convergent 2D/3D and failed 2D runs and read both fields and mesh through Fastify. These counts describe overlapping test batches, not independent scientific benchmarks.

The prior screenshots establish an interrupted chat and identify the planned modules. Missing local image paths are attachment-read failures; they do not identify the cause of the earlier cloud interruption. No internal execution telemetry was available, so timeout, connection failure and platform issues remain unconfirmed. The previous transient implementation was not recovered from the accessible Git history/worktrees; this branch is the reproducible replacement checkpoint. Main remains unchanged.

## Verification/product follow-up after PR #113

`tests/postgres/structured-cell-roundtrip.test.ts` uses the seeded configured test database and native Python worker to verify MFC 2D/3D, MEC and failed results, including reload and owner-scoped report/artifact access. `pnpm run test:spatial-cell:e2e` uses `playwright.spatial-cell.config.ts` to start actual web/API/worker processes against an explicitly configured disposable database. Prepare it with the existing `db:bootstrap` command only after setting the test target. Chromium and NumPy/SciPy are required. The ordinary E2E configuration excludes this opt-in runtime.

The report endpoints and browser view are documented in `docs/api/SPATIAL_SIMULATIONS.md`. Current verification facts and blocked local gates are in `docs/audits/STRUCTURED_CELL_VERIFICATION_PRODUCT_BATCH_2026-10-01.md`; the earlier checkpoint above is historical.
