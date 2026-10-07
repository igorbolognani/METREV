# Governing equation authority

These stable IDs describe candidate spatial formulations. They do not mean the 2D/3D equations exist in code. The restricted steady 1D implementations are identified where present; every extension needs a discrete form, exact boundary map and verification before a status change. Concentration `c_i` is mol/m³, time `t` is s, spatial coordinate `x` is m, current density `i` is A/m², potential `φ` is V, and Faraday's constant `F` is C/mol. Flux normals point outward from the named domain; a positive interfacial transfer leaves that domain and enters its neighbor. Every field parameter comes from `spatial-parameter-authority.json` or a future versioned extension.

## EQ-SP-001 — Species conservation

- Formula: `∂(ε c_i)/∂t + ∇·N_i = R_i`; `N_i = u c_i − D_eff,i ∇c_i − z_i D_eff,i F c_i ∇φ_l/(R T)` only where dilute-solution electromigration applies. The phase-specific velocity and effective diffusivity must be declared; omit terms only through a documented module choice.
- Variables/units: `ε` 1, `c_i` mol/m³, `N_i` mol/(m² s), `u` m/s, `D_eff,i` m²/s, `z_i` 1, `φ_l` V, `T` K, `R_i` mol/(m³ s). Both balance sides have mol/(m³ s).
- Sign/domain/dimensions: positive `R_i` produces species; positive outward `N_i·n` removes it. Liquid, porous electrode, biofilm or membrane in 1D/2D/3D with declared transport law.
- Assumptions and boundaries: dilute, isothermal version above; inlet/outlet, wall, electrode and interface flux/concentration conditions must be explicit. Fixed charge or concentrated electrolyte needs another formulation.
- Scientific support: formulation leads include 10.1007/s10800-016-1017-2 and 10.1016/j.watres.2007.04.009; these do not validate this implementation.
- Implementation/tests: restricted 1D electrochemical diffusion/reaction in `porous-anode-1d.ts` and diffusion/migration in `membrane-ion-1d.ts`. The isolated `metrev_spatial/diffusion.py` kernel solves scalar transport with prescribed constant or cell-centred incompressible velocity, first-order upwind flux, cellwise isotropic or constant axis-aligned diagonal diffusivity, cellwise source, implicit-Euler storage, nonnegative linear disappearance `k c`, and mixed Dirichlet/prescribed outward diffusive-flux faces on orthogonal 1D/2D/3D verification grids. Internal face velocity is the average of two cell values and the opposite outward normals use one shared flux; exterior faces use the adjacent cell value. `tests/contracts/test_spatial_diffusion.py` checks a manufactured shear field `u=(0.2 y,0[,0]) m/s`, `c=1+x mol/m³`, source `0.2 y mol/(m³ s)` on three 2D/3D resolutions, integrated mass balance, transient constant-state invariance and invalid velocity fields. The discrete divergence check rejects inconsistent prescribed incompressible flow. A separate pinned DOLFINx development operation feeds the homogeneous Darcy P1 velocity into neutral steady scalar advection-diffusion on that exact porous mesh; a planar fixture compares the concentration with the analytic 1D profile at `Pe=1`, checks integrated inlet/outlet/wall species flux and emits hash-bound pressure, velocity and concentration datasets. It supports only the explicitly declared constant-source/first-order-loss extension below; it has no reaction network, electromigration, heterogeneous transport, porous/bulk interface or case integration, and is not an admitted MFC/MEC cell solver.
- Limitations: porosity and tortuosity do not determine accessible area or a universal diffusivity; electroneutrality and gas phases need separate constraints.

## EQ-BIO-001 — Lumped 0D Monod uptake on COD basis

