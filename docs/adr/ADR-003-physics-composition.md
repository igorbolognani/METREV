# ADR-003 — Physics composition

Status: accepted interface rule; restricted fixed-profile graph implemented, general equation compiler pending. Original decision: 2026-09-27. Updated: 2026-10-02.

Stack selection must resolve the selected fidelity, system, topology, separator and circuit into compatible modules, required inputs and blockers before a run. The shared `resolvePhysicsComposition()` currently performs eligibility checks for 0D, restricted 1D and research profiles. It does not instantiate PDE equations. The run dispatcher rejects missing or unsupported combinations and must never silently downgrade dimension.

The saved-evaluation spatial branch now uses `resolveCaseSpatialComposition()` for the separate steady supporting-electrolyte profile. Explicit planar stack declarations, system, dimension, separator presence and complete layer-to-stack mapping resolve before queue admission. Missing source-backed input returns `insufficient_data`; absent physics or geometry adapters return `not_implemented`. The service binds the immutable evaluation snapshot and its canonical digest to the run; it does not translate 0D parameters into spatial values.

`compileStructuredCellEquationGraph()` describes the existing fixed numerical assembly: sourced parameter paths, equation IDs, states/units, domains, interface laws, couplings and state count. The worker records this graph and result validation reconstructs it from the admitted input. This is not a general symbolic PDE compiler, dynamic module plugin runtime or implementation of the general catalog profiles.

Alternatives considered: separate hardcoded solver choices in UI and API, which would drift, and a universal always-on multiphysics equation set, which would activate unsupported assumptions. General topology adapters, module equation instantiation and broader scientific verification remain required.
