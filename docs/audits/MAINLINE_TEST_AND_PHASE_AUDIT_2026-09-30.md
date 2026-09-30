# Mainline, test phases and closure audit — 2026-09-30

## Result and baseline

Repository: `igorbolognani/METREV`. Initial live main was
`21e1116eb31040a22e2272a1c2e99330842ad4f7` (PR #107).
PR #108 was merged into batch 1 and #109 into batch 2, leaving their changes out
of main. [PR #110](https://github.com/igorbolognani/METREV/pull/110) consolidates
those already-approved changes into main; its complete CI and CodeQL passed before
merge. Consolidated main: `83d03a6457d3b84ef512ac81b56505c94667fbe3`.
Its tree is `a0126dd02a6caf8d9cf626638e1fa2930f69c988`, exactly the verified
batch-3 tree. Later implementation PRs target main directly.

The full 40-point master task, current governance, executable code and CI evidence
are the authority. The historical baseline SHA in PROJECT_STATE is intentionally
immutable. This audit does not claim to have reread every repository file or to
have access to all earlier conversations.

## Where METREV stands

| Layer                     | Implemented                                                                                                                                         | Remaining boundary                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Product/runtime           | Lumped isothermal 0D case execution; restricted steady planar 1D cell through sourced cell_1d input; persisted evaluations                          | 1D is informational development; no independently validated prediction claim                                                                 |
| Common spatial foundation | Versioned planar input/result protocols, material provenance/units, physics descriptors, tagged Gmsh meshes and refinements                         | Descriptors are not a complete coupled equation assembler; 1D/3D/full product intake still incomplete                                        |
| Native 2D development     | Restricted Stokes and homogeneous Darcy; same-mesh neutral scalar transport; PETSc diagnostics; hash-bound pressure/velocity/concentration datasets | Single-region, steady, constant-coefficient subset; no reactive/ionic full-cell solver or bulk/porous coupled interfaces                     |
| Async/persistence/API     | Durable queue/leases, cancellation/retry/progress, shutdown, strict config, bounded Docker sidecar; result-v2 metadata and owner-scoped field reads | Local content-addressed field provider is development-only; production worker/store/database deployment and product admission remain pending |
| Spatial product UI/report | Existing modeling and conceptual diagrams                                                                                                           | Numerical viewer, executable spatial case/workbench/report path remain absent                                                                |
| 3D                        | Isolated scalar orthogonal-grid checks and a native numerical fixture                                                                               | No complete 3D cell geometry, hydraulic/charge/reaction runtime or case path                                                                 |
| Evidence/maturity         | Source/provenance policy and provisional/development comparisons                                                                                    | No matched independent validation/holdout demonstrating predictive accuracy                                                                  |

Passing tests closes the tested sub-behavior, not every requirement of a broad plan
point. Roadmap currently records **10 partial, 29 pending and 1 complete** point
(P37 formatting). Those counts are acceptance labels, not a percentage of code
implemented or engineering work completed. New tests never automatically promote
model catalog availability or experimental maturity.

## Test phases checked

The audited consolidated tree passed all six CI jobs in
[run 36739072026](https://github.com/igorbolognani/METREV/actions/runs/36739072026),
plus [CodeQL 36739072052](https://github.com/igorbolognani/METREV/actions/runs/36739072052).
Initial main also had successful CI/CodeQL runs 36737013236/36737013327.

| Phase                   | Checks and evidence                                                                                                                                                                                     | What a pass establishes                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Fast JS/contracts/build | validate:fast: 490 JS tests passed, 3 native tests skipped in this tier; 17 external contract checks; Python 29 cases run with 3 native skips; all 20 package lint/build tasks; Node ESM and governance | Contract/runtime regression and static/build compatibility                                                                             |
| Native geometry         | validate-spatial-mesh: real pinned Gmsh, tags/topology, geometry/refinement/hashes                                                                                                                      | The recipe yields the checked meshes; this alone is not PDE convergence                                                                |
| Native solver           | validate-spatial-toolchain: pinned DOLFINx/PETSc/Gmsh, analytic/manufactured scalar/Poisson/Stokes/Darcy fixtures, same-mesh transport, three native worker/API variants                                | Restricted development solves, diagnostics/artifacts and worker/field API roundtrips; native skips in the fast tier are exercised here |
| PostgreSQL              | validate-postgres: migrations, persistence, claims/retry/cancellation, reloaded identity                                                                                                                | Database correctness against the CI PostgreSQL service; not operational production deployment                                          |
| Advanced/offline        | validate-advanced: deterministic research/worker/API regressions and bootstrap dry-run                                                                                                                  | Offline planning and integration behavior; not real literature ingestion or empirical validation                                       |
| Local product/browser   | validate-local: Docker application smoke, acceptance, preview build and Chromium                                                                                                                        | Existing product/browser paths work; this does not test a nonexistent full spatial viewer                                              |
| Security/automation     | CodeQL, actionlint, formatting, Docker Compose configuration                                                                                                                                            | Static/security/configuration checks; no predictive physics validation                                                                 |

Local Docker/PostgreSQL were unavailable in this execution workspace; their evidence
comes from actual CI jobs, not claimed local runs. The maintenance PR adds focused
Git-server regression tests for backup/deletion atomicity, concurrent head changes,
tag collisions, protected/open-PR branches and offline planning. Its own PR checks
and post-main archive ledger are the live execution record.

## What closes each plan point

Every row also requires its complete referenced master-task section and the gates
in ROADMAP/ACCEPTANCE_GATES; the description is a concise closure frontier.

| Point | Status   | Required next closure work                                                                                                                                   |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P01   | partial  | Connect the common composition descriptors to consistent runtime equation assembly and fidelity resolution; retain shared contracts and parameter authority. |
| P02   | partial  | Add full 1D/3D geometry variants and dimensional/field/boundary contracts, then connect normalized product intake and mesh authorization.                    |
| P03   | partial  | Complete model-specific ionic/reaction stoichiometry, tensor/variable materials, interface, buffer, biological and thermal authority.                        |
| P04   | partial  | Complete the coupled solver adapter, product admission, deployed numerical service and production artifact/auth integration.                                 |
| P05   | partial  | Verify broader cell geometries, interface mapping/quality and representative coupled PDE convergence, then product mesh intake.                              |
| P06   | partial  | Implement source-backed reaction/migration, liquid/solid charge, conservative region interfaces, circuit closure and coupled nonlinear convergence.          |
| P07   | partial  | Add declared bulk/porous interface laws and applicable regimes, heterogeneous hydraulics and reactive/ionic transport; integrate the real cell path.         |
| P08   | pending  | Resolve 2D anode/biofilm reaction, charge, substrate and declared growth/decay after P06/P07 prerequisites.                                                  |
| P09   | pending  | Resolve spatial membrane ion/charge/interface transport, partition and fixed-charge laws where the selected fidelity claims them.                            |
| P10   | pending  | Resolve cathode transport, local kinetic/charge transfer and MFC ORR/MEC HER with explicit sourced inputs.                                                   |
| P11   | pending  | Verify coupled nonlinear strategy, tolerances, preconditioning, failure and positivity; add transient strategy where claimed.                                |
| P12   | pending  | Deliver the declared complete 2D MFC/MEC cell from a normalized real case with all requested modules and outputs.                                            |
| P13   | pending  | Complete cell-level mass/charge/energy limiting cases, lower-dimensional reduction, mesh/time/tolerance studies.                                             |
| P14   | partial  | Finish product field-provider/viewer integration, broader derived/vector output authority and upstream contract/runtime gates.                               |
| P15   | partial  | Provide durable production artifacts and operational persistence/deployment evidence; development local storage is insufficient.                             |
| P16   | partial  | Deploy worker/database/store with operational resource and recovery evidence; register an explicitly admitted product solver.                                |
| P17   | pending  | Dispatch requested spatial fidelity from case evaluation and persist its evaluation/job relationship without fallback.                                       |
| P18   | pending  | Bind real component/fidelity/BC/refinement workbench selections to executable input with provenance and missing-data feedback.                               |
| P19   | pending  | Deliver numerical 2D field/vector visualization, probes, comparison and transient controls where applicable.                                                 |
| P20   | pending  | Close every declared 2D path gate: physics, conservation, convergence, persistence, async runtime, UI, reports and provenance.                               |
| P21   | pending  | Generalize the proven common modules to 3D after the 2D completion gate.                                                                                     |
| P22   | pending  | Create tagged real 3D cell geometry and mesh quality/refinement evidence.                                                                                    |
| P23   | pending  | Implement and verify physically justified 3D hydraulics on that geometry.                                                                                    |
| P24   | pending  | Implement coupled 3D species, charge, reactions and interfaces; isolated scalar fixtures do not fulfill this.                                                |
| P25   | pending  | Declare transfer maps and scale boundaries; keep pores/nano geometry out of the default full-cell mesh.                                                      |
| P26   | pending  | Deliver the separate porous-electrode micro-3D capability and explicit upscaling maps.                                                                       |
| P27   | pending  | Deliver a distinct stack-network model with declared cell/network transfers.                                                                                 |
| P28   | pending  | Verify 3D sparse/block/preconditioned memory, compute and artifact performance on representative cases.                                                      |
| P29   | pending  | Implement the scientific 3D viewer after executable geometry/physics and performance gates.                                                                  |
| P30   | pending  | Compare spatial observations with matching coordinates, units, conditions and independent dataset roles.                                                     |
| P31   | pending  | Acquire source-traced solver-relevant inputs and observations; candidates remain separate from accepted evidence.                                            |
| P32   | pending  | Version graded analytic/manufactured/development/experimental benchmarks without conflating their roles.                                                     |
| P33   | pending  | Reduce spatial fields into decision metrics with declared integration, provenance and applicability.                                                         |
| P34   | pending  | Carry spatial status, diagnostics, uncertainty and limitations into persisted reports/narrative.                                                             |
| P35   | pending  | Complete spatial contract, conservation, failure, reload and product-path tests for the full declared cell.                                                  |
| P36   | pending  | Maintain fast/native/nightly/expensive CI tiers covering the completed spatial test strategy.                                                                |
| P37   | complete | Already complete: formatting gates pass while preserving hash-pinned evidence bytes.                                                                         |
| P38   | pending  | Record and enforce per-model acceptance evidence before every maturity promotion.                                                                            |
| P39   | pending  | Continue the dependency order with coherent batches and explicit remaining acceptance gaps.                                                                  |
| P40   | pending  | Enforce common architecture, dimensional fidelity, conserved interfaces and explicit scientific limitations.                                                 |

## Why 71 branches and how they are reduced

The initial remote inventory contained 71 branches, with no protected branches and
no open PRs. Historical feature/fix/test branches had not been removed after their
PRs closed. Stacked PR bases also created a second problem: a merged PR could leave
its code only on a temporary branch instead of main. Branch names are references
to shared Git objects; 71 branches does not mean 71 independent product copies or
71 services running. The practical cost is confusing integration, review and
cleanup, rather than multiplying runtime cost.

After consolidation, the 70 historical non-main heads classify as:

- 48 heads already included by commit ancestry;
- 12 heads without unique non-merge patches relative to the consolidated stack;
- 10 heads with divergent historical patches requiring preservation/review.

The fixed inventory is in `governance/BRANCH_ARCHIVE_PLAN.json`. **Every removed head
is preserved at its exact SHA in an archive tag**, including the ten divergent
histories. Archiving them is not a claim that their code was integrated. No obsolete
branch tree is blindly merged into the current scientific code.

The trusted main-CI completion workflow executes only the audited snapshots and
the just-merged main-targeted PR head. It preserves main, protected refs, open-PR
heads/bases and changed heads. Archive creation and deletion are one atomic Git
push with explicit SHA leases. A concurrent change or conflicting tag rejects the
transaction; neither ref is partially changed. Failures retain their branch and
are recorded in `branch-archive-transactions`, not retried with unrestricted force.
Subsequent newly merged PR heads receive the same archive-before-delete lifecycle.

The expected steady state is main plus branches with active PRs/work. Live counts
and transaction results, rather than this expectation, confirm actual cleanup.

Recovery example:

```bash
git fetch origin 'refs/tags/archive/2026-09-30/codex/spatial-runtime-batch-3:refs/tags/archive/2026-09-30/codex/spatial-runtime-batch-3'
git switch -c restore/spatial-runtime-batch-3 archive/2026-09-30/codex/spatial-runtime-batch-3
```

Ten preserved divergent histories:

- `codex/p07-stokes-input-boundary` at `b9b3672b20627ea67e53253b377318615820eaed`.
- `codex/p14-vector-output-authority` at `a3b7af849766087b32641a9f7ff7bad230280ceb`.
- `feat/spatial-anisotropic-diffusion` at `9a5dd8d7fe11ae336eafa89e09edb5de55a257e8`.
- `feat/spatial-conservative-diffusion-baseline` at `511b7f348b5a7f1dfc0588302774ed0cf4dac4f4`.
- `feat/spatial-heterogeneous-interface-diffusion` at `43a9b53e151fa03fd194632e7e76f8d5a2d69f78`.
- `feat/spatial-linear-reaction` at `641e939eccb3671b912ecfc44dbce32807b9d948`.
- `feat/spatial-prescribed-flux-boundaries` at `0276291ed351de30784c13ae6dae5b1faaafcd92`.
- `feat/spatial-transient-diffusion-verification` at `85f70b2255de6f3f108bd4a92f4732e23fa45f04`.
- `feat/spatial-upwind-convection` at `7ecabb915f63742c6a48440cb8fb14aba28ff243`.
- `fix/spatial-stack-promotion` at `b556c7f1302db3845edc8519b99d3f973fcdf4e3`.

## Next implementation order

1. Complete the next restricted P06 mathematical-core slice: source-backed native
   scalar source/linear loss with measured source/reaction/port balance and analytic
   limiting/refinement verification. This is a prerequisite building block, not a
   biological/electrochemical reaction network or full-cell promotion.
2. Implement coupled species/charge/reaction/interface authority and conservation
   needed by P08/P09/P10; close P07 bulk/porous coupling where the selected fidelity
   requires it. Do not bypass these by registering the current isolated benchmarks
   as product cell solvers.
3. Establish P11 coupling/solver strategy and P12 complete declared 2D cell.
4. Finish P14–P19 durable provider, deployment, case/workbench/viewer/report path;
   verify cell-level gates before P20 closure and P21–P30 3D work.
5. Continue solver-oriented evidence/graded benchmarks and independent maturity
   gates. Source review remains a later evidence/decision gate, not a reason to
   block equation implementation or numerical verification.

The current maintenance changes do not alter scientific equations, scientific
parameter values, product solver admission or experimental maturity.
