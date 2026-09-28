# Master plan alignment audit — merged `main` at `390de6b`

This is a bounded audit of the 40-point program, not a certification of scientific completeness. The status column is the merged `governance/ROADMAP.yaml` state before the proposed numerical PRs #67–#68. At this SHA, 1 item is complete, 8 are partial, and 31 are pending. A proposed isolated scalar verification kernel does not make a cell model executable or experimentally validated.

## Material inspected and limits

- Current repository: `README.md`, `AGENTS.md`, all seven governance files, the checked-in `MASTER_EXECUTION_TASK.md` (3,632 lines; headings and relevant sections inspected), numerical/architecture ADRs, capability and fidelity catalogs, current 0D/1D solver and case paths, spatial contracts, Python sidecar, job/database/API/worker code, tests and CI. The Library copy has the same byte size (71,947 bytes), but content identity was not established from size alone; the checked-in file is the current execution authority.
- Git history and PR metadata/changed-file lists: all numbered PRs #1–#66 were inventoried; implementation diffs were reviewed through their current merged code for #30–#46 and #57–#66. PRs #47–#56 are dependency/CI changes; #55 was closed without merge. No PR #62 exists. Older #1–#29 are predominantly setup, dependency, CI and security work; the earlier scientific/product changes were audited at the present code boundary rather than treating old PR descriptions as current behavior.
- Historical Library materials: the 98,039-line repository export and duplicate ZIP snapshots were identified as earlier snapshots. Their directory structure was inspected; they were not reviewed line by line because the current Git history supersedes their code. The earlier conversation retrieval provided project decisions and constraints, not a complete transcript of every historical session. These are explicit scope limits, not evidence of absence.
- Baseline `pnpm run validate:fast` and governance checks passed on merged `main`; PostgreSQL, mesh and browser gates passed on the merged #64–#66 PRs in GitHub CI. This audit did not rerun a production deployment or independently reproduce empirical datasets.

## Cross-PR consistency findings

| PR range | Present boundary and correction                                                                                                                                                                                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #30–#36  | MFC/MEC/biosensor focus, reporting, evidence candidates and SVG browser preview remain product features. The preview is conceptual and cannot be counted as a numerical mesh or spatial solver.                                                                                                                                                      |
| #37–#39  | Sensitivity and experimental-comparison contracts exist. No independent full-cell validation or transferable calibration follows from these contracts; research profiles remain nonexecutable.                                                                                                                                                       |
| #40–#43  | Gatti biofilm, porous anode, membrane ion and restricted coupled-cell 1D implementations have distinct scientific limits. #44 later integrated only the complete source-backed restricted 1D case path; no general 1D stack model is implied.                                                                                                        |
| #44–#46  | Control-plane, isolated mesh sidecar and planar 2D input contract exist. Dimension 1/3 spatial input, real PDE execution and full physics composition remain open.                                                                                                                                                                                   |
| #47–#56  | CI/dependency changes, including merged `@auth/core` #50, do not add scientific capability. #55 is unmerged and #62 has no PR.                                                                                                                                                                                                                       |
| #57–#66  | Request-bound mesh manifests, owner-scoped development mesh storage, lifecycle/leases/API/worker and three-level geometry tests exist. #64 bounds an unresponsive adapter wait; #65 enforces retry version/lineage; #66 checks boundary/interface geometry. Production solver admission, native process termination and PDE convergence remain open. |

The merged roadmap had drift after these PRs: P04 still said there was no job service, P14 still said results were not connected to the API, P15 described PostgreSQL tests as only assigned to CI, P05 cited area without #66's boundary/interface checks, and worker docs still described only cooperative deadlines. The companion changes in this PR correct those statements without promoting a capability.

## All 40 work items and next evidence

