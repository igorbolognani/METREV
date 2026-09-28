# Restricted diffusion verification kernel

`apps/spatial-sidecar/metrev_spatial/diffusion.py` is a bounded numerical building block for EQ-SP-001, not an MFC/MEC model or an admitted spatial run. It solves `∇·(−D∇c) = R` for one dissolved species with fixed positive isotropic `D`, uniform volumetric source `R` and a declared Dirichlet concentration at every exterior face. It has no velocity, migration, charge, reaction kinetics, porosity, membrane, circuit, or coupled electrode field.

| Item          | Declared meaning                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Grid          | Orthogonal cell-centred 1D/2D/3D, 2–64 cells per axis and at most 4096 cells                                                 |
| Concentration | `c` in mol/m³; negative computed states fail, never clip                                                                     |
| Diffusivity   | `D` in m²/s; caller provides a strictly positive value                                                                       |
| Source        | `R` in mol/(m³ s); positive creates species                                                                                  |
| Flux          | `−D∇c` in mol/(m² s); outward positive removes species                                                                       |
| Balance       | Integrated boundary flux minus integrated source; in 1D/2D the omitted cross-sectional measures are 1 m²/1 m respectively    |
| Solver        | Matrix-free Jacobi-preconditioned conjugate gradient with bounded iterations and an independently recalculated true residual |

Internal faces use equal and opposite conductances, and exterior faces use the half-cell distance. The manufactured `c=x(1−x)` test with `R=2D` checks coarse/medium/fine solution error in both 2D and 3D; affine fields are checked in all three dimensions. These are numerical verification fixtures whose values do not qualify as scientific case measurements. No spatial model status is promoted to executable by this kernel. A production solver requires sourced heterogeneous coefficients, boundary and interface contracts, tagged Gmsh/DOLFINx mesh integration, charge/reaction/circuit coupling, artifacts, persistence and the remaining Phase 2/3 gates.

The same restricted operator supports an implicit Euler fixture for `∂c/∂t + ∇·(−D∇c) = R`. A step assembles `c_new/Δt − ∇·(D∇c_new) = R + c_old/Δt` and evaluates the integrated storage change plus outward flux minus source. Time refinement uses `Δt = 0.2, 0.1, 0.05 s` against a `0.01 s` numerical reference at fixed 2D/3D grids and `t = 0.4 s`; it tests this linear fixture only. It does not establish transient reaction, biofilm growth, hydraulic, membrane, charge or circuit accuracy.
