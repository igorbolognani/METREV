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

Run focused checks:

```bash
pnpm run test:python
pnpm exec vitest run tests/runtime/mechanistic-electrochem-model.test.ts tests/runtime/case-intake-preset.test.ts tests/runtime/bootstrap-bigdata.test.ts tests/runtime/research-scope-boundary.test.ts
pnpm exec tsc --noEmit -p packages/domain-contracts/tsconfig.json
pnpm exec tsc --noEmit -p packages/electrochem-models/tsconfig.json
pnpm exec tsc --noEmit -p apps/web-ui/tsconfig.json
```

`pnpm run test:fast`, `pnpm run lint`, and `pnpm run build` are the broader checks. Database, Docker, and browser checks need their own configured environment.

## Scientific boundary

The executable reactor model (`coupled-0d-dae-v1`) is a lumped, isothermal 0D continuous-flow model. It integrates soluble COD, electroactive biomass, MFC cathode oxygen, and anode/cathode pH with fixed-step RK4; current is closed algebraically through Butler–Volmer kinetics, ohmic resistance, electron supply, and the MFC load or MEC applied-voltage boundary. It is not a spatially resolved or independently calibrated model.

The model does not resolve microbial guilds, detailed metabolism, nitrogen species, alkalinity speciation, gas crossover/transfer, dynamic membrane fouling, thermal gradients, multiphase flow, or parameter uncertainty. The biosensor calculation is a static amperometric calibration (linear, Langmuir, or Michaelis–Menten); it does not simulate reaction/diffusion, correct for matrix interference, apply drift correction, or propagate sensor noise. A complete input may therefore produce a model result without establishing predictive accuracy for a site.

Every scientific parameter must carry a value, unit, source kind (`measured`, `literature`, `default`, `assumption`, or `test_fixture`), and source reference. Uncertainty is optional and must have a unit when supplied. No scientific value is silently filled in. Missing or inconsistent critical inputs return `insufficient_data`. Test fixtures are not measurements or literature data.

All solver observations and series are marked as modeled outputs. MFC electrical output, auxiliary demand, and sensor demand have separate boundaries. MEC electrical input is not generation; gross and captured hydrogen are separate Faraday-based outputs. The displayed confidence score is a fixed heuristic, not a probability or a calibration result. Uncertainty fields are stored but are not propagated.

The solver permits at most 2,000 integration steps and emits at most 200 points per series. Plots must compare like units; sampled curves are model output, not experimental observations. A validation test passing proves the tested contract or numerical invariant only, not agreement with an independent experiment.

## Inputs and results

The intake starts with five empty templates: wastewater MFC, wastewater MEC, standalone biosensor, MFC-integrated biosensor, and MEC-integrated biosensor. Empty templates deliberately contain no scientific operating values. Wastewater inputs retain sample/method context; supported conversions include COD from `mgCOD/L` to `kgCOD/m3`, temperature from Celsius to Kelvin, and conductivity from `mS/cm` to `S/m` when the units and source reference are explicit.

Model results include COD and biomass trajectories, pH, MFC cathode oxygen, current and voltage, electrical output or input, auxiliary demand, MEC hydrogen, and biosensor signal/detection/power checks when those inputs are provided. Other wastewater fields may be stored as measurements but are not all modeled state variables.

## Literature plan and corpus status

The focused search configuration has 20 queries across OpenAlex, Crossref, and Europe PMC. A target of 500 is a planning budget, not a downloaded or validated corpus. With 20 queries and 3 providers there are 60 query/provider slots; distributing 500 with one-page integer limits assigns 8 records per slot, so the theoretical request ceiling is 480 before duplicates, empty responses, access checks, or review. The checked-in curated manifest currently has zero records.

The focused plan-only run reports 60 planned slots and the backfill dry-run queues zero jobs. The empty checked-in manifest describes this repository file only; it does not report prior or remote database contents. This checkout did not inspect a database.

These commands only plan work and make no provider or database calls:

```bash
pnpm run db:bootstrap:focused:dry-run
pnpm run research:queue:focused-literature:dry-run
```

They do not download papers, establish access rights, extract full text, deduplicate provider records, validate measurements, or create a reviewed evidence set. A real ingestion requires a deliberately configured database and provider access; use it only after reviewing the target database and the source/access policy. A 500-record target is not a claim that the literature is complete, representative, or scientifically validated.

## Source map

- `bioelectrochem_agent_kit/domain/`: active system meaning, taxonomies, and scientific rules.
- `bioelectro-copilot-contracts/contracts/`: validation and serialization contracts.
- `packages/electrochem-models/`: executable mechanistic model and simulation mapping.
- `packages/domain-contracts/`: schemas, normalization, and loading/reconciliation.
- `packages/database/`: persistence, literature ingestion, and evidence review.
- `apps/`: web interface, API, and research worker.
- `tests/`: contract, model, API, database, and UI checks.

Repository working rules are in [`AGENTS.md`](AGENTS.md); Copilot uses the same rules through [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
