# METREV

METREV is a scientific modeling and decision-support workspace for microbial fuel cells (MFC), microbial electrolysis cells (MEC), wastewater treatment and management, and electrochemical biosensors. A biosensor may run standalone or be integrated with an MFC or MEC. MEC hydrogen is a secondary output.

## Bootstrap

Requirements: Node.js 24, pnpm 10.6.0, and Docker for the local PostgreSQL-backed application.

```bash
pnpm install
pnpm prisma:generate
cp .env.example .env
```

Set a private `AUTH_SECRET` and configure PostgreSQL in `.env` before running the application. Start the Docker workspace with `pnpm run local:view:up`; stop it with `pnpm run local:view:down`. The web app is available at `http://localhost:3012/login`.

Optional structured-cell development execution requires Python numerical dependencies and matching API/worker adapters. Configure the paths and private artifact root as described in [STRUCTURED_CELL.md](apps/spatial-sidecar/STRUCTURED_CELL.md); default API admission remains closed. This path has its own identity and does not activate the catalog's general research profiles. A saved evaluation can explicitly compose a sourced planar 2D/3D cell, map numerical layers to stack components, queue a run and reload its development report through [the case spatial API](docs/api/SPATIAL_SIMULATIONS.md). No case measurements are filled automatically.

Run focused checks:

```bash
pnpm run test:python
pnpm exec vitest run tests/runtime/mechanistic-electrochem-model.test.ts tests/runtime/case-intake-preset.test.ts tests/runtime/bootstrap-bigdata.test.ts tests/runtime/research-scope-boundary.test.ts
pnpm exec tsc --noEmit -p packages/domain-contracts/tsconfig.json
pnpm exec tsc --noEmit -p packages/electrochem-models/tsconfig.json
pnpm exec tsc --noEmit -p apps/web-ui/tsconfig.json
```

`pnpm run test:fast`, `pnpm run lint`, and `pnpm run build` are the broader checks. Database, Docker, and browser checks need their own configured environment.

## Git integration

`main` is the only long-lived branch. Use one temporary branch per coherent batch and target its PR directly at `main`; CI rejects temporary integration targets. After main CI passes, the archive workflow preserves audited historical heads and the latest merged PR head in tags before deleting unchanged inactive branches. Protected branches, open-PR heads/bases and changed heads are retained. The archive and deletion use an atomic Git transaction with explicit SHA leases, so concurrent work cannot be overwritten. `pnpm run branches:archive:plan` is offline and makes no changes. See [the archive plan](governance/BRANCH_ARCHIVE_PLAN.json) and [current execution audit](docs/audits/MAINLINE_TEST_AND_PHASE_AUDIT_2026-09-30.md) for the historical inventory and recovery instructions.

## Current capability

The persisted case runner executes the lumped, isothermal, uncalibrated `coupled-0d-dae-v1` for supported MFC/MEC cases. A restricted, steady planar 1D cell can also run through case evaluation when a complete source-backed `cell_1d` is supplied; it remains a development model and its outputs are informational only. The analyst development API remains available. Higher-dimensional catalog entries describe research intent, not executable spatial solvers. Numerical checks do not establish experimental validation.

The current model boundaries, input policy and scientific limitations are in [MODEL_BOUNDARIES.md](docs/science/MODEL_BOUNDARIES.md); evidence and corpus coverage are in [EVIDENCE_POLICY.md](docs/science/EVIDENCE_POLICY.md).

## Authority and next work

- [AGENTS.md](AGENTS.md) applies to every coding agent.
- [governance/PROJECT_STATE.yaml](governance/PROJECT_STATE.yaml) records the audited baseline; [CAPABILITY_MATRIX.yaml](governance/CAPABILITY_MATRIX.yaml) separates runtime, case integration and scientific maturity.
- [ROADMAP.yaml](governance/ROADMAP.yaml) and [DEPENDENCY_GRAPH.yaml](governance/DEPENDENCY_GRAPH.yaml) encode the implementation order. The [full 40-point execution brief](governance/MASTER_EXECUTION_TASK.md) preserves each requirement.
- [ACCEPTANCE_GATES.yaml](governance/ACCEPTANCE_GATES.yaml), [SCIENTIFIC_MATURITY.yaml](governance/SCIENTIFIC_MATURITY.yaml), and [RISK_REGISTER.yaml](governance/RISK_REGISTER.yaml) define promotion gates and risks. `pnpm run governance:check` checks source, catalog, dependencies and maturity claims offline.
- [Spatial contracts](docs/architecture/SPATIAL_CONTRACT.md), [governing equations](docs/numerics/GOVERNING_EQUATIONS.md), [verification matrix](docs/numerics/VERIFICATION_MATRIX.md), and [architecture decisions](docs/adr/ADR-001-spatial-runtime-boundary.md) track the numerical boundary and its open gates.
- `bioelectrochem_agent_kit/domain/` owns scientific meaning; `bioelectro-copilot-contracts/contracts/` owns external shapes; `packages/domain-contracts/` reconciles them; `packages/` and `apps/` implement behavior; `tests/` verify it.
