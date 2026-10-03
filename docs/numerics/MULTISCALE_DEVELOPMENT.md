# Separate-scale development calculations

These read-only analyst API operations are explicit development reductions. They do not activate the broad micro-3D or stack research catalogs, mutate a saved case, or admit predictive evidence.

## EQ-NET-001 — Linear DC stack network

`POST /api/modeling/stack-network` solves Kirchhoff nodal balance for at most 128 nodes and 512 branches. A declared reference node fixes the potential gauge. Each source-backed branch follows `I_ab = (V_a - V_b + E_ab) / R_ab`, with positive current from `a` to `b`, resistance in ohms, EMF/potential in volts and current in amperes. Passive contact, load and shunt branches have no EMF; reduced cells and external supplies require an explicit signed EMF. Reduced cells retain their originating cell/study run reference. No cell polarization parameters are inferred.

The mathematical support is exact DC Kirchhoff conservation for linear resistive branches. Row-scaled Gaussian elimination with partial pivoting solves KCL. Floating, self-loop, zero/negative resistance and ill-conditioned networks fail explicitly. Result records include each branch current, `I²R` dissipation, signed ideal-source work, terminal delivery and per-node KCL residual. Ideal-source work balances total resistance dissipation. Positive supply work is external electrical input. MEC reports no generated MFC power; source absorption/reversed current is retained. The separately supplied auxiliary demand is reported and is not silently included in nodal branches.

Tests reproduce analytical single, series and parallel cells, shunt paths, reversed cell absorption under external bias, power/KCL conservation, invalid inputs and authenticated API execution. Nonlinear polarization, hydraulic manifolds, biology, gas and transient stack dynamics remain unsupported.

## EQ-SCALE-001 — Declared ideal-layer property transfer

`POST /api/modeling/scale-transfer` computes one explicitly directional coefficient from supplied source-backed ideal layers. Parallel-layer diffusivity, conductivity and permeability use `k_eff = sum(f_i k_i)`; series-layer coefficients use `k_eff = 1 / sum(f_i / k_i)`. These are exact analytical reductions for ideal layered, linear transport along the declared axis. Volume fractions must be positive and sum to one; METREV never renormalizes them. Accessible reactive area has its own volume-weighted rule and supplied area samples; porosity cannot substitute for area.

The contract preserves source scale, target cell domain, originating run/geometry digest, species for diffusivity, direction, method reference, raw source samples and an explicit sourced temperature validity interval. Canonical units are m²/s, S/m, m² and m²/m³. Outside the declared interval, no effective value is produced. Values are modeled reductions with provenance, not measurements. No pore-resolved geometry, wetting, reaction homogenization, nano solver or automatic cell-parameter adoption is implemented. A future transfer contract must explicitly admit the resulting modeled parameter before it enters a cell solve.

Tests verify arithmetic/harmonic analytical values, area independence, unit/range checks, validity boundaries, no fraction normalization and the analyst API boundary. Numerical correctness of these reductions does not verify the applicability of a user's layer law or source conditions.