- Formula: `r_COD = q_max X [S/(K_S+S)] exp[−0.5((pH−pH_opt)/σ_pH)^2] exp(clip(−E_a/R (1/T−1/T_ref), −20, 20))`.
- Variables/units: `r_COD` kgCOD/(m³ s), `q_max` kgCOD/(kgVSS s), active biomass `X` kgVSS/m³, COD `S` kgCOD/m³, `K_S` kgCOD/m³, `pH` and `pH_opt` dimensionless, `σ_pH` pH units, `E_a` J/mol, `R` J/(mol K), `T,T_ref` K. Both exponent arguments are dimensionless.
- Sign/domain/dimensions: `r_COD ≥ 0` is COD-equivalent substrate consumption per anode liquid volume in a well-mixed 0D anode; it is not a molecular species production rate.
- Assumptions and boundaries: one lumped COD pool, one biomass state, Monod substrate saturation, Gaussian pH inhibition and a fixed-temperature Arrhenius factor. The compartment balance separately applies continuous-flow dilution or the configured batch boundary.
- Scientific support: 10.1016/j.biortech.2010.06.156 motivates Monod-coupled bioanode kinetics; 10.1016/j.jpowsour.2009.06.101 supports coupled compartment balances. These are formulation references, not calibration or validation of METREV.
- Implementation/tests: `packages/electrochem-models/src/mechanistic.ts` (`biologicalUptake`) emits a final-time rate observation and time-series profile; mass closure, RK4 time-step refinement, zero-reaction continuous-flow washout and stiff-step positivity subdivision are checked in `tests/runtime/mechanistic-electrochem-model.test.ts`.
- Limitations: no substrate identity, molecular products, proton stoichiometry, competing guilds, or resolved growth/decay reaction network is represented by this rate law.

## EQ-BIO-002 — Restricted steady 1D porous-anode Nernst–Monod uptake

- Formula: `r_i = a_v,i θ_i k_max [C_i/(K_C+C_i)] [1/(1+exp(−F(E_i−E_1/2)/(R T)))]`, with `D_eff,i = ε_i D_free/τ_i` and steady species balance `0 = d/dx(D_eff dC/dx) − r`.
- Variables/units: `r_i` mol/(m³ s), internal area density `a_v,i` m²/m³, accessible fraction `θ_i` 1, `k_max` mol/(m² s), `C_i,K_C` mol/m³, `E_i,E_1/2` V, `F` C/mol, `R` J/(mol K), `T` K, porosity `ε_i` 1, free diffusivity `D_free` m²/s, tortuosity `τ_i` 1.
- Sign/domain/dimensions: positive `r_i` consumes substrate in each through-thickness porous-anode control volume; 1D planar steady reduction with projected area and local material potential.
- Assumptions and boundaries: source-backed cellwise properties; no-flux substrate boundary at backing `x=0`, fixed bulk concentration at liquid-facing `x=L`; no advection, biomass growth, local potential solution or time-dependent inventory.
- Scientific support: 10.1051/e3sconf/202233408005, cited at its porous-anode model equations, is the formulation source; 10.1038/s41598-020-65375-5 motivates accessible active-area limitation. Source review is pending and neither source validates METREV outputs.
- Implementation/tests: `packages/electrochem-models/src/porous-anode-1d.ts`; tests check the zero-reaction diffusion limit, an analytical planar first-order limit under refinement, integrated substrate balance and electron-current closure in `tests/runtime/porous-anode-1d.test.ts` and `tests/runtime/coupled-cell-1d.test.ts`.
- Limitations: `C_i` is a single declared substrate basis. Products, proton/electron molecular stoichiometry, biofilm growth, charge fields and full-cell experimental validation are absent.

## EQ-FL-001 — Incompressible continuity

