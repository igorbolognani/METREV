# Parallel master-plan batch — 2026-10-02

## Reconciled baseline and time boundaries

The live integration baseline for this batch is `main` at
`664ffb2178d8373569611bb0f54fa60da3b45736`, the merge commit of PR #115. PR #115
was based on `21a3974cd414f740633f8e7e2c716dcf7d722087`, reached head
`27f82c3f5aba277ceebaaf7607d7d80c20f42657`, and merged on 2026-10-02 at
10:35:34 UTC. Its seven CI jobs passed in run 36994575598; CodeQL passed in run 36994575602. Those merged commits are integrated mainline, not pending work.

This snapshot keeps four periods separate:

| Period                                     | Meaning                                                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| April–May 2026                             | Legacy workspace, architecture decisions, and evidence corpus; retained as historical context.                                                                    |
| 2026-09-23                                 | MFC/MEC wastewater and biosensor scientific focus; its release-specific spatial non-goal is historical for later work.                                            |
| 2026-09-27 onward                          | Current common stack-configured architecture, 40-point execution authority, and scientific maturity gates.                                                        |
| 2026-10-01 through 10:35 UTC on 2026-10-02 | PRs #113–#115 integrated into `main`; each PR's actual merged revision and gates remain in the timeline.                                                          |
| After PR #115 merge on 2026-10-02          | Independent branches and PRs #116 onward are development proposals against the same `main` SHA. They are not integrated and do not inherit one another's changes. |

Deleted chat transcripts are unavailable. This audit uses the repository, its
recorded decisions, Git history, PR metadata, and checks on the exact SHAs listed
in `governance/DEVELOPMENT_TIMELINE.yaml`; it does not reconstruct missing
conversation content.

## Master-plan coverage at the baseline

The checked-in 40-point roadmap has 1 complete item, 14 partial items, and 25
pending items. P37 is the sole complete item. A feature slice or passing test
does not complete an entire point whose remaining dependencies or release gates
are open. Phase 2 and Phase 3 remain nonfunctional and no scientific maturity,
independent validation, or decision eligibility is promoted by this batch.

The parallel proposals deliberately span distinct work types:

| PR   | Plan mapping          | Development result                                                                                                                                                      | Gate still required                                                                                                                                                                                           |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #116 | P19 sub-requirement   | Compare summaries from completed spatial development runs only when model, dimension, system, geometry, field identity, domains, units, and integration match.          | P19 remains pending for numerical field/vector visualization, probes, slices and applicable transient controls; later P14/P17 product dependencies remain. No remeshing or measurement validation.            |
| #117 | P31 coverage slice    | Report normalized coverage of accepted evidence for MFC/MEC, electrode, membrane, biofilm, and hydraulic targets.                                                       | P31 remains pending for the complete solver-oriented acquisition workflow, source review, and matched benchmark evidence; coverage is not solver validation.                                                  |
| #118 | P33/P34 support slice | Report provenance-bound modeled-field minima/maxima with input, geometry-request, mesh, and artifact identity. Process protocol v3 is separate from solver identity v1. | P33 remains pending for decision reduction, thresholds, and product eligibility; preserve v2 queued-run routing and complete P14/P17 report integration and scientific gates. No risk/hotspot classification. |
| #119 | P03                   | Audit 36 spatial parameter-authority concepts: current metadata completeness, unit/domain/applicability coverage, and explicit pending gaps.                            | Source-backed values, independently dimension-checked SI semantics, and model-specific physical applicability.                                                                                                |
| #120 | P01                   | Fail closed when selected modules lack dimension/equation mappings or executable dependencies.                                                                          | Implemented equations and numerical verification remain distinct dependencies; composition metadata is not equation assembly.                                                                                 |
| #121 | P32                   | Classify evidence into validation strata A–E and block lower-tier evidence from supporting higher-tier claims.                                                          | Independent source review and held-out, condition-matched data remain required for validation claims; component rows remain unvalidated candidates and 26 aggregates remain context-only.                     |

All six proposals start from the same `main` baseline and remain separately
reviewable. Their current head SHAs, draft/review state, and last observed CI /
CodeQL states are recorded in the timeline and project snapshot. Any updated
head requires refreshed evidence before its status can advance.

## Verification and scientific boundary

Local branch-level checks are recorded in each PR body. PR #117's exact head
`fe1d5dd036985341a3f59462db0f880166f9e549` passed all seven CI jobs in run
36998842540 and CodeQL in run 36998842485. At this snapshot, all six technical PRs #116–#121 pass exact-head CI and CodeQL and are ready for review. Their CI/CodeQL runs are #116: 37000474578/37000474560; #117: 36998842540/36998842485; #118: 37003441585/37003441609; #119: 37000713110/37000713033; #120: 37000815251/37000815219; #121: 37001331846/37001331959. The #118 correction replaced a binary payload hash sensitive to NumPy 2.3.5 versus CI NumPy 2.4.3 with tolerance-based baseline current and weighted-concentration checks; all seven CI jobs and CodeQL passed on its current head.

The numerical system still consists of bounded development paths with their
existing assumptions. No new source values, measurements, calibration, or
physics laws are introduced. Structured-cell fields remain diagnostic artifacts
under an explicit supporting-electrolyte profile; extrema do not identify risk
or hotspots. Evidence coverage does not imply missing source measurements.
Pending parameter metadata does not imply that a physical phenomenon is absent.
An unresolved module graph remains `not_implemented` rather than silently
falling back to another fidelity.

The next integration sequence is: complete and inspect each exact-head gate;
refresh this audit when branches change; obtain independent review; then order
future integrations by the dependency graph on a newly fetched `main`. PRs are
not merged by this batch, and P20/P21 phase gates remain closed until their
declared numerical, product, and independent evidence exists.
