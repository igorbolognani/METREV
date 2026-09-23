# Spec 038: Coupled MFC/MEC, wastewater, and biosensor foundation

**Status:** active implementation baseline
**Scope owner:** `bioelectrochem_agent_kit/domain/`
**Contract owner:** `bioelectro-copilot-contracts/contracts/`
**Runtime owner:** `packages/` and `apps/`

## Problem

The project accumulated broad application taxonomies and corpus-volume goals before it had a coherent, runnable scientific foundation. The active product direction is now limited to microbial fuel cells (MFC), microbial electrolysis cells (MEC), wastewater management/treatment, and electrochemical biosensors. A biosensor can be a standalone device or an instrument powered by/integrated into an MFC or MEC.

## Goals

1. Define component-complete inputs for reactor geometry, electrodes/separator, biological kinetics, electrochemistry, operation, wastewater quality, and sensors.
2. Run an explicit coupled mechanistic baseline for MFC and MEC rather than returning proxy scores or recommendations as if they were simulated measurements.
3. Preserve units, source/value type, source reference, and uncertainty for scientific inputs; distinguish observations, normalized inputs, assumptions, and model outputs.
4. Model standalone and integrated amperometric biosensors with calibration, analytical performance, environmental/matrix fields, and an explicit power budget.
5. Define focused wastewater and literature inputs while keeping unrelated historical cases and the old 30k/500k corpus ambitions outside active taxonomy and ingestion defaults.
6. Provide deterministic tests and offline workflow plans before any database/provider operation.

## Non-goals

- Spatial computational fluid dynamics or a validated, spatially distributed multiphysics solver.
- Detailed aqueous speciation, every microbial guild/pathway, dynamic fouling, thermal gradients, or a universal wastewater plant simulator in this first executable release.
- Predictive claims suitable for process control, permitting, safety cases, or design guarantees.
- A full provenance/audit product now. Each parameter still needs minimum source and value metadata so the scientific baseline is interpretable; comprehensive source lineage, decision audits, and publication workflows are later work.
- Active modeling of microbial desalination cells, generic BES hybrids, nutrient recovery, or biogas synergy.

## Current model boundary

`coupled-0d-dae-v1` is an isothermal, well-mixed, lumped MFC/MEC model. Continuous states are anode COD, electroactive biomass, cathode oxygen for MFC, and anode/cathode pH. At each time step, biological uptake and pH/temperature modifiers feed an algebraic electrochemical closure. The closure includes Butler–Volmer electrode overpotentials, electrolyte resistance, optional separator resistance, contact resistance, and either an MFC external-load line or an MEC applied voltage. MFC oxygen transfer can limit current; MEC hydrogen production is separated into gross generation and captured hydrogen.

The solver reports COD/biomass/pH/oxygen trajectories and derived current, voltage, power, COD-removal, and hydrogen observations. It also integrates MFC output and MEC electrical input across the modeled duration, reports auxiliary energy demand, and integrates gross and captured MEC hydrogen. These are model outputs, not measurements. If electron or oxygen supply caps MFC current before the external-load intersection, the solver reports the residual voltage term needed to close the load line. An integrated sensor compares the cell's available power with its configured demand; a sensor with insufficient power is marked as not operational under that input. Biosensor calibration supports linear, Langmuir, and Michaelis–Menten response forms when the required parameters exist.

The current closure is an executable scientific baseline and must not be described as a complete spatial model. Calibration against independent data, ionic-species transport, spatial gradients, uncertainty propagation, and parameter-identifiability work remain explicit follow-up items.

## Inputs and data foundation

All mechanistic numerical parameters use `{value, unit, source_kind, source_ref, uncertainty?}`. `source_kind` distinguishes measured, literature, default, assumption, and model output values. Inputs without required values, expected units, or material references produce `insufficient_data`; no hardcoded typical values are substituted.

The case boundary collects wastewater type and sample metadata plus COD, BOD, TSS, pH, temperature, conductivity, alkalinity, N/P, sulfate, chloride/salinity, turbidity, VFA, and dissolved oxygen when available. COD normalization from `mgCOD/L` to `kgCOD/m3` is deterministic and keeps original value/unit, source reference, and rule ID.

Five intake templates are intentionally empty of fabricated science values: wastewater MFC, wastewater MEC (hydrogen secondary), standalone biosensor, MFC-integrated sensor, and MEC-integrated sensor. Literature search uses a versioned, bounded 20-query focused preset across OpenAlex, Crossref, and Europe PMC. Retrieved works are candidates for review and parameter extraction, not direct substitutes for a site's influent measurements.