- Formula: `∇·u = 0` for constant-density single-phase flow.
- Variables/units: superficial or free-flow `u` m/s, declared by domain; divergence 1/s.
- Sign/domain/dimensions: outward flux positive; liquid in 2D/3D (1D only in a compatible reduced flow model).
- Assumptions and boundaries: incompressible, single phase; prescribed inlet flow or pressure, outlet condition, walls and porous interfaces require a consistent velocity definition.
- Scientific support: standard continuum balance; a specific closure and reference must be reviewed before implementation.
- Implementation/tests: the isolated scalar transport fixture checks prescribed finite-volume velocity divergence. `metrev_spatial/stokes.py` solves the restricted 2D steady single-phase bulk-liquid problem EQ-FL-002 on meshes whose owned cells all belong to the explicitly supplied liquid region tag, reports integrated flow and divergence, and rejects multi-region cells, interior wall facets, missing global boundary groups or nonconvergence. The pinned synthetic Poiseuille benchmark checks analytic velocity, pressure, pressure drop and inlet/outlet balance at three refinements and varies viscosity/pressure drop. Development Stokes can now transfer its P2 velocity into a same-mesh neutral scalar solve; a bulk/porous interface and product case admission remain pending before promotion.
- Limitations: cannot represent gas evolution, variable density or turbulent flow without an explicit extension.

## EQ-FL-002 — Restricted planar Stokes flow

- Formula: `−∇·(2μ sym(∇u)) + ∇p = 0`, `∇·u = 0` for constant dynamic viscosity `μ` in one 2D bulk-liquid domain.
- Variables/units: velocity `u` m/s, pressure `p` Pa, `μ` Pa·s, stress `σ = 2μ sym(∇u) − pI` Pa; the assembled momentum residual is Pa/m. Positive boundary flow leaves the liquid; inlet flow is reported as its negative, per unit out-of-plane depth.
- Boundaries/assumptions: no-slip tagged walls, explicit full Cauchy traction `σn` at tagged inlet/outlet, steady laminar incompressible single-phase liquid, no porous interface. Pressure alone is not silently substituted for full traction. The manufactured Poiseuille fixture supplies its known tangential viscous traction as well as pressure traction.
- Implementation/tests: Taylor–Hood P2/P1 FEM with a direct PETSc linear solve, explicit convergence reason, field functions, pressure means, divergence L2 and integrated inlet/outlet flow. The pinned container also exercises the typed sidecar request, selected mesh digest check and XDMF/HDF5 datasets. For output, the P2 velocity is interpolated to first-order Lagrange functions to match the linear mesh; diagnostics remain calculated from the solved Taylor–Hood fields. Tagged-mesh analytical refinement is numerical verification only. The input values in the benchmark are test fixtures; this module is not a product solver or an experimentally validated hydraulic model.
- Unsupported: nonlinear Navier–Stokes, Darcy/Brinkman, variable viscosity, turbulence, species coupling and runtime case admission.

## EQ-FL-003 — Restricted homogeneous porous Darcy flow

- Formula: `u_D = −(k/μ)∇p`, `∇·u_D = 0` for a steady incompressible pore fluid with constant isotropic intrinsic permeability `k` and dynamic viscosity `μ` in one porous 2D region.
- Variables/units: Darcy superficial velocity `u_D` m/s, pressure `p` Pa, permeability `k` m², viscosity `μ` Pa·s; `(k/μ)∇p` has units m/s. Integrated flow is reported per unit out-of-plane depth in m²/s.
- Boundaries/assumptions: source-backed pressure values at two opposing inlet/outlet facets; the other two exterior facets are impermeable natural boundaries. No porous-interface jump law, bulk-liquid domain, deformation, compressibility or multiphase flow is implied.
- Implementation/tests: P1 pressure FEM assembles `∫(k/μ)∇p·∇q dΩ = 0`; velocity is calculated from Darcy's law and interpolated to P1 output fields. The pinned planar fixture checks the exact linear pressure and uniform Darcy velocity, analytic flow `Q = (k/μ)(Δp/L)H`, integrated inlet/outlet balance, divergence, PETSc convergence and hash-bound XDMF/HDF5 datasets. A separate `planar_darcy_transport` operation passes the computed P1 Darcy velocity directly to neutral passive scalar advection-diffusion on the same mesh and domain. Its pinned `Pe=1` slab fixture compares concentration with the analytic 1D profile and checks integrated inlet/outlet/wall species-flux balance and artifact hashes. These are numerical verifications of homogeneous development operations, not a cell-scale hydraulic model or product solver.
- Unsupported: heterogeneous/tensor permeability, Brinkman or Navier–Stokes coupling, variable viscosity, turbulence, reactive or ionic species coupling, bulk/porous interfaces and runtime case admission.

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

