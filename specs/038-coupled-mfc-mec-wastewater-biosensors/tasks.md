# Tasks

## Scope and contracts

- [x] Review numbered feature history 002–037 and record active versus historical direction.
- [x] Define active MFC/MEC, wastewater treatment/management, and standalone/integrated biosensor scope.
- [x] Add source-backed model, biosensor, and wastewater-quality contracts.
- [x] Add domain mechanistic parameter/unit specification and align runtime loader.
- [x] Align every active domain/contract/research taxonomy and retire out-of-scope query/data defaults.

## Mechanistic execution

- [x] Implement deterministic coupled 0D model with biological, electrochemical, materials, geometry, operation, and water-quality inputs.
- [x] Add MFC oxygen-transfer and load closure; add MEC applied-voltage and hydrogen-generation/capture closure.
- [x] Add standalone and cell-integrated amperometric biosensor cases and power-budget evaluation.
- [x] Verify additional invariants with focused tests (state bounds, COD accounting, H₂ and electrical-energy closure).
- [x] Document model boundary and non-validated uses.

## Intake and data workflows

- [x] Replace active intake choices with five empty, focused templates.
- [x] Add JSON validation, COD unit normalization, and sensor/model inputs to case intake.
- [x] Replace broad/large default literature plan with a 20-query, 500-record focused preset.
- [x] Make both focused plan-only CLI paths provably offline and side-effect-free.
- [x] Verify research eligibility and extraction output cannot reactivate out-of-scope families.

## Verification and release

- [x] Update and pass case-intake and scientific-contract regressions.
- [x] Run mechanistic, case, research API, queue, ingestion planner, and contract tests.
- [x] Run available typecheck/lint/build gates; record environment-blocked checks accurately.
- [x] Inspect final diff for generated artifacts, active/historical taxonomy drift, and unsafe data operations.
- [ ] Commit the implementation on the focused branch and open a pull request for review.

## Verification notes

- `node_modules/.bin/vitest run`: 63 files and 272 tests passed.
- `python3 tests/contracts/run_contract_check.py`: 15 contract checks passed.
- Direct `tsc --noEmit` checks passed for domain contracts, electrochemical models, database, research intelligence, evidence audit, rule engine, LLM adapter, API server, and web UI.
- The monolithic root `tsconfig.json` check is not a clean gate because it includes cross-app and test files without their package path mappings and React declarations; the owning app/package TypeScript projects pass independently.
- Focused ESLint passed for the changed solver, decision-context, audit, presenter, and regression-test files. The repository-wide ESLint invocation remains nonpassing on existing script/test findings and root Next.js page discovery.
- Focused Prettier checks passed for the changed model, API/audit code, tests, spec, and YAML property dictionaries. The repository-wide Prettier check reports formatting differences in 151 files.
- `node scripts/generate-full-repository-functional-export.mjs --check` passed for 830 tracked files after regenerating the functional export.
- `turbo run build` was attempted but stopped while workspace postinstall tried to regenerate Prisma clients concurrently; pnpm also blocked dependency build scripts (`ERR_PNPM_IGNORED_BUILDS`). The runtime supplies pnpm 11.19 while `package.json` pins 10.6.0. No migration, seed, or database operation ran.
- Offline bootstrap `--planOnly` produced 20 queries and 60 provider/query plan entries; integer per-run limits cap the estimated maximum at 480 against the 500-record target. Backfill `--dryRun` produced the same estimate and queued zero runs. Both were executed without `DATABASE_URL` or `DIRECT_URL`; neither initialized a database or called a provider.
