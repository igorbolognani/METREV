# Quickstart

## Check a mechanistic model

The solver accepts a full `mechanistic_model` object from `packages/domain-contracts/src/schemas.ts`. Parameters require value/unit/source-kind/source-reference metadata. See `bioelectrochem_agent_kit/domain/rules/mechanistic-model.yml` for the canonical parameter paths and units, and `tests/fixtures/raw-case-input.json` for a clearly marked test-only MFC example.

Run the focused model tests:

```bash
pnpm exec vitest run tests/runtime/mechanistic-electrochem-model.test.ts
```

Expected behavior:

- a complete MFC case returns time-series and derived model observations;
- a complete MEC case includes time-integrated electrical input and auxiliary demand plus gross and captured hydrogen amounts and rates;
- a standalone biosensor returns a calibrated signal without requiring a cell;
- an integrated sensor checks its configured load against modeled power availability;
- missing critical values or unsupported transduction models return `insufficient_data`.

## Intake a site or lab wastewater case

Choose one of the five empty focused templates in the intake UI. Enter site/lab COD, BOD, TSS, pH, temperature, conductivity and other available water-quality measurements with their actual source metadata. Add complete reactor and sensor configuration objects in the JSON fields. Never use an unlabeled illustrative value as a measurement.

COD can be stored as `mgCOD/L` for the original sample and normalized to `kgCOD/m3` for the model. Both values, source reference, and the normalization rule remain in the submitted case.

## Plan focused literature work without side effects

```bash
pnpm run research:queue:focused-literature:dry-run
pnpm run db:bootstrap:focused:dry-run
```

Both commands must report planned work only. They must not initialize PostgreSQL, call OpenAlex/Crossref/Europe PMC, or write catalog records. Actual ingestion is a separate, explicit operation against a reviewed database target; the research worker is required to process queued backfills.

## Broader engineering checks

```bash
pnpm run test:python
pnpm exec vitest run tests/runtime/mechanistic-electrochem-model.test.ts tests/runtime/case-intake-preset.test.ts tests/runtime/bootstrap-bigdata.test.ts tests/runtime/case-evaluation-service.test.ts tests/runtime/research-api.test.ts
pnpm run lint
pnpm run build
```

Database and E2E checks require configured disposable PostgreSQL, Docker, and Playwright browsers. They are not prerequisites for the pure in-memory scientific/contract test paths.