## EQ-RX-002 — Reduced substrate-to-electron accounting

- Formula: for 0D, the COD-derived electron-supply ceiling is `I_COD,max = CE f_biofilm (4F/0.032 kgCOD mol⁻¹) V_a r_COD`; the algebraically solved cell current is constrained by this supply and any cathodic limit. For restricted 1D, `I_F = n_e F A_proj Σ_i(r_i Δx_i)` and `R_sub = A_proj Σ_i(r_i Δx_i)`.
- Variables/units: `I_COD,max,I_F` A, `CE,f_biofilm` 1, COD equivalent `0.032 kgCOD/mol`, `V_a` m³, `r_COD` kgCOD/(m³ s), `n_e` electrons per declared substrate molecule, `F` C/mol, `A_proj` m², `r_i` mol/(m³ s), `Δx_i` m, and `R_sub` mol/s. In 0D, `4F/0.032` has units C/kgCOD.
- Sign/domain/dimensions: positive uptake yields a nonnegative electron-supply/current magnitude. The 0D relation is a cap inside the lumped MFC/MEC circuit solve; the 1D relation integrates one local substrate reaction over the porous electrode and closes the shared current.
- Assumptions and boundaries: 0D COD electron equivalents use four electron equivalents per mole of oxygen-equivalent COD and explicit coulombic efficiency and electroactive biomass fraction. 1D uses an explicit source-backed `n_e`; its imposed-potential Nernst–Monod law and cell circuit share one current.
- Scientific support: the 0D formulation is motivated by 10.1016/j.jpowsour.2009.06.101 and 10.1016/j.biortech.2010.06.156; 1D electron mapping is an explicit input and a reduced accounting assumption. Neither constitutes molecular reaction balancing or independent validation.
- Implementation/tests: `mechanistic.ts` applies COD/electroactive-fraction current supply before the circuit root; `porous-anode-1d.ts` integrates local molar uptake and Faradaic current. MFC/MEC limits, substrate and electron residuals, and shared 1D circuit current are exercised in the runtime tests named above.
- Limitations: this is electron-equivalent bookkeeping, not a balanced molecular reaction network. Products, proton stoichiometry, side reactions, biomass synthesis electron demand and gas crossover are not inferred.

## EQ-MEM-001 — Membrane transport and interface

