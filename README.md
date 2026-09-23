# METREV

METREV is a decision-support and modeling workspace for **microbial fuel cells (MFC), microbial electrolysis cells (MEC), wastewater treatment/management, and electrochemical biosensors**. Biosensors may run independently or be integrated with an MFC/MEC.

The active technical scope and current implementation are tracked in [spec 038](specs/038-coupled-mfc-mec-wastewater-biosensors/spec.md). The earlier feature history is indexed in [specs/README.md](specs/README.md); old volumes such as 30,000 or 500,000 literature records are not current goals.

## System boundary

The executable model is a source-backed, isothermal, well-mixed 0D MFC/MEC model with differential reactor states and an algebraic electrochemical closure. It couples COD removal, electroactive biofilm activity, pH response, MFC oxygen transfer, electrode kinetics, electrolyte/membrane/contact resistance, cell voltage/current, and power or hydrogen outputs. A biosensor can use an amperometric linear, Langmuir, or Michaelis–Menten calibration, standalone or coupled to the cell's available power.

This is a runnable mechanistic baseline, not a spatially resolved multiphysics package. It does not yet resolve individual ionic species, detailed microbial guilds, spatial biofilm gradients, dynamic membrane fouling, thermal gradients, or full wastewater speciation. Missing model parameters return an `insufficient_data` result rather than proxy outputs. Synthetic, test-only parameters are labelled as fixtures and must not be treated as measured or literature data.

The canonical meaning lives in `bioelectrochem_agent_kit/domain/`. `bioelectro-copilot-contracts/contracts/` defines input and serialization boundaries; loaders and runtime implementations live in `packages/` and `apps/`.

## Local setup and checks

Use Node and pnpm versions compatible with `package.json` (`pnpm@10.6.0`). For a fresh checkout:

```bash
pnpm install
pnpm prisma:generate
pnpm run test:python
pnpm exec vitest run tests/runtime/mechanistic-electrochem-model.test.ts tests/runtime/case-intake-preset.test.ts tests/runtime/bootstrap-bigdata.test.ts
pnpm exec tsc --noEmit -p packages/domain-contracts/tsconfig.json
pnpm exec tsc --noEmit -p packages/electrochem-models/tsconfig.json
pnpm exec tsc --noEmit -p apps/web-ui/tsconfig.json
```

The full engineering gates are `pnpm run lint`, `pnpm run test:fast`, `pnpm run test:advanced`, and `pnpm run build`. Database and browser checks require their own configured PostgreSQL/Docker and Playwright environment (`pnpm run test:db`, `pnpm run test:e2e`).

The case intake has five deliberately empty focused templates: wastewater MFC, wastewater MEC (with hydrogen as a secondary output), standalone biosensor, MFC-integrated biosensor, and MEC-integrated biosensor. Supply the full mechanistic model, biosensor, and water-quality objects as JSON. Each scientific parameter carries a value, unit, source kind/reference, and optional uncertainty. COD from a source-backed `mgCOD/L` measurement is normalized to `kgCOD/m3` while retaining its original value and unit.

## Focused evidence workflow

The committed research preset contains MFC/MEC wastewater, electroactive biology/materials, and standalone/integrated biosensor queries for OpenAlex, Crossref, and Europe PMC. It is bounded to 500 planned records and 20 focused queries. Search results are literature candidates; they do not silently become measured case inputs.

Plan the literature query queue without initializing PostgreSQL or contacting providers:

```bash
pnpm run research:queue:focused-literature:dry-run
```

Plan the provider bootstrap without network requests or database writes:

```bash
pnpm run db:bootstrap:focused:dry-run
```

To execute either ingestion path, configure a disposable/intended PostgreSQL database, review its target, then use the non-dry-run command. The queue path also needs the research worker to process queued work. Ingestion and migration commands are not test setup and must be run intentionally.

## Local application

Copy `.env.example` to `.env`, configure PostgreSQL and the shared auth secret, then run the repository's usual setup:

```bash
pnpm run db:bootstrap
pnpm run dev:api
pnpm run dev:research-worker
pnpm run dev:web
```

For the Docker-backed local workspace, `pnpm run local:view:up`, `pnpm run local:view:status`, and `pnpm run local:view:down` manage the stack. The web app defaults to `http://localhost:3000/login`; the local-view wrapper uses port 3012.

## Scope maintenance

Specs 002–037 document the project's earlier runtime, product, corpus-scale, and governance directions. They remain available as historical decision records; their checked task boxes do not prove current operation. New scientific functionality belongs under the MFC/MEC, wastewater, and electrochemical-biosensor scope in spec 038. Other electrochemical technologies and nutrient/biogas recovery are retained only as historical or compatibility data, not active intake/research taxonomies.
