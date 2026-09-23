# Research and technical basis

## Scientific basis used for the implementation boundary

- Zeng et al.'s two-chamber MFC model couples biochemical reactions, Butler–Volmer expressions, and mass/charge balances. It supports the choice of coupled states and electrical boundaries, not this implementation's parameter values: _Journal of Power Sources_ 195(1), 79–89 (2010), DOI [10.1016/j.jpowsour.2009.06.101](https://doi.org/10.1016/j.jpowsour.2009.06.101).
- Hamelers et al. evaluated Butler–Volmer–Monod kinetics against measured bio-anode polarization curves: _Bioresource Technology_ 102(1), 381–387 (2011), DOI [10.1016/j.biortech.2010.06.156](https://doi.org/10.1016/j.biortech.2010.06.156). This supports the kinetic form, not universal parameter values.
- Pinto et al. describe shared anodic microbial kinetics with distinct MFC and MEC cathodic pathways: “A unified model for electricity and hydrogen production in microbial electrochemical cells,” IFAC Proceedings Volumes 44(1), 6084–6089 (2011), DOI [10.3182/20110828-6-IT-1002.01636](https://doi.org/10.3182/20110828-6-IT-1002.01636). The current solver is a simpler lumped closure.
- Call and Logan report hydrogen production, recovery, and coulombic efficiencies in MECs, supporting separate Faradaic production and captured-gas outputs: _Applied and Environmental Microbiology_ 76(6), 1742–1747 (2010), DOI [10.1128/AEM.01760-09](https://doi.org/10.1128/AEM.01760-09).
- Peixoto et al. demonstrate an MFC-based BOD/organic-carbon biosensor for domestic wastewater in online and in-situ monitoring: _Bioelectrochemistry_ 81(2), 99–103 (2011), DOI [10.1016/j.bioelechem.2011.02.002](https://doi.org/10.1016/j.bioelechem.2011.02.002). It supports integrated sensing fields, not universal transfer across analytes or matrices.
- Spurr et al. report calibration stability across long-running MFC biosensors and quantify the recalibration context: _Biosensors and Bioelectronics_ 190, 113392 (2021), DOI [10.1016/j.bios.2021.113392](https://doi.org/10.1016/j.bios.2021.113392). The current solver retains drift and calibration fields but does not apply a drift correction.
- Dudley et al. analyze a differential-algebraic MEC model with algebraic current: _SIAM Journal on Applied Dynamical Systems_ 18(2) (2019), DOI [10.1137/18M1172223](https://doi.org/10.1137/18M1172223). This supports explicit electrical closure as a modeling approach; it does not validate the present implementation.

## Engineering decisions

1. **Low-order coupled baseline first.** A well-mixed model with explicit algebraic circuit closure is executable and testable in the current codebase. Spatial biofilm/transport models require a separate validated numerical package and calibration corpus.
2. **Input metadata on scientific values.** Source/value kind, unit, reference, original-unit conversion, and uncertainty can be stored now without building a large provenance product.
3. **Empty templates.** General site influent and geometry values differ substantially. Empty templates preserve the intended system topology without fabricating site conditions.
4. **Research queue is scoped by query and cap.** Search breadth is controlled before corpus volume. Provider results still need source-text review and parameter comparability checks.
5. **Dry-run semantics are offline.** Plan commands must be safe to invoke without credentials, provider availability, or a database. Explicit ingestion commands own those side effects.

## Known limitations and next evidence needs

- Establish independent calibration/validation data for MFC and MEC time series, including external resistance/load curves, current/voltage, COD, pH, dissolved oxygen, and hydrogen generation/capture.
- Add site/source profiles for high-strength and municipal wastewater only when measured metadata and comparable methodology are available.
- Build comparability keys for reactor architecture, electrode/membrane area basis, loading basis, temperature, pH, influent matrix, and run duration before aggregating papers into parameter priors.
- Validate sensor calibration and analytical performance against reference methods in each wastewater matrix; add interference, recovery, drift, replicates, and detection-limit evidence.
- Add explicit uncertainty propagation and parameter identifiability before presenting confidence intervals or design optimization.
