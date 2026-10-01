# Restricted cell verification and product batch — 2026-10-01

This batch starts at main `72acd35bc027e373e37e163c316ef62b60af1efd`, after PR #113 merged at 20:45 UTC. That PR's CI run `36861845705` and CodeQL run `36861845678` succeeded. Earlier dated audits remain historical checkpoints. The implementation is published as draft PR #114 on `codex/spatial-verification-product-batch`, without merge.

## Delivered scope

1. Synthetic, nonuniform restricted 2D refinement on 18, 72 and 288 cells, heterogeneous diffusivity/conductivity and one-sided transverse reservoir. Tests check finite positive fields, local/global species, liquid/solid charge, circuit closure and decreasing observable differences.
2. Nonlinear tolerance sensitivity, repeated-solve reproducibility and explicit termination matrix. Reusing a `Cell` resets history; returned histories are independent. Budget exhaustion, linear failure, nonfinite Newton step, positivity blockage and line-search failure retain finite unaccepted states and diagnostics without clipping.
3. Native Python worker plus authenticated API/report regression for converged 2D/3D and failed 2D. Four new PostgreSQL gates cover MFC 2D/3D, MEC, failed-state reload, idempotence, owner isolation, external artifacts and retry/cancel lineage.
4. A browser-safe restricted run view verifies identity and numerical gates. Mesh geometry is checked against the admitted input with relative floating-point tolerance; field topology, region coverage, units and sample counts are checked. Mesh/field state is bound to run ID and digest, preventing stale data during run switching. SVG cells support click/keyboard probes and real 3D slices.
5. Deterministic `spatial-cell-development-report-v1` JSON/Markdown exports through owner-scoped API and workbench. Complete input and optional locator, conditions and uncertainty remain sourced; large numerical arrays stay external. Reports expose failed diagnostic roles, actual termination, residuals, field summaries, circuit energy, hashes and limits. Mesh refinement is explicitly unassessed for each individual run; steady runs have no time-refinement claim.
6. Dedicated Chromium gate starts actual Next.js, authenticated Fastify, PostgreSQL and the native worker. Existing general E2E excludes this explicitly configured development test. PostgreSQL CI installs the required Python numerical dependencies; browser CI uses its own disposable database.

## Numerical evidence and limits

| Grid   | Cells |    Anodic current (A) | Volume-weighted reduced concentration (mol/m3) |
| ------ | ----: | --------------------: | ---------------------------------------------: |
| Coarse |    18 | 5.254795837729239e-10 |                              0.999544584536886 |
| Medium |    72 | 5.255153395640583e-10 |                             0.9995622809288387 |
| Fine   |   288 | 5.255246554540062e-10 |                             0.9995668598182632 |

The versioned record `tests/fixtures/structured-cell-refinement-verification.json` retains normalized input/geometry hashes, mesh/field artifact hashes, runtime/fixture source hashes, library versions, tolerances and scalar observables for each level. These are synthetic supporting-electrolyte redox values, not wastewater/microbial measurements. Successive differences decrease by more than 60%; medium-to-fine current change is below `2e-5` relative and mean concentration change below `1e-5 mol/m3`. All admitted balance gates pass. A separate 1,152-cell probe exhausted the 400-evaluation budget; it is not convergence evidence. The checked-in refinement test declares 1,000 evaluations. No exact coupled solution or empirical error is inferred from successive differences.

## Validation status

PASS local numerical verification: four new Python tests and existing seven cell tests. PASS native worker/API/report/view/topology regressions for three real Python runs. The available fast matrix passed lint, 525 JavaScript tests (five native DOLFINx skips), 17 contract checks, 41 spatial Python tests (three Gmsh skips), governance and 20-package build. Final incremental typechecks/build, native tests, refinement record reproduction and repository/workflow formatting also passed.

BLOCKED locally: no reachable configured PostgreSQL server; the new PostgreSQL suite fails at setup, with four cases unexecuted. Package installation cannot switch OS users; Playwright's Chromium download returns a truncated archive. Browser listing succeeds but does not establish browser acceptance. Docker/actionlint and native DOLFINx/Gmsh gates remain CI responsibilities. No migrations, seeds or ingestion were run against a user database.

PASS remote runtime head `6f9217df08484f3aaad7909e6c23f2c87283fca4`: CI run `36930062304` completed all seven jobs successfully, and CodeQL run `36930062265` passed. The PostgreSQL job passed 20 tests across four suites, including all four new native cell scenarios. Chromium passed both real-stack tests: 2D/3D creation, reload, numerical fields/probes/slices, report downloads, stale field removal during delayed geometry, and failed diagnostic retention. The existing local-view acceptance, advanced matrix, native Gmsh and pinned DOLFINx toolchain also passed.

Early CI attempts exposed missing Python dependencies in the local acceptance job, an unbound test API port and the JSON textarea's missing accessible name. These were corrected. The test runtime now uses graceful process-group shutdown. The final documentation update records evidence for the verified runtime head; executable files are unchanged by that update. Local environment limitations above remain facts and are not inferred to be CI failures.

## Next dependency and unchanged maturity

Restricted development progress does not activate general 2D/3D catalog fidelities. P2/P3 remain incomplete. Case normalization/stack-to-domain equation composition, continuation and larger-mesh robustness, coupled hydraulics, selective charged membranes, growth/gas/heat, a durable production provider/deployment and matched empirical/independent evidence remain pending. Reports and development artifacts cannot become decision evidence. Human source review is not a prerequisite for implementing or testing those prerequisites.

The timeline distinguishes the original interrupted/unrecovered patch, the replacement integrated in PR #113, and this later verification/integration batch. Deleted chats and internal interruption telemetry remain unavailable; code/checks are the continuation authority.
