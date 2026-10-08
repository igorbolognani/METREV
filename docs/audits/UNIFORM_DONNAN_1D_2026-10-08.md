# Uniform fixed-charge binary membrane — 2026-10-08

## Confirmed base and recovery

PR #141 is merged into `main` at `696f32d7353ab6cd0ab123cd5f8b55c530e30c8c`. Its remote head is `6cd20df86664473cf2106c8c02584f2c54f91d85`; CI run 37700305326 and CodeQL run 37700305255 completed successfully. No open PR was returned before this increment. The preserved local branch was clean and had the same file tree as remote main; the old writer's files had not changed since approximately 00:49 Madrid time. Local main was fast-forwarded and remote/local dev aligned to the confirmed merge before starting `feat/1d-fixed-charge-membrane`.

Read the supplied conversation, current merged Donnan recovery audit, AGENTS and path instructions, project state, roadmap, capability/dependency/gate authorities, 1D membrane/cell/composition/enrichment and persisted evaluation/report consumers. The earlier recovery audit inventories older project snapshots and records historical conversations and material not recovered in full; those older corpus files were not reread in this bounded continuation. No missing historical measurement is inferred from this inspection. The original Moshtarikhah paper, DOI 10.1007/s10800-016-1017-2, supplies formulation context only; its alkaline Nafion dataset is not transferred into an MFC case.

## Implemented and integrated

- P03/P06/P09: explicit optional `uniform-binary-ideal-donnan-v1` boundary contract, signed fixed charge per pore-liquid volume, exactly two sourced partition coefficients, identical electroneutral solution reservoirs and per-ion diffusivity. Omission preserves legacy membrane-side concentration semantics and equal-diffusivity restrictions.
- The existing single-current 1D engine uses the exact family `EQ-MEM-1D-002`: uniform concentration satisfies fixed-charge electroneutrality; common segmentwise porosity/tortuosity gives a harmonic ionic path; unequal free ion diffusivities determine current fractions. The same exponential-fitting transport kernel verifies flux, charge and current. MFC/MEC circuit loss includes this resolved resistance once. Equal interface Donnan jumps cancel across the solution-to-solution voltage boundary.
- The actual configured engine binding selects this equation when `membrane.donnan` is present. Unsupported reservoir chemistry, missing sources/K and unit errors fail without fallback.
- Saved evaluation inputs retain complete source metadata. Modeled scalar outputs include signed ion flux/current, current fractions, equilibrium concentration, membrane resistance/drop, both Donnan jumps and volume charge residual. Three added series carry both ion concentrations and membrane-side potential. The existing API/repository and report/workbench consume these results. The printable report now identifies 1D correctly instead of calling every model a lumped 0D baseline.
- Governance maps the new bounded 1D coverage and checks its contract/equation/runtime/test references. Full P03/P06/P09/P34 states and scientific maturity are not promoted.

## Executed numerical example

This is `tests/fixtures/coupled-cell-1d.ts#uniformDonnanFixture`, explicitly `test_fixture`, not an experimental or literature dataset. The shared Node ESM engine returned:

| Quantity                                 |                    Value | Unit       |
| ---------------------------------------- | -----------------------: | ---------- |
| Fixed pore-liquid charge                 |                      -50 | mol/m³     |
| Solution concentration, each ion         |                      100 | mol/m³     |
| Modeled membrane cation concentration    |       126.11874208078342 | mol/m³     |
| Modeled membrane anion concentration     |        76.11874208078343 | mol/m³     |
| Each membrane-minus-solution Donnan jump |   -0.0012771035356262646 | V          |
| Resolved membrane resistance             |      0.07967932950475609 | ohm        |
| Cell current                             |  0.000018888627994809918 | A          |
| Membrane transport voltage drop          | 0.0000015050332138912198 | V          |
| Maximum nodal volume charge residual     |    9.947598300641403e-14 | mol/m³     |
| Cation current fraction                  |      0.45308396288925973 | 1          |
| Anion current fraction                   |       0.5469160371107403 | 1          |
| Cation signed flux                       |     8.869881294220361e-9 | mol/(m² s) |
| Anion signed flux                        |   -1.0706802103601937e-8 | mol/(m² s) |

The base fixture is load-dominated, so the cell-current change is tiny; it must not be advertised as a demonstrated performance improvement. A separate declared synthetic membrane-dominated test checks that the changed ionic resistance changes the circuit current, rather than merely appearing in diagnostics.

## Verification and gates

- Focused analytic comparisons use quadratic equilibrium concentrations independently of the runtime asinh/log solution; negative/zero/positive fixed charge, unequal diffusivity, zero/reversed current, constant flux and volume charge at 4/8/16 segments, and the X=0/K=1 legacy cell limit pass.
- MFC/MEC configured current/electron/circuit closure, normalized case input, memory repository reload, modeled-output/report provenance and workbench/print rendering pass. The final membrane-dominated feedback regression passes in the 9-test focused suite.
- Broad JavaScript run before that additional regression: 701 passed, 5 expected skips, 114 files. Focused earlier physics/contract/catalog suite: 30 passed; actual React report/workbench rendering: 6 passed.
- Lint and all 20 builds passed; production Next build compiled and generated routes. TypeScript checks for models/contracts/API passed. Python fast suite: 66 tests, 3 expected optional Gmsh skips; governance and repository formatting passed. Node ESM spatial check passed; the new 1D engine was also executed through the Node ESM loader.
- Initial failures: two test assertions included the pipeline's separate evidence benchmark in a modeled-only predicate; the assertion was corrected to inspect the report's modeled namespace. Catalog drift was detected before updating the scientific catalog authority. Neither numerical tolerance nor scientific gate was loosened.
- Local optional numerical inspection first hit the tsx CLI's forbidden Unix IPC socket and TS fixture module-mode mismatch. It succeeded by compiling only the synthetic fixture to scratch ESM and invoking the existing Node ESM loader, without changing permissions or the solver.
- Native PostgreSQL roundtrip coverage was expanded for the new input/results; it requires the repository's CI database target. No application database was migrated, seeded or written locally. Real-browser/native toolchain and workflow-container checks remain CI gates for the published head.

## Remaining dependencies

The exact uniform binary family is implemented and numerically verified within its declared scope. It does not solve asymmetric reservoirs, concentration polarization, variable fixed charge/partition, multivalent/multicomponent ions, ion-specific spatial pore ratios, water/convection or transient chemistry. It does not replace the separate 2D/3D supporting-electrolyte Ohmic formulation. Imposed anode material potential, molecular product/proton stoichiometry, matched experimental comparison and independent validation remain open. All outputs remain informational development results.

Next executable dependency: generalize membrane concentration/current closure for explicitly asymmetric source-backed reservoirs with conservative species boundaries, then reproduce a compatible source case. Continue molecular reaction/proton accounting separately; neither synthetic verification nor UI integration establishes predictive eligibility.