- Formula: `N_i = −D_eff,i ∇c_i − z_i D_eff,i F c_i ∇φ_l/(R T)` in a stationary dilute membrane; a continuous interface without accumulation has equal and opposite outward fluxes. The restricted interface law uses `ψ_D = F(φ_m − φ_s)/(R T)`, `c_i,m = K_i c_i,s exp(−z_i ψ_D)`, and `X_m + Σ_i z_i c_i,m = 0`. Its face flux uses the Scharfetter–Gummel exponent `ξ_i = z_i[F(φ_l,R − φ_l,L)/(R T) + ω ψ_D]`, with `ω=+1` when the membrane is to the right and `−1` when it is to the left; the membrane-side concentration is divided by `K_i` in the partitioned face law.
- Variables/units: `N_i` mol/(m² s), `D_eff,i` m²/s, `c_i` and signed fixed-charge density `X_m` mol/m³, `φ_l,φ_m,φ_s` V, `T` K, `z_i` and dimensionless `ψ_D,K_i` 1. `K_i` is source-backed per species and `X_m` is source-backed per declared interface.
- Sign/domain/dimensions: outward normals are opposite across a shared interface; positive face flux follows increasing x. `ψ_D` is membrane-minus-solution and the local closure applies only at an ion-exchange-membrane face in 2D/3D.
- Assumptions and boundaries: ideal activities, instantaneous local interfacial equilibrium, prescribed fixed charge and no membrane-normal convection. The restricted 1D solver still supports only a binary electroneutral reduction with equal boundary concentrations and equal ion diffusivities. The spatial Donnan law is local to each face and does not impose membrane-volume electroneutrality.
- Scientific support: 10.1007/s10800-016-1017-2 is a membrane formulation lead.
- Implementation/tests: `structured_cell.py` couples ideal Donnan roots to the membrane-side Scharfetter–Gummel species flux and its analytic concentration Jacobian; the continuous supporting-electrolyte Ohmic field remains based on its own fixed conductivity and continuous bulk potential, so the equilibrium Donnan jump is not treated as an ohmic resistance. `tests/contracts/test_spatial_structured_cell.py` checks the analytic 1:1 root, both interface orientations, zero-flux Donnan equilibrium, shared-face conservation, local charge closure, current neutrality at equilibrium and Jacobian directional derivatives. Worker/API tests bind per-interface closure evidence to the immutable input hash. These are mathematical software checks, not experimental validation.
- Limitations: no membrane-volume electroneutral Nernst–Planck current closure, nonideal activity coefficients, membrane water transport, concentration-dependent fixed charge, Nafion-specific calibration or full-cell validation.

Restricted Stokes species transfer (2026-09-30): `scalar_transport.py` is the common same-mesh P1 steady kernel for declared Darcy superficial or Stokes bulk velocity. It assembles `D_eff grad(c)·grad(v) + div(u c) v` with Dirichlet concentration on opposing ports and zero normal wall flux. Keeping `div(u c)` retains the discrete velocity divergence rather than assuming it vanishes pointwise. The actual P2 Stokes velocity feeds transport; its exported P1 visualization is not substituted. Constant positive effective diffusivity and a neutral species are source-backed. The optional scalar source/loss extension is documented below; there are no electrochemical or biological reaction networks, electromigration, transient storage, multi-domain interfaces or nonlinear cell/circuit coupling. The adapter rejects reverse flow, materially negative concentration and species imbalance above the declared 1% development tolerance; no concentration is clipped, including roundoff extrema. Native CI checks a constant tracer carried by analytical Poiseuille flow at three meshes and the zero-flow affine diffusion limit with non-equal concentrations, field summaries, port flux and HDF5 hashes. These are numerical tests, not experimental comparisons.

## Restricted native scalar production and loss

The common same-domain steady scalar kernel optionally solves `div(u c - D grad(c)) = s - k c`. The input must declare `linear_source_loss.law = constant_source_first_order_loss`, constant nonnegative sourced `source_rate_mol_m3_s` in `mol/(m3*s)` and `loss_rate_per_s` in `1/s`. Neither coefficient is supplied by the solver. An absent law retains the source-free formulation; explicitly sourced zeros recover that limiting case. This is one neutral scalar, not a stoichiometric, biological or electrochemical reaction network.

The weak form adds `k c v` to the left-hand side and `s v` to the right-hand side. Measured production is `integral(s dx)` and consumption is `integral(k c dx)`. Outward boundary flux plus consumption minus production defines the absolute residual. Its relative scale is the sum of absolute inlet/outlet/wall rates and nonnegative production/consumption, with a numerical denominator floor of `1e-30`; no physical concentration or coefficient is defaulted or clipped. Cartesian 2D integrals are per unit depth in `mol/(m*s)`. Output budgets are checked against declared coefficients, domain area and concentration integral before persistence.

Pinned native verification uses analytic pure-loss, pure-production and exact source/loss-equilibrium solutions on three meshes, then Stokes and Darcy reactive worker/API cases. Synthetic fixture coefficients carry test provenance and establish numerical behavior only. P06 remains partial because coupled charge, species networks, interfaces and nonlinear cell/circuit closure are absent.
