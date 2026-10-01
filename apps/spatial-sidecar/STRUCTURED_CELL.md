# Restricted structured cell development runtime

This batch resumes the interrupted spatial implementation on main PR #112. The exact earlier transient patch could not be recovered. This implementation has its own versioned profile and does not promote the catalog's general 2D/3D research models.

The equation authority is `bioelectrochem_agent_kit/domain/ontology/structured-cell-equations.yaml`; serialization authority is `bioelectro-copilot-contracts/contracts/spatial_cell_input_v1.yaml`. TypeScript and Python reject missing provenance, wrong SI units, inconsistent dimensions, and unbalanced stoichiometry. The test fixture is a synthetic redox couple, not a microbial or wastewater measurement.

The solver assembles simultaneous species, liquid potential, electrode solid potentials and the MFC/MEC circuit in a sparse analytic Jacobian. Damped Newton uses SciPy sparse LU and positivity-limited backtracking. This batch does **not** implement the previously discussed PETSc SNES or a full electroneutral DAE. Each internal face flux is evaluated once with opposite contributions. 2D has an explicit physical depth; 3D uses the declared third length. Field summaries integrate over geometric area/volume, while balance diagnostics and circuit current use physical volume.

Convergence requires both the admitted scaled nonlinear tolerance and local/global species, liquid/solid charge, collector and load closure tolerances. A nonconverged run is failed, with verified fields, mesh and diagnostics retained. Solver process errors, timeout, cancellation and integrity failures follow the existing bounded worker lifecycle. No solve executes inside the HTTP request.

## Explicit development configuration

Install Python numerical requirements and normal workspace dependencies. The pinned sidecar container also includes SciPy. Run the existing spatial worker CLI separately from API and web. API and worker must use the same private artifact root and configured PostgreSQL repository. With a TypeScript loader, set both module paths to the absolute path of `packages/spatial-worker/src/structured-cell-development-adapter.ts`:

- `METREV_SPATIAL_WORKER_EXECUTOR_MODULE`
- `METREV_SPATIAL_API_RUNTIME_MODULE`
- `METREV_SPATIAL_DEVELOPMENT_ARTIFACT_ROOT`: shared private directory
- `METREV_SPATIAL_SIDECAR_PYTHON`: Python executable
- `METREV_SPATIAL_SIDECAR_MODULE_DIR`: absolute `apps/spatial-sidecar` directory
- Optional `METREV_SPATIAL_SIDECAR_IMAGE`: explicitly configured restricted container image

The default API remains closed to spatial execution until an operator supplies an admission adapter. The development adapter only admits this precise model. The `/modeling/spatial` workbench accepts complete source-backed JSON, queues work, reloads/cancels jobs and downloads digest-verified fields and numerical mesh. Its XY view is a numerical cell slice; 3D selection changes the actual z slice. Reports retain development limitations and decision ineligibility.

## Verification and remaining gates

Focused checks: native equilibrium in 2D/3D, analytic directional Jacobian, extruded physical current consistency, MEC input-energy sign, nonconvergence retention, input rejection, real subprocess worker persistence and authenticated artifact download. Existing v2 worker/process/container/API tests must remain green.

These checks are mathematical software verification only. Mesh-convergence studies, coupled hydraulic advection, full electroneutral ionic closure, selective charged-membrane interfaces, independent empirical validation, deployment with durable production artifact storage, PostgreSQL end-to-end and browser interaction gates remain outstanding. General roadmap capabilities are not marked complete. No merge is part of this batch.

### Batch checkpoint, 2026-10-01

Local focused checks passed: seven native Python mathematical tests (including mass-action/Monod reactions across heterogeneous diffusion interfaces), TypeScript checks for API, worker and web, 43 focused contract/process/artifact/native-cell checks, and the preceding 53 passing regression checks (three DOLFINx native cases skipped without Docker). Governance validation and changed-file lint passed. The worker tests invoke Python for convergent 2D/3D and failed 2D runs and read both fields and mesh through Fastify. These counts describe overlapping test batches, not independent scientific benchmarks.

The prior screenshots establish an interrupted chat and identify the planned modules. Missing local image paths are attachment-read failures; they do not identify the cause of the earlier cloud interruption. No internal execution telemetry was available, so timeout, connection failure and platform issues remain unconfirmed. The previous transient implementation was not recovered from the accessible Git history/worktrees; this branch is the reproducible replacement checkpoint. Main remains unchanged.
