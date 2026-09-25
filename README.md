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

The executable reactor model (`coupled-0d-dae-v1`) is a lumped, isothermal 0D model. Its named MFC/MEC profiles support continuous mixed-flow operation and closed batch operation, using the same state equations and explicit regime checks. It integrates soluble COD, electroactive biomass, MFC cathode oxygen, and anode/cathode pH with fixed-step RK4; current is closed algebraically through Butler–Volmer kinetics, ohmic resistance, electron supply, and the MFC load or MEC applied-voltage boundary. A batch COD change is an inventory change, not a continuous effluent removal or treatment-rate metric. Neither regime is spatially resolved or independently calibrated.

The model does not resolve microbial guilds, detailed metabolism, nitrogen species, alkalinity speciation, gas crossover/transfer, dynamic membrane fouling, thermal gradients, or multiphase flow. When an input supplies an uncertainty magnitude and matching unit, METREV runs deterministic one-at-a-time scenarios at the nominal value plus and minus that magnitude. These runs do not assume a probability distribution, combine uncertainties, or create a prediction interval. The biosensor calculation is a static amperometric calibration (linear, Langmuir, or Michaelis–Menten); it does not simulate reaction/diffusion, correct for matrix interference, apply drift correction, or propagate sensor noise. A complete input may therefore produce a model result without establishing predictive accuracy for a site.

Here, **0D** means each reactor compartment has lumped state values rather than a map across its physical volume; those values still change over time. A 1D model resolves position along one spatial direction, 2D across two directions, and 3D across three. “4D” commonly means 3D space evolving over time. Adding dimensions requires spatial equations, geometry, boundary conditions, parameters, and suitable observations; it is not a switch that can make this model experimentally validated.

Every scientific parameter must carry a value, unit, source kind (`measured`, `literature`, `default`, `assumption`, or `test_fixture`), and source reference. Uncertainty is optional and must have a unit when supplied. No scientific value is silently filled in. Missing or inconsistent critical inputs return `insufficient_data`. Test fixtures are not measurements or literature data.

All solver observations and series are marked as modeled outputs. MFC electrical output, auxiliary demand, and sensor demand have separate boundaries. MEC electrical input is not generation; gross and captured hydrogen are separate Faraday-based outputs. The displayed confidence score is a fixed heuristic, not a probability or a calibration result. Sensitivity scenarios are deterministic input perturbations, not independent validation or uncertainty propagation.

The experimental comparison helper computes a residual only when an observation is marked approved with reviewer/time metadata, assigned to an independent validation dataset, and manually assessed as condition-matched with the same metric key, unit, and coordinate. It checks those supplied assertions; it does not authenticate the reviewer or independently verify the source. It does not convert units, choose acceptance thresholds, or return a pass/fail or validation conclusion. Candidate evidence, assumptions/defaults, test fixtures, calibration/training data, and incomplete condition matches are blocked.

The solver permits at most 2,000 integration steps and emits at most 200 points per series. Plots must compare like units; sampled curves are model output, not experimental observations. A validation test passing proves the tested contract or numerical invariant only, not agreement with an independent experiment.

## Inputs and results

The intake starts with five empty templates: wastewater MFC, wastewater MEC, standalone biosensor, MFC-integrated biosensor, and MEC-integrated biosensor. Empty templates deliberately contain no scientific operating values. Wastewater inputs retain sample/method context; supported conversions include COD from `mgCOD/L` to `kgCOD/m3`, temperature from Celsius to Kelvin, and conductivity from `mS/cm` to `S/m` when the units and source reference are explicit.

Model results include COD and biomass trajectories, pH, MFC cathode oxygen, current and voltage, electrical output or input, auxiliary demand, MEC gross/captured/uncaptured hydrogen, and biosensor signal/detection/power checks when those inputs are provided. The output accounting also reports biomass decay and washout, activation and ohmic electrical-equivalent work, and COD/biomass balance residuals. These balances help expose modeled accounting gaps; they do not quantify unimplemented physical losses such as gas crossover, fouling, aging, or side reactions. Other wastewater fields may be stored as measurements but are not all modeled state variables.

## Literature plan and corpus status

The focused search configuration has 20 queries across OpenAlex, Crossref, and Europe PMC. A target of 500 is a planning budget, not a downloaded or validated corpus. With 20 queries and 3 providers there are 60 query/provider slots; distributing 500 with one-page integer limits assigns 8 records per slot, so the theoretical request ceiling is 480 before duplicates, empty responses, access checks, or review. The checked-in curated manifest has ten source records and ten claims, all pending human review; each source is DOI-traceable, no claims are accepted, and no supplier documents are included. It is a small, hand-curated candidate register rather than a validated evidence corpus.

