# Donnan interface continuation — 2026-10-08

## Recovered facts and inventory

- Remote `main` and `dev` were fetched and confirmed at `7faeaec43dc196186e2b2a2e4fd75baf0125337f` (merged PR #140). The inherited local reaction commits had the same tree as that main; the development branch was moved onto the confirmed main without changing or discarding its dirty Donnan implementation.
- Read the supplied conversation log and retrieved the available post-PR140 personal-context summaries. The retrieval did not recover the exact interrupted “building donnan test fixture” action or complete historical conversations.
- Read current README, AGENTS, full repository master brief, project state, roadmap, dependency graph, capability matrix, acceptance gates, maturity/risk registries, governing equations, verification matrix and domain equation authority; inspected changed contracts, solver, worker, reports and their native/API tests.
- Retrieved the complete 3,632-line Library master brief (3), the complete 571-line documentary inventory and the complete 2,768-line historical 3D-refinement record. The historical inventory itself records missing complete deleted conversations and does not claim scientific rereading of the older PDF/ODS corpus.
- Library title search identified 21 METREV items, including older master briefs, repository ZIPs and UI exports. Those older snapshots/exports were inventoried but not all materialized or reread in this continuation. They are not used as evidence that a measurement or implementation is absent. Current remote main and the preserved development tree are the operational reference.
- Consulted the original [Moshtarikhah et al. paper](https://doi.org/10.1007/s10800-016-1017-2), model boundary equations 11–14 and Appendix 3. This supplies formulation context, not data compatible with an MFC by default. Its alkaline Nafion conditions and additional transport physics must not be silently transferred to this supporting-electrolyte fixture.

## Implemented behavior

Protocol v9 admits source-backed local ideal Donnan interfaces adjacent to an ion-exchange membrane. The monotone root, analytic implicit derivatives and conservative species face flux are coupled to the native sparse solver. Both membrane orientations are explicit. The separate supporting-electrolyte Ohmic field uses the continuous bulk potential; equilibrium Donnan jumps are not resistive voltage sources.

`tests/fixtures/structured-cell-donnan.json` is the reusable synthetic numerical input. Its scientific values retain `test_fixture` provenance. No fixture is inserted as a measured case or accepted literature observation.

The result persists per-interface charge closure and per-species valence, input partition coefficient, mean solution concentration, minimum/mean/maximum predicted local equilibrium membrane concentration, mean effective partition factor and integrated positive-x flux. These scalar outputs reach authenticated JSON/Markdown reports. Interface equilibrium predictions are distinguished from measured concentrations, solved membrane-volume states and transport selectivity.

The worker verifies species/input/flux binding and dimensionless-to-volt conversion using the declared temperature. Input-aware reload rejects changed source coefficients, inconsistent voltage conversion and equilibrium concentrations inconsistent with charge closure. Stored evidence without the new optional species summaries remains readable; new process responses require the summaries. A conservative residual bound uses the maximum absolute charge residual and minimum face normalization, preventing a large adjacent concentration scale from hiding a smaller-scale failure.

## Verification and numerical evidence

- Analytic monovalent root and predicted cation/anion concentrations; opposite signed fixed charge; neutral-species limit; zero-flux/current Donnan equilibrium.
- Independent Brent root comparison for a multivalent mixture, separate from experimental independent validation.
- Both 2D/3D orientations, shared-face species conservation, analytic Jacobian directional derivatives, source/unit/input rejection and membrane convection rejection.
- Native worker/API result persistence and reports; tampered coefficient/voltage/negative-summary/duplicate-species rejection; older evidence read compatibility.
- Full JS run: 691 passed, 5 expected skips, 113 files. The initial concurrent run had a 5-second storage-test timeout; the complete rerun with two workers passed. A focused initial artifact-busy failure also passed on rerun.
- Python fast suite: 66 tests, 3 expected optional Gmsh skips. Lint, 20 builds including the production web build, formatting, governance and focused native checks passed. Workflow semantic lint is locally blocked because Docker is unavailable; the repository CI supplies that official container.
- The initial full run passed 58 existing records and failed four newly added current-refinement records: the small two-sided reservoir fixture conserved all native balances but its successive current differences did not decrease at 2/4/6 cells per layer. This failure is not a conservation failure or evidence of predictive accuracy.
- The charged refinement variant now uses the existing one-sided heterogeneous numerical geometry, with y/z feeding in 3D and every axis refined at factors 1/2/3. All four focused MFC/MEC 2D/3D series passed the original decreasing-difference criterion and `0.005` medium/fine relative-current tolerance. No tolerance was widened. The small two-sided fixture remains the analytic/worker test input.
- Numerical full verification after the fixture correction: 62 records passed across 14 scopes, no failures. Four charged current-refinement series (68 assertions) are persisted in `tests/fixtures/structured-cell-donnan-verification.json`, with fixture/runtime hashes, native inputs, per-level mesh/input hashes and all measured numerical species/current outputs.

## Inferences and remaining gaps

Numerical agreement demonstrates the declared local ideal interface formulation under the tested synthetic conditions. It does not demonstrate predictive accuracy for a real membrane or wastewater cell. Per-species equilibrium partition factors are not permeability or flux-derived selectivity.

The 1D coupled cell has not gained Donnan by this spatial implementation. Membrane-volume electroneutral Nernst–Planck/current closure, nonideal activities, water transport, proton/product reaction networks, matched experimental comparison and independent held-out validation remain open. General 2D/3D catalog admission and production eligibility remain closed. Historical remote PostgreSQL contents and complete deleted conversation histories were not accessed.

Next executable dependency: implement a separately declared membrane-volume charge/ionic-current formulation with source-backed species and boundary data, analytical charge/current limits and conservative interface coupling; then reproduce a compatible study case before promoting scientific eligibility.

## Integration checkpoint

[PR #141](https://github.com/igorbolognani/METREV/pull/141) is open against main; no merge was performed. The published implementation commit is `78a9e6e133f138189a665a39c7cb49cea6993f4c`; its tree `566765f67a1f6b90cbd8d9e6dcd38ad8de57ef10` matches the tested local implementation tree exactly. A following governance-only commit records the PR identity. Main/dev remain at the verified PR140 merge. CI status must be read from the latest PR head rather than inferred from local tests.
