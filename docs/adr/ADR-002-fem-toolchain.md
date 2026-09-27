# ADR-002 — FEM and mesh toolchain

Status: evaluation pending. Date: 2026-09-27.

Candidate stack: Gmsh physical groups for subdomains/facets, DOLFINx for finite element forms and mesh/tag import, and PETSc KSP/SNES for linear/nonlinear solves. The [DOLFINx Gmsh demo](https://docs.fenicsproject.org/dolfinx/main/python/demos/demo_gmsh.html) demonstrates physical groups and tagged mesh import; [Gmsh documentation](https://gmsh.info/doc/texinfo/) explains that physical groups control exported elements; [PETSc KSP](https://petsc.org/release/manual/ksp/) exposes linear solvers and [SNES](https://petsc.org/main/manualpages/SNES/) nonlinear solves. These are interface evidence, not proof of version compatibility or suitability for METREV.

Alternative: a finite volume core for conservative flow/species balances with explicit coupling; it may simplify cellwise flux bookkeeping but would require a separate verified charge/reaction/interface implementation. No library or version is chosen yet. The evaluation must pin a mutually compatible set, produce a reproducible container and run 1D/2D manufactured diffusion, conservation, interface flux and mesh-refinement cases. The current environment has no Docker or mesh runtime; do not mark P05 complete.
