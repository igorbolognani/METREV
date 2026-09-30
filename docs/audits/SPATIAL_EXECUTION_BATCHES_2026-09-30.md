# Spatial execution batches — 2026-09-30

## Baseline and authority

Repository: `igorbolognani/METREV`. The fetched `main` baseline was
`e6690c36ebcb14063d5fa78d6b1e60c6310a4145` (PR #94). The supplied ZIP matched that
baseline. PRs #95–#106 had been merged into stacked branches rather than into
`main`; their latest merge was `1484c6a` on the P14 development branch. Batch 1
integrates that history back toward `main` before building on it.

Authority: `AGENTS.md`, the supplied full METREV master execution task, repository
scientific instructions, governance, current contracts and actual executable code.
The execution task was read through its end. Complete earlier September sessions
were not available through personal-context retrieval, so this report does not
claim that those sessions or every repository file were read. The baseline SHA in
`PROJECT_STATE.yaml` is deliberately historical; it is not the live main SHA.

## Inspection ledger

- Read: root instructions and README; master task; relevant governance state,
  roadmap, dependency/capability/gate/maturity/risk records; spatial input/result
  and sidecar contracts; runtime/solver/test instructions; governing-equation,
  verification and spatial architecture documents; ADRs for toolchain, artifacts
  and async execution; implemented sidecar, worker, artifact adapters and focused
  native/runtime/API tests.
- Inspected by targeted search and reads: physics-composition descriptors, case
  runner and model admission, persistence schemas and API, UI entry points,
  scientific boundaries and evidence policy, CI/package configuration.
- Compared: fetched branch/merge history, supplied ZIP versus main, merged stack
  versus main, and each new batch versus its predecessor.
- No new paper-derived numerical parameter or experimental dataset was added.
  Synthetic fixtures are mathematical checks, not experimental validation.

## Delivered batches and merge order

| Batch | PR                                                       | Base    | Scope                                                                                                                                     |
| ----- | -------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [#107](https://github.com/igorbolognani/METREV/pull/107) | main    | Integrate merged #95–#106; complete signal shutdown, claim-race handling, heartbeat drain and strict CLI configuration                    |
| 2     | [#108](https://github.com/igorbolognani/METREV/pull/108) | batch 1 | Compose actual Stokes P2 flow with neutral scalar transport, native artifacts, diagnostics, async execution and authenticated field reads |
| 3     | `codex/spatial-runtime-batch-3`                          | batch 2 | Bound native container execution; unify regime configuration; verify cleanup and reconcile development capability governance              |

Batch 1 head: `4743b44a8140d466867f4a640e48896436a3178e`.
Batch 2 head: `d6d211fb223e210298e30deee6773095ba8eeb14`.
Batch 3's authoritative head/tree and CI are recorded by its PR and commit; this
file lives in that commit, so it does not embed its own recursively changing SHA.

Merge #107 into main first. Retarget #108 to main before merging it, then retarget
batch 3 to main and merge it. Do not merge later PRs only into temporary stacked
branches. No new PR was merged automatically by this execution.

## Implementation and plan mapping

| Plan items  | Changes                                                                                                                                                                  | Remaining acceptance boundary                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| P02/P03     | Strict optional Stokes transport setup; shared sourced neutral-species vocabulary; input-bound scalar/velocity identity and diffusivity                                  | Planar, one-domain, constant-coefficient development subset; broader dimensional/material intake remains partial                   |
| P04/P06/P07 | Common conservative scalar FEM kernel; actual solved P2 Stokes velocity on the same UFL mesh; Darcy compatibility; 3/4-field protocol and measured transport diagnostics | Reactive/ionic species, charge, region interfaces, electrochemical closure and nonlinear coupled cell physics remain unimplemented |
| P14/P15     | Native pressure/velocity/concentration datasets projected into result-v2 manifests; owner/run/hash-bound local stores and authenticated field API regression             | Durable production artifact provider, deployment and spatial viewer remain pending                                                 |
| P16         | Distinct service shutdown versus owner cancellation; claim-race handling; heartbeat drain; strict config; Docker resource envelope and named-container removal           | Worker/database deployment and product solver admission remain separate gates                                                      |
| P35/P36/P38 | Focused transport, worker/API and failure regressions; existing native CI exercises bounded Docker mode; governance checks development operations separately             | Broad spatial test strategy and scientific maturity promotion require the unresolved dependencies                                  |

The container mode uses explicit locally available images, no image pull or network,
read-only root filesystem, dropped capabilities, caller UID/GID, CPU/memory/PID/tmp
bounds and only the invocation's output directory mounted. The Docker client is
terminated on abort/timeout and the exact named container is forcibly removed with
a separate bounded cleanup deadline. Cleanup failures become a sanitized worker
failure code. No implicit host-Python fallback is allowed when image mode is set.
Both hydraulic executors use one strict development configuration factory.

## Scientific and product boundaries

Transport is steady, neutral, passive and restricted to one liquid or homogeneous
porous domain with sourced positive constant diffusivity and explicit ports/walls.
The advective weak form retains discrete velocity divergence. The Stokes scalar
solve consumes the native P2 velocity, not the exported P1 display interpolation.
The executor compares measured species fluxes, concentration extrema, solver
convergence and input/field identities; it rejects materially negative
concentrations, reversed port flow and excessive development flux residuals.
Roundoff concentration values are not silently clipped.

The Stokes constant-tracer refinement fixture and zero-flow affine-diffusion
limiting case complement the Darcy analytic advection–diffusion fixture. They do
not establish general coupled PDE convergence or experimental validity.

`development_operations` records native operations, worker consumers, test sources
and explicitly closed product admission. Governance verifies those references.
Model catalog availability and experimental maturity are not promoted. P2 and P3
remain unavailable as complete product capabilities. No spatial UI was added and
no product solver or production field provider was registered. The existing
fail-closed API admission is preserved.

## Verification ledger

| Check                    | Batch 1                    | Batch 2                    | Batch 3                                                                                             |
| ------------------------ | -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| JS runtime/unit suite    | 461 passed, 2 native skips | 472 passed, 3 native skips | 489 passed, 3 native skips; additional already-removed-container regression verified in focused run |
| External contracts       | 17 checks passed           | 17 checks passed           | 17 checks passed                                                                                    |
| Python spatial suite     | 28 tests run, 3 Gmsh skips | 29 tests run, 3 Gmsh skips | 29 tests run, 3 Gmsh skips                                                                          |
| Lint/build               | All 20 packages passed     | All 20 packages passed     | All 20 packages passed                                                                              |
| Governance/ESM/format    | Passed                     | Passed                     | Passed                                                                                              |
| Native Docker/PostgreSQL | CI passed                  | CI passed                  | Required in PR CI; Docker/PostgreSQL unavailable locally                                            |

Local command: `pnpm run validate:fast`. Focused regressions, Prettier workflow
asset checks and `git diff --check` supplement that command. The added batch-3
cleanup case covers Docker's successful automatic removal before forced cleanup.

Batch 1: [CI run 36725422486](https://github.com/igorbolognani/METREV/actions/runs/36725422486)
and CodeQL passed. Batch 2: [CI run 36728455496](https://github.com/igorbolognani/METREV/actions/runs/36728455496)
passed, including PostgreSQL, pinned Gmsh/DOLFINx/PETSc, new scalar fixtures and
worker-to-manifest-to-authenticated-field-API roundtrips. Batch 3 must pass those
same native jobs using its real container transport before merge; PR checks are
the live record rather than a claim of local Docker execution.

## Dependency frontier

The next scientific work is the unresolved P06 species/charge/reaction/interface
core needed by P08/P09/P10, then P11 numerical coupling and P12 executable cell
physics. P17 case-runner, P18 workbench and P19 viewer integration depend on those gates. Deployment,
production artifact storage and explicit product admission also remain unresolved.
They cannot be replaced by naming an isolated benchmark as a functional model.
Evidence acquisition/benchmarks must retain provenance and distinguish numerical
verification from experiments; no new experimental-validity claim is made here.

## File-change ledger

The lists below exclude this report itself. PR diffs are authoritative for complete
patches, and batch 1 also includes the history integrated from #95–#106.

### Batch 1

```text
M	.github/workflows/ci.yml
M	apps/spatial-sidecar/metrev_spatial/__init__.py
M	apps/spatial-sidecar/metrev_spatial/__main__.py
A	apps/spatial-sidecar/metrev_spatial/darcy.py
A	apps/spatial-sidecar/metrev_spatial/darcy_transport.py
M	bioelectro-copilot-contracts/contracts/spatial_input_v2.yaml
M	bioelectrochem_agent_kit/domain/ontology/spatial-parameter-authority.json
M	docs/adr/ADR-004-spatial-artifacts.md
M	docs/adr/ADR-005-async-simulation-jobs.md
M	docs/architecture/SPATIAL_CONTRACT.md
M	docs/numerics/GOVERNING_EQUATIONS.md
M	docs/numerics/VERIFICATION_MATRIX.md
M	governance/PROJECT_STATE.yaml
M	governance/ROADMAP.yaml
M	packages/domain-contracts/src/index.ts
A	packages/domain-contracts/src/spatial-darcy-schema.ts
A	packages/domain-contracts/src/spatial-darcy-transport-schema.ts
M	packages/domain-contracts/src/spatial-model-v2-schema.ts
M	packages/domain-contracts/src/spatial-sidecar-schema.ts
M	packages/domain-contracts/src/spatial-simulation-schema.ts
A	packages/domain-contracts/src/spatial-stokes-schema.ts
M	packages/spatial-artifact-store/src/index.ts
M	packages/spatial-sidecar-client/src/index.ts
M	packages/spatial-worker/package.json
A	packages/spatial-worker/src/cli.ts
A	packages/spatial-worker/src/config.ts
A	packages/spatial-worker/src/darcy-development-adapter.ts
A	packages/spatial-worker/src/darcy-development-executor.ts
A	packages/spatial-worker/src/execution-error.ts
M	packages/spatial-worker/src/index.ts
A	packages/spatial-worker/src/stokes-development-adapter.ts
A	packages/spatial-worker/src/stokes-development-executor.ts
M	packages/spatial-worker/src/worker.ts
M	pnpm-lock.yaml
M	tests/contracts/spatial_toolchain_smoke.py
M	tests/contracts/test_spatial_sidecar.py
M	tests/fixtures/spatial-input-v2.ts
M	tests/runtime/spatial-input-v2.test.ts
M	tests/runtime/spatial-sidecar.test.ts
M	tests/runtime/spatial-simulation-result.test.ts
A	tests/runtime/spatial-worker-config.test.ts
A	tests/runtime/spatial-worker-darcy-development.test.ts
A	tests/runtime/spatial-worker-stokes-development.test.ts
M	tests/runtime/spatial-worker.test.ts
```

### Batch 2

```text
M	apps/spatial-sidecar/metrev_spatial/__init__.py
M	apps/spatial-sidecar/metrev_spatial/__main__.py
M	apps/spatial-sidecar/metrev_spatial/darcy_transport.py
A	apps/spatial-sidecar/metrev_spatial/scalar_transport.py
M	bioelectro-copilot-contracts/contracts/spatial_input_v2.yaml
M	docs/architecture/SPATIAL_CONTRACT.md
M	docs/numerics/GOVERNING_EQUATIONS.md
M	docs/numerics/VERIFICATION_MATRIX.md
M	governance/PROJECT_STATE.yaml
M	governance/ROADMAP.yaml
M	packages/domain-contracts/src/spatial-darcy-transport-schema.ts
M	packages/domain-contracts/src/spatial-model-v2-schema.ts
M	packages/domain-contracts/src/spatial-sidecar-schema.ts
M	packages/spatial-sidecar-client/src/index.ts
M	packages/spatial-worker/src/stokes-development-executor.ts
M	tests/contracts/spatial_toolchain_smoke.py
M	tests/contracts/test_spatial_sidecar.py
M	tests/fixtures/spatial-input-v2.ts
A	tests/runtime/spatial-stokes-transport.test.ts
M	tests/runtime/spatial-worker-stokes-development.test.ts
```

### Batch 3

```text
M	.env.example
M	.github/workflows/ci.yml
M	bioelectro-copilot-contracts/contracts/spatial_input_v2.yaml
M	docs/adr/ADR-001-spatial-runtime-boundary.md
M	docs/adr/ADR-005-async-simulation-jobs.md
M	governance/CAPABILITY_MATRIX.yaml
M	governance/PROJECT_STATE.yaml
M	governance/ROADMAP.yaml
M	packages/spatial-sidecar-client/src/index.ts
M	packages/spatial-worker/src/darcy-development-adapter.ts
M	packages/spatial-worker/src/darcy-development-executor.ts
M	packages/spatial-worker/src/execution-error.ts
M	packages/spatial-worker/src/stokes-development-adapter.ts
M	packages/spatial-worker/src/stokes-development-executor.ts
M	scripts/validate_governance.py
M	tests/runtime/spatial-worker-darcy-development.test.ts
M	tests/runtime/spatial-worker-stokes-development.test.ts
M	tests/runtime/spatial-worker.test.ts
A	packages/spatial-sidecar-client/src/container.ts
A	packages/spatial-worker/src/development-sidecar-config.ts
A	tests/runtime/spatial-container.test.ts
```
