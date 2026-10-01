# ADR-008 — Restricted structured cell finite volumes

Status: implemented development path; broader numerical and deployment gates pending. Date: 2026-10-01.

Use a separately versioned steady structured finite-volume model in 2D/3D to assemble conservative species face flux, homogeneous and electrode reactions, liquid/solid charge and MFC/MEC circuit closure. Supporting electrolyte conductivity is explicit; continuous interfaces have no charged membrane partition. The general FEM research profiles remain unchanged.

A sparse analytic Newton solver uses SciPy LU and backtracking. This implements the finite-volume alternative recorded in ADR-002 without claiming PETSc SNES or full electroneutral DAE implementation. A dedicated identity prevents substituting it for an unsupported requested model. Uniform extruded verification is useful for checking physical-depth scaling, but does not establish general 3D convergence or predictive accuracy.

Reuse the queue, owner-scoped PostgreSQL metadata and artifact boundary. Two bounded subprocess operations prepare and solve; each independently verifies input/geometry hashes. Mesh and field bytes are immutable hash-addressed JSON artifacts; verified nonconvergent output survives as a failed run. API/worker registration is explicit and shares a private development store. Durable deployment, browser and database end-to-end gates remain required before product release.