## Requirements

### Functional

- **FR-01:** Active technology choices are MFC, MEC, and electrochemical biosensor; active objectives are wastewater treatment/management and biosensing.
- **FR-02:** Accept complete/partial typed MFC/MEC inputs for geometry, material families and source references, operation, biological kinetics, electrochemistry, and system boundaries.
- **FR-03:** Validate parameter units, domain ranges, source metadata, membrane/cathode reaction consistency, and integration-step limits before simulation.
- **FR-04:** Integrate the coupled states with a deterministic fixed-step RK4 method and an algebraically solved current closure; enforce nonnegative COD, biomass, and oxygen states.
- **FR-05:** Account for substrate uptake/removal, biomass growth and configured attached-biomass washout, pH and temperature effects, MFC oxygen transfer, material active-area factors, ionic/membrane/contact resistance, and auxiliary power.
- **FR-06:** For MEC, expose electrical input energy and distinguish gross H₂ generation from captured H₂ using faradaic efficiency and capture fraction.
- **FR-07:** Accept standalone and integrated biosensor configuration, matrix/analyte, recognition/transduction, electrodes/materials, immobilization/coating, electrode area/loading, operating conditions, calibration, analytical-performance fields, replicates, and power demand/availability.
- **FR-08:** Support linear, Langmuir, and Michaelis–Menten amperometric calibration; report insufficient data for unimplemented transduction modes or incomplete calibration.
- **FR-09:** Keep model output, test fixture, assumed value, measured input, and literature value distinguishable; return the complete input snapshot and source references.
- **FR-10:** Convert the active research classifier and UI to the current scope while retaining legacy enum values only when needed to read existing stored cases.
- **FR-11:** Make focused planning commands offline and side-effect-free. Executing ingestion remains a deliberate database/provider action and is not part of test setup.

### Validation and operational

- **NFR-01:** Same valid input and model version produce deterministic output.
- **NFR-02:** Missing critical data produce no scientifically plausible-looking numeric estimate.
- **NFR-03:** Model output labels communicate the lumped model boundary and do not imply independent validation.
- **NFR-04:** Offline queue/bootstrap planning does not initialize Prisma, call literature providers, or mutate the database.
- **NFR-05:** Unit/domain, application, contract, and test vocabularies stay aligned; compatibility aliases are not offered as active scientific choices.

## Acceptance criteria

- Complete MFC and MEC fixtures run through the same mechanistic engine and return finite, bounded trajectories.
- Removing a required parameter, changing its unit, violating a physical fraction/range, or choosing an incompatible cathode reaction returns an actionable validation/insufficient-data result.
- COD remains nonnegative and cannot increase without influent/feed being modeled; biomass remains nonnegative; generated/captured H₂ respects the configured efficiency/capture fractions.
- Standalone biosensor current is calculated from configured calibration and analyte concentration; integrated operation fails its power-availability check when sensor demand exceeds available cell power.
- Missing input produces `insufficient_data`, not a default-output curve.
- UI offers exactly five focused templates and supports valid/invalid JSON handling plus source-backed COD conversion.
- Offline plan commands report the bounded focus without contacting providers or opening a database connection.
- Targeted runtime tests, contract checks, lint/type checks, and the broader available CI matrix pass; unavailable infrastructure checks are explicitly recorded.

## Risks and decision points

- Literature parameters are often reported under incompatible geometries, normalization bases, and wastewater matrices. Preserve source values and normalization rules; do not merge into one benchmark without comparability tests.
- The simple pH and oxygen closures are approximations. Expose assumptions and validate against independent time-series before using the model for design claims.
- Scientific extraction can identify candidate parameters but must not silently fill a case's measured wastewater inputs.
- Existing stored cases can include legacy objectives and families. Keep read compatibility where it avoids data loss, but reject or map them out of the current active taxonomy.

## Future increments

1. Curated and reviewed MFC/MEC/wastewater/biosensor source corpus with explicit comparability groupings.
2. Species-resolved mass/charge balances, membrane transport, alkalinity/carbonate buffer chemistry, and dynamic electron-acceptor balances.
3. Biomass guilds and biofilm diffusion, coupled hydraulic residence-time and feed modes, and dynamic fouling/durability.
4. Parameter estimation, sensitivity/identifiability analysis, uncertainty propagation, and independent benchmark datasets.
5. Comprehensive data lineage, provenance audit, review history, and reproducible model-run audit records.
