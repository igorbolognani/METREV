# ADR-006 — Multiscale separation

Status: accepted. Date: 2026-09-27.

Cell-scale macro fields, biofilm/electrode micro models and catalyst nano characterizations remain distinct capabilities. An effective property transferred between scales must declare its source geometry, species/conditions, averaging or homogenization law, unit, uncertainty where available, and validity range. Naming a nanoscale material in a 3D cell case does not make the cell mesh atomically resolved.

The alternative of resolving pores and catalyst structure throughout a full cell would couple incompatible length scales and demand unjustified geometry and measurements. Gate: verify a standalone micro calculation and its transfer law before using it as a cell-scale parameter; do not infer predictive accuracy from resolution alone.
