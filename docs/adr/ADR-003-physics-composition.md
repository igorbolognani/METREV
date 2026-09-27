# ADR-003 — Physics composition

Status: accepted as an interface rule; equation graph pending. Date: 2026-09-27.

Stack selection must resolve the selected fidelity, system, topology, separator and circuit into compatible modules, required inputs and blockers before a run. The shared `resolvePhysicsComposition()` currently performs eligibility checks for 0D, restricted 1D and research profiles. It does not instantiate PDE equations. The run dispatcher rejects missing or unsupported combinations and must never silently downgrade dimension.

Alternatives considered: separate hardcoded solver choices in UI and API, which would drift, and a universal always-on multiphysics equation set, which would activate unsupported assumptions. Before 2D execution, add explicit module dependencies, state variables, equations, interface maps and solver coupling diagnostics; test representative MFC and MEC configurations through the same dispatch path.
