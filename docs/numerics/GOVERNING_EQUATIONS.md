# Governing equation authority

These stable IDs describe candidate spatial formulations. They do not mean the 2D/3D equations exist in code. The restricted steady 1D implementations are identified where present; every extension needs a discrete form, exact boundary map and verification before a status change. Concentration `c_i` is mol/m³, time `t` is s, spatial coordinate `x` is m, current density `i` is A/m², potential `φ` is V, and Faraday's constant `F` is C/mol. Flux normals point outward from the named domain; a positive interfacial transfer leaves that domain and enters its neighbor. Every field parameter comes from `spatial-parameter-authority.json` or a future versioned extension.

## EQ-SP-001 — Species conservation

- Formula: `∂(ε c_i)/∂t + ∇·N_i = R_i`; `N_i = u c_i − D_eff,i ∇c_i − z_i D_eff,i F c_i ∇φ_l/(R T)` only where dilute-solution electromigration applies. The phase-specific velocity and effective diffusivity must be declared; omit terms only through a documented module choice.
- Variables/units: `ε` 1, `c_i` mol/m³, `N_i` mol/(m² s), `u` m/s, `D_eff,i` m²/s, `z_i` 1, `φ_l` V, `T` K, `R_i` mol/(m³ s). Both balance sides have mol/(m³ s).
- Sign/domain/dimensions: positive `R_i` produces species; positive outward `N_i·n` removes it. Liquid, porous electrode, biofilm or membrane in 1D/2D/3D with declared transport law.
- Assumptions and boundaries: dilute, isothermal version above; inlet/outlet, wall, electrode and interface flux/concentration conditions must be explicit. Fixed charge or concentrated electrolyte needs another formulation.
- Scientific support: formulation leads include 10.1007/s10800-016-1017-2 and 10.1016/j.watres.2007.04.009; these do not validate this implementation.
- Implementation/tests: restricted 1D diffusion/reaction in `porous-anode-1d.ts` and diffusion/migration in `membrane-ion-1d.ts`. The isolated `metrev_spatial/diffusion.py` kernel solves steady diffusion and implicit-Euler storage for a scalar Dirichlet subset on orthogonal 1D/2D/3D verification grids, with constant or cellwise positive diffusivity; it is not an admitted MFC/MEC cell solver. `tests/contracts/test_spatial_diffusion.py` checks affine and layered-interface solutions, 2D/3D spatial and temporal refinement, conservation, positivity failure and nonconvergence. Convection, migration, reaction, physical cell interfaces, Gmsh meshes and case integration remain absent.
- Limitations: porosity and tortuosity do not determine accessible area or a universal diffusivity; electroneutrality and gas phases need separate constraints.

## EQ-FL-001 — Incompressible continuity

- Formula: `∇·u = 0` for constant-density single-phase flow.
- Variables/units: superficial or free-flow `u` m/s, declared by domain; divergence 1/s.
- Sign/domain/dimensions: outward flux positive; liquid in 2D/3D (1D only in a compatible reduced flow model).
- Assumptions and boundaries: incompressible, single phase; prescribed inlet flow or pressure, outlet condition, walls and porous interfaces require a consistent velocity definition.
- Scientific support: standard continuum balance; a specific closure and reference must be reviewed before implementation.
- Implementation/tests: absent. Verify divergence integral, inlet/outlet balance and manufactured flow before coupling transport.
- Limitations: cannot represent gas evolution, variable density or turbulent flow without an explicit extension.

## EQ-CH-001 — Electrolyte charge conservation

- Formula: `∇·i_l = a_v j_F` in an electrolyte pore volume where interfacial Faradaic current transfers to the solid; `i_l = F Σ_i z_i N_i` when ionic species fluxes resolve conduction. Coupled solid equation uses `∇·i_s = −a_v j_F`.
- Variables/units: `i_l,i_s,j_F` A/m²; `a_v` m²/m³; divergence and transfer A/m³. `N_i` mol/(m² s).
- Sign/domain/dimensions: positive `j_F` supplies ionic current and removes electronic current under this convention. Porous electrode/electrolyte in 1D/2D/3D.
- Assumptions and boundaries: electroneutral bulk or an explicitly substituted Poisson formulation; electronic contact, ionic membrane, interface current and circuit closure are required.
- Scientific support: porous-electrode/electrolyte formulations are candidates from 10.1051/e3sconf/202233408005 and 10.1007/s10800-016-1017-2; condition transfer is unvalidated.
- Implementation/tests: restricted 1D sums ionic and Faradaic currents under imposed anode material potential; full coupled potential fields absent. Check species-current sum, interface continuity and terminal current balance.
- Limitations: no resolved double layer, membrane fixed-charge Poisson coupling or spatial solid potential in current runtime.

## EQ-RX-001 — Electrode charge transfer

- Formula: `j_F = j_0[exp(α_a Fη/(R T)) − exp(−α_c Fη/(R T))]` for a declared reaction, reference potential and concentration-dependent `j_0` if applicable.
- Variables/units: `j_F,j_0` A/m², `η` V, `α_a,α_c` 1, `T` K; each exponent dimensionless.
- Sign/domain/dimensions: anodic oxidation positive under the chosen local reaction convention; electrode/electrolyte interface in 1D/2D/3D.
- Assumptions and boundaries: isothermal kinetic law, explicit active area and potential references; cathode oxygen or hydrogen boundary and limiting current are separate constraints.
- Scientific support: 10.1016/j.biortech.2010.06.156 is a formulation lead, not a universal kinetic calibration.
- Implementation/tests: existing 0D and restricted 1D electrode kinetics; generalized spatial interface law absent. Test zero-overpotential sign, monotonic branch, area and circuit closure.
- Limitations: current 1D anode has imposed solid potential; there is no universal kinetic parameter for all wastewater, biomass and electrode conditions.

## EQ-MEM-001 — Membrane transport and interface

- Formula: `N_i = −D_eff,i ∇c_i − z_i D_eff,i F c_i ∇φ_l/(R T)` in a stationary dilute membrane; `N_i·n_left + N_i·n_right = 0` for a continuous interface without accumulation.
- Variables/units: `N_i` mol/(m² s), `D_eff,i` m²/s, `c_i` mol/m³, `φ_l` V, `T` K, `z_i` 1.
- Sign/domain/dimensions: outward normals are opposite across a shared interface; membrane in 1D/2D/3D.
- Assumptions and boundaries: species-specific partition/Donnan relation and fixed charge require explicit constitutive inputs; the restricted 1D solver only supports a binary electroneutral reduction with equal boundary concentrations and equal ion diffusivities.
- Scientific support: 10.1007/s10800-016-1017-2 is a membrane formulation lead.
- Implementation/tests: restricted 1D membrane flux tests; general multicomponent membrane/interface law absent. Verify constant-flux limit and both sides of every interface.
- Limitations: no claim of Nafion-specific calibration, concentration-dependent fixed charge or full-cell validation.
