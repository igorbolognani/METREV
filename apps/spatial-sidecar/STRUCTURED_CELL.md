# Restricted structured cell development runtime

This batch resumes the interrupted spatial implementation on main PR #112. The exact earlier transient patch could not be recovered. This implementation has its own versioned profile and does not promote the catalog's general 2D/3D research models.

The equation authority is `bioelectrochem_agent_kit/domain/ontology/structured-cell-equations.yaml`; serialization authority is `bioelectro-copilot-contracts/contracts/spatial_cell_input_v1.yaml`. TypeScript and Python reject missing provenance, wrong SI units, inconsistent dimensions, and unbalanced stoichiometry. The test fixture is a synthetic redox couple, not a microbial or wastewater measurement.

The solver assembles simultaneous species, liquid potential, electrode solid potentials and the MFC/MEC circuit in a sparse analytic Jacobian. Damped Newton uses SciPy sparse LU and positivity-limited backtracking. This batch does **not** implement the previously discussed PETSc SNES or a full electroneutral DAE. Each internal face flux is evaluated once with opposite contributions. 2D has an explicit physical depth; 3D uses the declared third length. Field summaries integrate over geometric area/volume, while balance diagnostics and circuit current use physical volume.

Convergence requires both the admitted scaled nonlinear tolerance and local/global species, liquid/solid charge, collector and load closure tolerances. A nonconverged run is failed, with verified fields, mesh and diagnostics retained. Solver process errors, timeout, cancellation and integrity failures follow the existing bounded worker lifecycle. No solve executes inside the HTTP request.

## Runtime/protocol version and queued-run compatibility

The numerical solver identifier remains `structured-cell-fv-v1`; the separately versioned process protocol is now `structured-cell-process-v4`. Version 4 adds the actual volumetric `faradaic_current_density` field in A/m³ and admits optional explicitly prescribed convective species transport. Without advection, the previous equations are retained; the new field is derived from the solved source rather than an inferred surface current density.

Queue claims match both the persisted solver and runtime versions exactly. A v4 worker ignores runs queued with `structured-cell-process-v2` or `structured-cell-process-v3`. Keep matching legacy executor/sidecar pairs deployed until their queues drain, or explicitly cancel a legacy run and create a v4 run from its immutable input using a new idempotency key. Never rewrite persisted version fields. The v4 executor rejects older directly supplied runs before starting the sidecar.

## Explicit prescribed-flow transport

An optional `advection` block with version `structured-cell-prescribed-flow-v1` declares superficial face-normal velocities in m/s with source provenance. `structuredCellTransportFaces(input)` in the domain contracts returns the exact interior/boundary ordering also used by Python: lexicographic cell order, then coordinate axis. Interior signs point from left cell to right cell; boundary signs point outward. Every face must be supplied, including zero walls. `inlet_concentrations` covers each inflowing named transverse boundary and every species in sourced mol/m³.

Admission verifies local incompressible volume balance before solving. All membrane-incident faces and exterior collector faces require zero velocity. Diffusive boundaries remain separately and explicitly selected by `reservoir_faces`; omitted faces have zero diffusive flux. The conservative upwind flux uses sourced inlet states, solved outlet states and opposite contributions at each shared interior face. Species conservation diagnostics include the total diffusive and advective boundary flux. The analytic sparse Jacobian contains the upwind derivatives, and positivity-limited Newton remains unchanged.

This is prescribed-flow transport, not a solved Stokes/Darcy cell hydraulic coupling. No pressure, water transport, membrane partition or flow regime is inferred. Synthetic tests cover forward/reverse flow, exact zero-flow reduction, constant-state preservation, analytic reaction/advection/diffusion refinement in 2D/3D (including z direction), high Peclet positivity, directional Jacobian, sourced input rejection and retained failed diagnostics. These are mathematical checks, not empirical validation.

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

Focused checks: native equilibrium in 2D/3D, analytic directional Jacobian, extruded physical current consistency, MEC input-energy sign, nonconvergence retention, input rejection, real subprocess worker persistence and authenticated artifact download. Legacy v2 worker/process/container/API checks remain compatibility regressions; v4 workers do not claim v2/v3 queue items.

These checks are mathematical software verification only. A synthetic nonuniform 18/72/288-cell study and tolerance sensitivity are checked in `tests/contracts/test_spatial_cell_verification.py`; larger-mesh robustness, solved hydraulic cell-flow coupling, full electroneutral ionic closure, selective charged-membrane interfaces, independent empirical validation, deployment with durable production artifact storage, cell-specific PostgreSQL and browser gates are implemented in CI and require successful runs on their exact branch head. General roadmap capabilities are not marked complete. No merge is part of this batch.

### Batch checkpoint, 2026-10-01

Local focused checks passed: seven native Python mathematical tests (including mass-action/Monod reactions across heterogeneous diffusion interfaces), TypeScript checks for API, worker and web, 43 focused contract/process/artifact/native-cell checks, and the preceding 53 passing regression checks (three DOLFINx native cases skipped without Docker). Governance validation and changed-file lint passed. The worker tests invoke Python for convergent 2D/3D and failed 2D runs and read both fields and mesh through Fastify. These counts describe overlapping test batches, not independent scientific benchmarks.

The prior screenshots establish an interrupted chat and identify the planned modules. Missing local image paths are attachment-read failures; they do not identify the cause of the earlier cloud interruption. No internal execution telemetry was available, so timeout, connection failure and platform issues remain unconfirmed. The previous transient implementation was not recovered from the accessible Git history/worktrees; this branch is the reproducible replacement checkpoint. Main remains unchanged.

## Verification/product follow-up after PR #113

`tests/postgres/structured-cell-roundtrip.test.ts` uses the seeded configured test database and native Python worker to verify MFC 2D/3D, MEC and failed results, including reload and owner-scoped report/artifact access. `pnpm run test:spatial-cell:e2e` uses `playwright.spatial-cell.config.ts` to start actual web/API/worker processes against an explicitly configured disposable database. Prepare it with the existing `db:bootstrap` command only after setting the test target. Chromium and NumPy/SciPy are required. The ordinary E2E configuration excludes this opt-in runtime.

The report endpoints and browser view are documented in `docs/api/SPATIAL_SIMULATIONS.md`. Current verification facts and blocked local gates are in `docs/audits/STRUCTURED_CELL_VERIFICATION_PRODUCT_BATCH_2026-10-01.md`; the earlier checkpoint above is historical.