The model profile catalog separates four runnable cases (MFC and MEC, each with continuous-flow and closed-batch boundaries) from research-only options such as single-chamber air cathodes, tubular modules, stacks, spatial biofilm models, multi-population MECs, membrane-free gas management, and dynamic MFC BOD sensing. The research-only profiles document missing model capability; they cannot produce a simulation. Profile selection does not supply scientific parameter values. Every required value still needs its unit and source reference.

Journal labels are stored only as contextual metadata. Historical CAPES Qualis Periódicos used journal strata for a specified area and cycle; CAPES guidance for 2025–2028 shifts to article-level procedures, with area-specific methods and possible A1–A8 strata. Neither system is a universal international A1–A4 scale, and a journal/article label does not validate a study or an individual claim.

The narrative and research-extraction LLM adapter supports GPT-6 through the OpenAI Responses API when explicitly enabled. The default remains the local deterministic stub (`METREV_LLM_MODE=stub`); opt in with `METREV_LLM_MODE=openai` plus `OPENAI_API_KEY` (or `METREV_LLM_API_KEY`). The default model is `gpt-6-sol`; configure `METREV_LLM_MODEL`, `METREV_LLM_BASE_URL`, and `METREV_LLM_REASONING_EFFORT` when needed. Responses use `store:false`. OpenAI receives the bounded case or source text supplied to that feature, so enable it only when that transfer fits the project's data policy. Generated prose is explanatory; extracted evidence is a candidate checked against the supplied source span and still needs human review. An LLM never assigns source acceptance or model validation.

The focused plan-only run reports 60 planned slots and the backfill dry-run queues zero jobs. The checked-in source registers are versioned repository artifacts, separate from PostgreSQL; this checkout did not inspect prior or remote database contents.

The checked-in candidate registry is separate from the curated manifest. It currently holds eight traceable source candidates, six local artifacts, and twenty-six reported-claim candidates. The first-pass screen covers all eight sources and six local files, with source-side arithmetic and file-shape findings recorded in the registry; it did not mark any claim as human-reviewed or decision-eligible, and it did not add to the curated manifest. The staged candidates include open MFC wastewater results with a reported air-cathode leakage failure mode, open MFC biosensor studies with real urban wastewater, MFC/MEC datasets, and a public patent metadata candidate. Their licenses, locators, local file sizes, and SHA-256 hashes are audited by `metrev:doctor`; none is human-reviewed or eligible for decision inputs. [OpenAlex](https://help.openalex.org/api/) discovers scholarly works and their relationships, and can expose open-access locations; basic search is public and an API key is optional for higher usage limits. [Crossref](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) supplies DOI registration metadata deposited by publishers and trusted sources. [Europe PMC](https://dev.europepmc.org/RestfulWebService) specializes in life-science records and provides metadata plus full-text XML for eligible open-access items. These services help locate sources; they do not by themselves supply compatible, reviewed measurements. Open research-data repositories such as [Dataverse](https://guides.dataverse.org/en/6.8/api/) and [Zenodo](https://developers.zenodo.org/) expose dataset records and files; [Mendeley Data](https://data.mendeley.com/api/docs/) also offers a public dataset API. Patent search can start with [Espacenet](https://worldwide.espacenet.com/) and EPO's [Open Patent Services](https://www.epo.org/en/searching-for-patents/data/web-services/ops). All files still need license, method, units, cell/sample, and applicability review. Repository and patent providers are not yet connected to the runtime ingestion adapters.

The two research bootstrap/queue commands and three individual provider commands below are dry-runs: they only plan work and make no provider or database calls. The provider commands' `--dryRun` flag prints an offline request plan; it never fetches provider records or opens PostgreSQL. `metrev:doctor` is offline by default. Its optional `--probe-providers` mode sends one small read-only metadata search to OpenAlex, Crossref, and Europe PMC to test actual connectivity; it does not download full text, ingest records, or access PostgreSQL. The provider scripts use Node's built-in environment-proxy support when available, honoring configured `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` settings without exposing their values in reports.

```bash
pnpm run db:bootstrap:focused:dry-run
pnpm run research:queue:focused-literature:dry-run
pnpm --filter @metrev/database ingest:literature:openalex -- --query="MFC wastewater COD" --dryRun
pnpm --filter @metrev/database ingest:literature:crossref -- --query="MFC wastewater COD" --dryRun
pnpm --filter @metrev/database ingest:literature:europepmc -- --query="MFC wastewater COD" --dryRun
pnpm run metrev:doctor -- --json --probe-providers
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