| ID  | State    | Next dependency or acceptance evidence                                                                                           |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| P01 | partial  | Complete stack-to-module compatibility and equation assembly for configurations, including explicit unsupported-module results.  |
| P02 | partial  | Versioned 1D/3D geometries, spatial fields and product case intake with unit/provenance checks.                                  |
| P03 | partial  | Sourced heterogeneous flow, charge, reaction, gas, biofilm and membrane properties; no inferred accessible area.                 |
| P04 | partial  | Verify pinned DOLFINx/PETSc import and PDE solve in container; register only a reviewed worker adapter and artifact provider.    |
| P05 | partial  | Numerical cell geometry and local refinement, mesh quality and PDE-observable convergence beyond verified planar geometry.       |
| P06 | pending  | Conservative species/charge/circuit interface assembly on tagged domains; proposed #67–#68 cover scalar diffusion fixtures only. |
| P07 | pending  | Source-backed 2D incompressible hydraulics, inlet/outlet and porous coupling, mass and convergence checks after P05/P06.         |
| P08 | pending  | Coupled 2D anode/biofilm states, kinetics and transport after P06/P07, with interface balances.                                  |
| P09 | pending  | Membrane species/charge, partition/fixed charge and interface conditions beyond restricted binary 1D.                            |
| P10 | pending  | Resolved cathode kinetics/transport and electrolyte/solid charge boundary after P06.                                             |
| P11 | pending  | Nonlinear strategy, stabilization, positivity, diagnostics and failure gates after P06–P10.                                      |
| P12 | pending  | Execute an actual 2D research profile through assembled physics after P11, without silent fallback.                              |
| P13 | pending  | Manufactured, limiting, conservation, mesh/time and nonlinear verification of the coupled P12 solver.                            |
| P14 | partial  | Bind output field kinds/units to input authority; production field storage and viewer still absent.                              |
| P15 | partial  | Durable production artifact lifecycle, large-field reload and operational database verification beyond CI.                       |
| P16 | partial  | Register a reviewed solver and production limits; test native process termination, recovery and resource isolation.              |
| P17 | pending  | Reach selected 2D fidelity from persisted case evaluation after P12/P16; no 0D downgrade.                                        |
| P18 | pending  | Workbench edits actual solver configuration and displays missing physics, provenance and maturity after P17.                     |
| P19 | pending  | Field viewer with mesh coordinates, units and artifact auth after P14/P17; conceptual SVG is insufficient.                       |
| P20 | pending  | Phase 2 sign-off only after P13/P17–P19 and all required gates, not after an isolated kernel.                                    |
| P21 | pending  | Dimension-independent coupled 3D formulation/runtime after complete P20; scalar grid fixtures are not cell 3D.                   |
| P22 | pending  | Tagged, parameterized cell-scale 3D geometry, quality and boundary/volume audits after P21.                                      |
| P23 | pending  | Verified 3D flow and porous/free-flow coupling on P22 geometry.                                                                  |
| P24 | pending  | Coupled 3D species, charge, reaction and circuit with conservation after P21–P23.                                                |
| P25 | pending  | Explicit cell/pore/nano scale separation and transfer contracts after P21.                                                       |
| P26 | pending  | Independent micro-3D porous-electrode case and homogenization transfer after P25.                                                |
| P27 | pending  | Stack-network macro model with cell-level transfer map, separate from 3D cell mesh.                                              |
| P28 | pending  | PETSc/MPI/resource scaling, checkpoints and artifact budgets for coupled 3D after P22/P24.                                       |
| P29 | pending  | Authenticated scientific 3D field viewer with units and level-of-detail after P22/P24/P28.                                       |
| P30 | pending  | Spatial observation coordinates, conditions, units and dataset roles for comparison after P14/P24.                               |
| P31 | pending  | Solver-oriented evidence acquisition with parameter and boundary-condition coverage after P03.                                   |
| P32 | pending  | Graded mathematical, component, cell and independent benchmarks after P13/P31.                                                   |
| P33 | pending  | Provenance-preserving field-to-decision reductions after P14/P17; no unsupported risk score.                                     |
| P34 | pending  | Reports distinguish spatial model, residuals, uncertainty and evidence maturity after P33.                                       |
| P35 | pending  | Coupled spatial runtime, failure and artifact tests after P13/P17; current mesh/job tests are prerequisites.                     |
| P36 | pending  | Tiered CI for verified solver and larger physics benchmarks after P35.                                                           |
| P37 | complete | Repository formatting gate is enforced; retain it as new files arrive.                                                           |
| P38 | pending  | Per-model promotion evidence for numerical, integrated and independent maturity after P13/P20/P32.                               |
| P39 | pending  | Complete the dependency-ordered A–O PR program; current PRs cover only foundation fragments.                                     |
| P40 | pending  | Sustain no shortcut rule across all future solvers, artifacts, scientific claims and multiscale transfers.                       |

Next executable dependency chain: finish P02/P03/P04/P05 contract/toolchain prerequisites; develop verified conservative transport/charge on a tagged mesh (P06), then 2D hydraulics and cell modules (P07–P11). Product admission waits for a reproducible, fully checked P12 solver. P20/P21 are later phase gates, not blockers to isolated numerical verification fixtures.
